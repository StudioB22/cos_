# ADR 0002 - Run every check locally: no GitHub workflow

Status: **accepted** by the owner on 2026-11-10 (#2).

## Context

GitHub Actions bills the owner's accounts since October 2026 (Free plan, monthly quota exceeded;
StudioB22 is a Free organisation and this repository was private, so every minute was billed).
Owner rule of 2026-11-07, every repository: every check runs locally; the only workflow allowed is a
production deploy triggered by a signed release tag (benoit-bremaud/agents-skills ADR-0004, tracked
by agents-skills#259). COS_ deploys nothing from GitHub: Vercel builds the web client and Render the
API from their own git integration, so no workflow stays at all.

Before this decision the repository ran two workflows: `ci.yml` (lint, typecheck, the unit,
integration and realtime suites, build, on every push to `main` and every pull
request) and `sonarqube.yml` (SonarQube scan on `main` pushes, with a `SONAR_TOKEN` secret). Neither
could pass: `main` pinned `pnpm@10.9.4`, a version that does not exist on the registry, and the API
typecheck failed on strict indexing and the shared package resolution.

Constraints: free open-source tools only, deterministic (no AI agent in the loop), reproducible on
another machine, SonarQube never skipped (agents-skills#159), the pre-merge gate of
`~/.agent-rules/common.md` unchanged in substance.

## Decision drivers

- No billed minute; L1 needs the network only for the Semgrep rules and the osv.dev queries, L2
  also for the Trivy database and the base image.
- One command per tier, the same tools and configs the workflows used (pnpm scripts), plus the
  Playwright smoke E2E the workflows never ran.
- A merge condition that cannot be forged: the signed gate attestation on the head SHA.

## Options considered

- **A — local CI (just + lefthook + mise), zero workflow**: chosen, see below.
- **B — keep the workflows and pay**: refused by the owner rule of 2026-11-07.
- **C — self-hosted runner**: a machine to keep online and patched for a solo portfolio project;
  the same checks run from the laptop at no cost (YAGNI).

## Decision

- Four tiers of skill `local-ci`, one `just` recipe each (`justfile`), tools pinned in `mise.toml`
  and `mise.lock`, hooks in `lefthook.yml`, installed by `just setup`:
  - L0 `just fast` on pre-commit: staged secrets (gitleaks), eslint and prettier on the staged
    files, typos, hadolint; commit-msg: Conventional Commits subject.
  - L1 `just check` on pre-push (< 3 min): typos, `lefthook validate`, hadolint on the API
    Dockerfile, `pnpm lint`, `pnpm typecheck` (the former CI jobs); the three API suites and the
    web unit suite with coverage (API floor 80 % enforced by the runner config, web floor tracked
    by #4), `pnpm build`; the tests of the CI wiring and of the attestation; Semgrep Community
    Edition `p/default` on the three source trees; osv-scanner on `pnpm-lock.yaml` (waivers per
    advisory in `osv-scanner.toml`, expiring 2026-12-10, #5); gitleaks on the whole history.
  - L2 `just gate` before every merge, on the pushed head: a frozen `pnpm install`, L1,
    `sonar-scanner` against the self-hosted instance with the quality gate waited for, the
    Playwright smoke E2E on the local production build, Trivy on the Dockerfile and
    compose configuration, the API image built and scanned (report-only until #6), then the
    attestation of agents-skills ADR-0003: a signed note on `refs/notes/gate` and the commit status
    `gate` on the head SHA captured before the first check.
  - L3 `just nightly` on the systemd user timer `cos-local-ci-nightly.timer` (`scripts/systemd/`):
    L1, TruffleHog on the history, `mise outdated`.
- `just merge <pr>` is the only merge path: it refuses unless the PR head carries the attestation,
  verified against `.github/allowed_signers` read from `origin/main`.
- `.github/workflows/` is deleted. The repository goes public (agents-skills ADR-0005, owner
  decision 2026-11-10, option A 445/500 against public after PR #1 290 and private 260): branch
  protection is unavailable on a private Free repository, and the public ruleset makes the `gate`
  status a real merge condition (`.github/branch-protection.md`).
- `pnpm-lock.yaml` is committed: the installs become frozen (`just setup`, `just gate`, the API
  image) and osv-scanner has a lockfile to read. Build scripts of `better-sqlite3` and `esbuild`
  are allowed in `pnpm-workspace.yaml` (pnpm 10 blocks them otherwise).
- Prettier runs on the staged files only (L0) until #3 formats the tree.

## Consequences

- Semgrep is the one unpinned input: `p/default` is fetched from the registry at each run and
  `uvx semgrep@1.184.0` carries no checksum, so a finding can appear without a commit and the
  pre-push needs the network. Accepted for a Community Edition rule set.
- The image scan is report-only (`WARNING` line, rule 5 of the skill) until #6 ships a runtime
  stage with production dependencies on a patched base: the findings are in the base image and in
  the development dependencies the image installs, none in the application code.
- No GitHub minute is spent; a merge needs a laptop with Docker, the self-hosted SonarQube and the
  owner's SSH key loaded. The first merge after this decision cannot verify the attestation
  (`allowed_signers` is not on `main` yet): `just gate` on the pushed head posts the `gate` status
  (`write` reads no trust store) and the merge goes through the bootstrap waiver of the owner rule.
- The clone the nightly unit points to must be a full clone: TruffleHog cannot read a partial
  (`blob:none`) clone, and `just nightly` refuses one with the conversion command.
- A squash merge creates an unattested `main` commit: `just gate` runs again on `main` before any
  staging deploy, once a staging tier exists.
- PR #1 (realtime hardening) edits `ci.yml`; after this merge it has to drop that file and rebase.
- The waivers of `osv-scanner.toml` expire on 2026-12-10; `just check` turns red that day unless
  #5 landed or the entries were reviewed and extended with a dated reason.
