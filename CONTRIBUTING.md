# Contributing to COS_

## Branching rule

- Each new task starts on a dedicated branch from `main`, named `<type>/<issue>-<slug>`.
- Never commit to `main`; a pull request closes its issue (`Closes #N`).

## Commit rule

- Commit often, small reviewable commits with a single clear purpose.
- Subjects follow Conventional Commits 1.0.0 (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`,
  `ci`, `build`, `perf`), checked by the commit-msg hook.

## Local CI — the four tiers

Every check runs on the laptop and in the git hooks; the repository has no GitHub workflow
([ADR-0002](docs/architecture/decisions/0002-run-every-check-locally.md), skill `local-ci`). Once
per clone: `mise trust mise.toml && mise x -- just setup` (pinned tools from `mise.toml`, a frozen
`pnpm install`, Chromium for Playwright, the lefthook hooks). Run the tiers as `mise x -- just
<tier>` when the shell does not activate mise.

| Tier | Command        | When                                                                 | Holds                                                                                                                                                                                                                                                                                                                                                  |
| ---- | -------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L0   | `just fast`    | pre-commit hook (< 10 s)                                             | staged secrets (gitleaks), eslint and prettier on the staged files, typos, hadolint; commit-msg: Conventional Commits subject                                                                                                                                                                                                                          |
| L1   | `just check`   | pre-push hook (< 3 min)                                              | typos, `lefthook validate`, hadolint; `pnpm lint`, `pnpm typecheck`; the three API suites and the web unit suite with coverage (API floor 80 %), `pnpm build`; the wiring and attestation tests; Semgrep CE, osv-scanner (waivers in `osv-scanner.toml`), gitleaks on the history                                                                      |
| L2   | `just gate`    | on the pushed head, before every merge (5–10 min)                    | frozen install, L1, SonarQube with the quality gate waited for (self-hosted instance, token in `~/.config/sonarqube/analysis-token` or `SONAR_TOKEN`), the Playwright smoke E2E on the local production build, Trivy on the Dockerfile and compose files and, report-only until #6, on the API image; then the signed gate attestation on the head SHA |
| L3   | `just nightly` | systemd user timer `cos-local-ci-nightly.timer` (`scripts/systemd/`) | L1, TruffleHog on the history, `mise outdated`                                                                                                                                                                                                                                                                                                         |

The nightly timer is installed by hand once per machine: edit `WorkingDirectory=` in
`scripts/systemd/cos-local-ci-nightly.service` if the clone lives elsewhere, then
`systemctl --user link "$PWD"/scripts/systemd/cos-local-ci-nightly.{service,timer}
"$PWD"/scripts/systemd/cos-local-ci-nightly-failed.service && systemctl --user enable --now
cos-local-ci-nightly.timer`. Branch protection of `main`: [`.github/branch-protection.md`](.github/branch-protection.md).
References to skills point at the owner's `~/.claude` tooling, not at this repository.

`just merge <pr>` is the only merge path: it refuses unless the PR head carries the gate attestation
(signed note on `refs/notes/gate` + commit status `gate`, verified against `.github/allowed_signers`
read from `origin/main`). `just gate` needs Docker, `sonar-scanner` on `PATH`, the SonarQube token and the
signer's SSH key in `ssh-agent` (`git config gpg.format ssh`, `user.signingkey`).

The pnpm scripts still work alone: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`,
`pnpm test:integration`, `pnpm test:realtime`, `pnpm test:e2e`, `pnpm build`.

## Task completion rule

- A task is complete when its pull request merged through `just merge` and its issue is closed.
- The PR describes the scope, the tiers run, and any remaining risks.

## GitHub target

- Repository owner target: `StudioB22`
