# Local review — cos_ (branch ci/2-local-ci-no-workflows)

- Date: 2026-11-10
- Commit: e4ea977 (checked range origin/main 7933c51...e4ea977; round 1 ran on 2b4f18b, rebuilt
  as e5468fb build(docker), af459a7 fix(api), 0ebe4b6 ci(workflows), then 8862871 fix(api) and
  e4ea977 docs after round 2)
- Scope: branch diff origin/main...HEAD, `--push` mode
- Checks run: adversarial (Opus, 2 rounds) · design · docs · tests · docker · security · correctness
- Verdict: ship · Must 2 (fixed) · Should 17 (13 fixed, 4 filed) · Nice 8

## Adversarial review (#236)

- Round 1 on `2b4f18b`: Must 2 · Should 8 · Nice 4 · unverified 2 · Push gate: closed
- Round 2 on `0ebe4b6`: 2 fixed (Must) · 9 fixed (Should/Nice) · 0 not fixed · 0 regressed · new Must 0 · new Should 3 (SIGTERM with a websocket open, no test on `toApiError`, squash undoes the commit split) · Push gate: open
- Round 3 on `e4ea977` (verify 8862871, e4ea977): 2 fixed · 1 accepted (the squash body carries the `fix(api)` and `build(docker)` lines) · new Must 0 · **Push gate: open**
- Optional second review (owner's OpenAI account): ChatGPT/Codex not run (never a gate step)

## Pre-merge gate (head SHA e4ea977)

| Step        | Result                                                                                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 CI mirror | n/a: the PR deletes every workflow; former jobs → `just lint` (pnpm lint, typecheck), `just test` (unit, integration, realtime, build), `sonarqube.yml` → `just gate` (ADR-0002)                                  |
| 1 Tests     | ✅ API 14 unit/integration/realtime · ✅ web 2 unit · ✅ 63 + 31 wiring cases · E2E deferred                                                                                                                      |
| 2 Coverage  | tests API 80.67 % stmts / 91.09 % branches / 86 % funcs / 80.67 % lines (floor 80) · web 0 % (#4, `WARNING` in the gate) · docs ⏸ deferred to the pre-merge run (`--push`, no counter yet: `WARNING` in the gate) |
| 3 SonarQube | ⏸ deferred to the pre-merge run (`--push`; key `cos_`, first scan creates the project)                                                                                                                            |
| 4 Secrets   | ✅ gitleaks clean (origin/main..HEAD) · no tracked .env (`.env.example` only) · diff read: nothing sensitive (SonarQube token read from a file, never echoed)                                                     |
| 5 E2E/smoke | ⏸ deferred to the pre-merge run (`--push`); the API image was built and run offline by hand: starts, healthy, uid 1000, clean SIGTERM stop                                                                        |

- Gate: `--push`: **pre-push green** — `just check` passed (rc 0), SonarQube, E2E and doc coverage deferred (never GREEN)

## 🔴 Must Have

- `.gitignore` `[adversarial]` · `sonar-scanner` leaves `.scannerwork/` untracked, so `attest.sh write` refused the tree at the end of every gate · fixed: ignored, `git check-ignore` case in `scripts/test-local-ci.sh`
- `apps/api/src/index.ts` `[adversarial]` · round 2: `httpServer.close()` waited for the open websockets (docker stop 10 s, exit 137) · fixed: `io.close()`, verified 0.14 s exit 0
- `apps/api/src/shared/http/to-api-error.ts` `[adversarial]` · round 2: the generic-500 rule had no test · fixed: `to-api-error.unit.test.ts`, 3 cases, `console.error` asserted
- `apps/api/Dockerfile` `[adversarial|docker]` · the image did not start offline as `node` (corepack re-downloaded pnpm at every boot) and failed with EACCES on the default SQLite path; no HEALTHCHECK, base not digest-pinned, `.dockerignore` let `.env*` into the context · fixed: `node dist/index.js` as 1000:1000, `ENV SQLITE_PATH`, HEALTHCHECK, digest pin, hardened `.dockerignore`, SIGTERM handler; verified with `docker run --network none`

## 🟡 Should Have

- `render.yaml` `[adversarial]` · prod installed with `--frozen-lockfile=false` · fixed
- `apps/api/src/shared/http/error-middleware.ts`, `register-realtime-handlers.ts` `[design|correctness]` · the Zod→400 mapping drifted between HTTP and sockets, and the 500 echoed internal messages · fixed: one `toApiError`
- `apps/api/src/features/rooms/presentation/room-router.ts` `[design]` · `String(request.params.roomName)` hid an `@types/express@5` mismatch · fixed: Zod-parsed params; the types pin is #9
- `apps/api/vitest.config.ts` `[adversarial|design|tests]` · `src/**/domain/**` excluded future domain logic from the floor · fixed: `*-record.ts`
- `scripts/test-local-ci.sh:54` `[tests]` · the floor check matched `lines` only · fixed: four keys
- `docs/architecture/decisions/0002-…md` `[adversarial|docs]` · three false statements (Playwright in the former CI, "offline except Semgrep", "gate step 5") · fixed
- `PROJECT_LOG.md` `[adversarial|docs]` · visibility recorded as done, coverage figure, broken list wrap · fixed
- `justfile` gate `[adversarial]` · doc coverage and the web floor skipped silently · fixed: `WARNING` lines (local-ci rule 5)
- `.github/dependabot.yml` `[adversarial|docker]` · no docker ecosystem, non-Conventional PR titles · fixed
- `scripts/*.sh` headers, `CONTRIBUTING.md`, `mise.toml`, `.github/branch-protection.md` `[adversarial|docs]` · references to the skill's recipes and issues, gate requirements attributed to `merge`, status of the ruleset · fixed
- `apps/api/src/features/realtime/application/realtime-service.ts` `[design]` · application imports an infrastructure adapter (older than this branch) · filed #7
- `eslint.config.mjs` `[design|adversarial]` · typed rules dropped · filed #8
- `tsconfig.base.json`, `apps/web/tsconfig.json`, both `vitest.config.ts` `[design]` · `@cos/shared` path written four times · filed #9
- `docker-compose.yml` `[docker]` · placeholder secret, no healthcheck/restart/hardening · filed #10
- `apps/web/vitest.config.ts` `[tests]` · no coverage threshold · #4 (gate `WARNING`)
- `sonar-project.properties` `[adversarial]` · lcov `SF:` paths relative to each package, unverified until the first scan · checked at the pre-merge run

## 🔵 Nice to Have

- `osv-scanner.toml` `[adversarial]` · `ignoreUntil` deprecated · fixed: `effectiveUntil`
- `apps/web/playwright.config.ts` `[adversarial]` · `reuseExistingServer` on the laptop · fixed: `false`
- `apps/api/test/unit/alias-service.unit.test.ts` `[tests]` · assert `code` instead of message text, add the 2-alias boundary and unknown-alias cases, `loadEnv(source)` · left for the test follow-up (#4 scope)
- `apps/api/tsconfig.json` `[design]` · `outDir` dead with `noEmit` · left
- `justfile` `[design]` · `test` also runs `pnpm build` · left (one L1 recipe, documented)
- `apps/api/Dockerfile` `[docker]` · distroless runtime, dive numbers · #6

## ⚪ Disagree / Intentional

- `justfile:93-95` `[docker|adversarial]` · `trivy image` report-only with a `WARNING` line · local-ci rule 5, tracked by #6
- `justfile` gate body calling `just node-guard` / `just check` instead of dependencies `[design]` · the head SHA must be captured before the first check (ADR-0002)
- `apps/api/vitest.config.ts` `suite()` helper, `sessionCookies` `[design]` · Rule of Three met
- `scripts/test-local-ci.sh` greps on the justfile wording `[tests]` · tripwire for wiring that cannot run cheaply, next to the executed cases (commit-msg hook, fast, guard)
- `scripts/check-cassettes.sh` kept `[adversarial|docs]` · verbatim copy of the skill's script exercised by `test-attest.sh`; header says no recipe calls it yet

## Per-dimension summary

- Adversarial: 2 Must (attestation blocked by `.scannerwork/`, image not starting as non-root) and 8 Should, all fixed or filed · Design: no over-engineering, 1 pre-existing DIP breach (#7), error mapping unified · Docs: no Must, freshness fixes applied · Tests: web floor (#4) and the floor tripwire fixed, assertion sharpening left · Docker: mandatory set now met except the report-only image scan (#6) and compose (#10) · Security: gitleaks clean, no secret in the diff, 500 responses no longer leak internals · Correctness: `just check` green, image verified offline
