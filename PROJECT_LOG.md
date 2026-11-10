# COS_ project log

Chronological operational history for maintainers and future contributors. Latest entries first.
Product changes belong in the git history and the pull requests; this log records decisions,
environment changes and the state of the gates.

## 2026-11-10

- **#2 local-first CI, zero GitHub workflow** (branch `ci/2-local-ci-no-workflows`,
  [ADR-0002](docs/architecture/decisions/0002-run-every-check-locally.md)). GitHub Actions bills
  the owner since October 2026; owner rule 2026-11-07: every check runs locally, only a signed-tag
  prod deploy may stay as a workflow, and COS_ deploys nothing from GitHub (Vercel and Render build
  from git). Plan validated by the owner on 2026-11-10. Added: `justfile` (fast / check / gate /
  nightly, lint, test, security, secrets, merge, setup), `mise.toml` + `mise.lock` (Node 22.23.4),
  `lefthook.yml`, `typos.toml`, `.semgrepignore`, `osv-scanner.toml`, `.nvmrc`,
  `sonar-project.properties` (self-hosted instance), the five `scripts/*.sh`
  (attestation, commit message, cassettes, their 31 + 63 wiring cases), `scripts/systemd/cos-local-ci-nightly.*`,
  `.github/allowed_signers`, `.github/branch-protection.md`, `.github/dependabot.yml`,
  `pnpm-lock.yaml`. Removed: `.github/workflows/` (`ci.yml`, `sonarqube.yml`). `docs/adr/0001` moved
  to `docs/architecture/decisions/` (skill `conception-naming`). Fixes needed for a green L1 on the
  former CI jobs: `packageManager` pnpm 10.30.3 (10.9.4 does not exist), the eslint typed rule and
  `_`-prefixed unused arguments, the API typecheck (shared package `.js` import, no `rootDir`,
  vitest 3 `test.projects`, `sessionCookies` test helper, `String(request.params.roomName)`), Zod
  errors mapped to HTTP 400 (the integration suite expected it), the web `@/` tsconfig paths and the
  Playwright `webServer` (same content as PR #1), `onlyBuiltDependencies` for `better-sqlite3` and
  `esbuild`, the API Dockerfile installing from the lockfile and running as `node`. Coverage: API
  80.4 % lines with two new unit suites (alias service, env), floor 80 % enforced; web 0 % (#4).
  Follow-ups: #3 prettier on the tree, #4 web coverage, #5 toolchain advisories waived until
  2026-12-10, #6 multi-stage API image (trivy image report-only meanwhile).
- **Visibility: public, decided** (to apply with `gh repo edit --visibility public` on the owner's
  explicit yes before the merge; agents-skills ADR-0005, owner MCDA A 445/500 against C public after
  PR #1 290 and B private 260). Public Release Checklist: gitleaks on the full history (8 commits,
  no leak), `.env` ignored, `.env.example` and compose hold placeholders only, no development
  secret to rotate (none was ever committed), gitleaks in L0 and L1.
- **Review-local on #2** (adversarial round 1 closed, 2 Must): `.scannerwork/` ignored (the
  attestation refused the tree after every gate), the API image runs `node dist/index.js` as
  UID 1000 with an absolute `SQLITE_PATH`, a HEALTHCHECK, a digest-pinned base and a SIGTERM
  handler (it needed the network at every start to re-download pnpm and failed on the default
  SQLite path); a `cos_sqlite` volume created by the former root image must be recreated. One
  `toApiError` mapping for HTTP and Socket.io (internal messages no longer reach the client),
  Zod-parsed route params, `render.yaml` frozen install, Dependabot docker entry and Conventional
  prefixes, gate `WARNING` lines for the checks it does not run (doc coverage, web floor #4).
