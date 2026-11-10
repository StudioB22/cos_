# Local CI (#2, skill local-ci, ADR-0002): four tiers, one recipe each, no GitHub Actions and no
# AI agent needed. Vercel and Render deploy from their own git integration, so the repository keeps
# no workflow at all. Tools come from mise.toml (`just setup`); run the tiers as `mise x -- just
# <tier>` when the shell does not activate mise (the git hooks do). Tiers, budgets and contents:
# CONTRIBUTING.md § Local CI (L0 fast < 10 s on commit, L1 check < 3 min on push, L2 gate before
# every merge, L3 nightly on the systemd user timer `cos-local-ci-nightly.timer`).
#
# Then: `just merge <pr>` (refuses without the gate attestation on the head SHA). No `deploy` or
# `attest staging` recipe: the platforms deploy `main` themselves and no staging tier exists yet.

set shell := ["sh", "-eu", "-c"]

# Semgrep Community Edition via uv, not mise: a mise pipx install needs a mise-managed Python.
semgrep := "uvx semgrep@1.184.0"

# L1 by default
default: check

# Once per clone: the pinned toolchain, the workspace dependencies, Chromium for Playwright, the hooks
setup:
    mise install
    mise x -- pnpm install --frozen-lockfile
    mise x -- pnpm --filter @cos/web exec playwright install chromium
    mise x -- lefthook install

# L0 — the pre-commit checks on the staged files (< 10 s)
fast:
    lefthook run pre-commit

# Fail fast outside the .nvmrc Node major: a non-interactive shell does not activate mise, so another
# manager's default Node would run the suites. Fix: activate mise or run `mise x -- just …`.
[private]
node-guard:
    @node -e 'const want=require("fs").readFileSync(".nvmrc","utf8").trim().replace(/^v/,"").split(".")[0]; const v=process.versions.node; if (v.split(".")[0] !== want) { console.error("Node " + v + " found, Node " + want + " required (.nvmrc). Run: mise x -- just <recipe>"); process.exit(1) }'

# Spelling (typos.toml), hook config, the API Dockerfile, then the former CI jobs: eslint and tsc on
# every workspace package. Prettier runs on the staged files only (L0): the tree predates it (#3).
lint: node-guard
    typos
    lefthook validate
    hadolint --failure-threshold warning apps/api/Dockerfile
    pnpm lint
    pnpm typecheck

# The three API suites and the web unit suite with coverage (lcov for SonarQube), the production
# build of every package, then the tests of the CI wiring and of the attestation itself
test: node-guard
    pnpm --filter @cos/api exec vitest run --coverage
    pnpm --filter @cos/web exec vitest run --coverage
    pnpm build
    sh scripts/test-local-ci.sh
    sh scripts/test-attest.sh

# EIO_BACKEND=posix: semgrep-core otherwise opens io_uring rings charged to RLIMIT_MEMLOCK and dies
# with "Cannot allocate memory". Tests are excluded by .semgrepignore.
# SAST (Semgrep CE on the shipped sources) and known vulnerabilities in pnpm-lock.yaml (waivers: osv-scanner.toml)
security:
    EIO_BACKEND=posix {{semgrep}} scan --config p/default --error --metrics=off --quiet apps/api/src apps/web/src packages/shared/src
    osv-scanner scan source --config osv-scanner.toml --lockfile pnpm-lock.yaml

# Secrets in the whole git history
secrets:
    gitleaks git --redact --no-banner .

# L1 — pre-push (< 3 min)
check: lint test security secrets

# Called by review-local § 2b (contents: CONTRIBUTING.md § Local CI). Reinstalls the lockfile so the
# attested SHA is tested with the dependencies it declares. The SonarQube token comes from
# ~/.config/sonarqube/analysis-token unless SONAR_TOKEN is exported (skill infra-accounts). Attests
# the head SHA captured before the first check (agents-skills ADR-0003): a HEAD moved during the run
# is refused, so do not touch the tree meanwhile.
# L2 — pre-merge on the pushed head (5–10 min): check, SonarQube, smoke E2E, Trivy, the API image, attestation
gate:
    #!/bin/sh
    set -eu
    [ -z "$(git status --porcelain)" ] || { echo "gate: the working tree has uncommitted changes" >&2; exit 1; }
    head=$(git rev-parse HEAD)
    docker info > /dev/null 2>&1 || { echo "gate: Docker is not running (API image)" >&2; exit 1; }
    command -v sonar-scanner > /dev/null || { echo "gate: sonar-scanner not on PATH (system tool, skill local-ci rule 2)" >&2; exit 1; }
    token=${SONAR_TOKEN:-$(cat "$HOME/.config/sonarqube/analysis-token" 2> /dev/null || true)}
    [ -n "$token" ] || { echo "gate: no SonarQube token (export SONAR_TOKEN or ~/.config/sonarqube/analysis-token)" >&2; exit 1; }
    curl -sSf -o /dev/null --max-time 5 http://localhost:9000 \
      || { echo "gate: no SonarQube instance answering on http://localhost:9000 (skill infra-accounts)" >&2; exit 1; }
    just node-guard
    pnpm install --frozen-lockfile
    pnpm --filter @cos/web exec playwright install chromium
    just check
    SONAR_TOKEN="$token" sonar-scanner -Dsonar.qualitygate.wait=true
    pnpm test:e2e
    trivy config --skip-dirs '**/node_modules' --skip-dirs .claude --exit-code 1 --severity HIGH,CRITICAL --quiet .
    docker build --quiet -f apps/api/Dockerfile -t cos-api:gate .
    # Report-only until #6 ships a production-only runtime stage on a patched base (base-image and
    # development-dependency findings only, none in the application code).
    trivy image --exit-code 0 --severity HIGH,CRITICAL --quiet cos-api:gate
    echo "WARNING: trivy image is report-only, the base-image findings do not block (#6)" >&2
    echo "WARNING: documentation coverage not run (no counter in this repository yet)" >&2
    echo "WARNING: web coverage floor not run (0 % today, #4)" >&2
    sh scripts/attest.sh write gate "$head"

# Merge a PR only when its exact head SHA carries the gate attestation (agents-skills ADR-0003)
merge pr:
    #!/bin/sh
    set -eu
    sha=$(gh pr view {{quote(pr)}} --json headRefOid -q .headRefOid)
    git fetch --quiet origin "$sha"
    sh scripts/attest.sh verify gate "$sha"
    gh pr merge {{quote(pr)}} --squash --match-head-commit "$sha"

# TruffleHog cannot read a partial (blob:none) clone: refuse it before the minutes of check.
[private]
full-clone:
    @[ "$(git config remote.origin.promisor)" != true ] || { echo "nightly: partial clone, trufflehog cannot read it: git fetch --refetch --no-filter && git config --unset remote.origin.promisor && git config --unset remote.origin.partialclonefilter" >&2; exit 1; }

# L3 — nightly, systemd user timer cos-local-ci-nightly.timer (no time budget)
nightly: full-clone check
    trufflehog git "file://$PWD" --no-verification --fail --no-update
    mise outdated
