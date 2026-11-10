#!/bin/sh
# Tests for the local CI wiring (#2, skill local-ci rule 7): the tiers compose (check ⊇ lint + test +
# security + secrets; gate and nightly ⊇ check), gate captures the head SHA before its first check,
# refuses a dirty tree and ends with the attestation on that SHA, merge verifies it (agents-skills
# ADR-0003), no GitHub workflow exists (ADR-0002), mise.toml pins the .nvmrc Node, lefthook.yml is
# valid and wires the commit-msg and pre-push hooks, the commit-msg check accepts and refuses the
# right subjects (100-character limit included), and in a throwaway repository L0 (`just fast`)
# passes a clean staged change and an empty stage but refuses a staged secret, a staged typo and a
# staged Dockerfile smell, and the installed commit-msg hook refuses a bad subject. Needs mise, just,
# lefthook, gitleaks, typos, hadolint on PATH:
#   mise x -- sh scripts/test-local-ci.sh
set -e
# A hook (pre-push runs `just check`) exports these; they would aim git at the outer repository.
# shellcheck disable=SC2046 # one variable name per word
unset $(git rev-parse --local-env-vars)
# The developer's git config (signing, hooksPath) and mise trust list stay out of the throwaway repo.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
n=0
fail() { echo "FAIL $1"; exit 1; }
ok() { n=$((n + 1)); } # one counted case

# `mise x --` puts the tools on PATH but not mise itself (hooks and the throwaway repo need it).
command -v mise > /dev/null || { [ -x "$HOME/.local/bin/mise" ] && PATH="$HOME/.local/bin:$PATH" && export PATH; }
for bin in mise just lefthook gitleaks typos hadolint; do
  command -v "$bin" > /dev/null || fail "$bin not on PATH"
done

# Tiers and their composition (a missing recipe fails `just --show`).
cd "$root"
deps() { just --show "$1" | grep -E "^$1( |:)" | sed 's/.*: *//'; } # deps <recipe>
for d in lint test security secrets; do deps check | grep -qw "$d" || fail "check lacks $d"; ok; done
deps nightly | grep -qw check || fail "nightly does not depend on check"; ok
deps nightly | grep -qw full-clone || fail "nightly does not refuse a partial clone first (trufflehog)"; ok
body() { just --show "$1" | grep -v '^ *#'; } # body <recipe>: its lines, comments dropped
body gate | grep -q '^ *just check$' || fail "gate does not run check"; ok
body gate | grep -q 'sonar-scanner -Dsonar.qualitygate.wait=true' || fail "gate does not wait for the SonarQube quality gate"; ok
grep -q '^sonar.host.url=http://localhost:9000$' sonar-project.properties || fail "sonar-project.properties does not point at the local instance (the scanner defaults to SonarCloud)"; ok
body gate | grep -q '^ *pnpm test:e2e$' || fail "gate does not run the smoke E2E suite"; ok
body gate | grep -q -- "trivy config --skip-dirs '\*\*/node_modules'" || fail "trivy config would scan node_modules (gate always red)"; ok
body gate | grep -q '^ *pnpm install --frozen-lockfile$' || fail "gate does not reinstall the lockfile"; ok
body gate | grep -q '^ *echo "WARNING: trivy image is report-only' || fail "gate hides the report-only image scan (rule 5: a skipped step says so, #6)"; ok
for r in gate merge; do body "$r" | grep -q '^ *set -eu$' || fail "$r lacks set -eu (a failed step must stop before the attestation)"; ok; done
body gate | grep -q '^ *sh scripts/attest.sh write gate "\$head"$' || fail "gate does not attest the captured head"; ok
dirty=$(body gate | grep -n 'git status --porcelain' | head -1 | cut -d: -f1); hd=$(body gate | grep -n '^ *head=$(git rev-parse HEAD)$' | cut -d: -f1); ck=$(body gate | grep -n '^ *just check$' | cut -d: -f1)
[ -n "$dirty" ] && [ -n "$hd" ] && [ -n "$ck" ] && [ "$dirty" -lt "$hd" ] && [ "$hd" -lt "$ck" ] \
  || fail "gate must refuse a dirty tree, then capture HEAD, before its first check"; ok
body merge | grep -q '^ *sh scripts/attest.sh verify gate "\$sha"$' || fail "merge does not verify the attestation"; ok
body merge | grep -q -- '--match-head-commit "\$sha"' || fail "merge does not pin the head SHA"; ok
body test | grep -c -- 'vitest run --coverage' | grep -qx 2 || fail "test does not run the API and web suites with coverage"; ok
for k in lines branches functions statements; do grep -Eq "thresholds:.*\b$k: *(8[0-9]|9[0-9]|100)\b" apps/api/vitest.config.ts || fail "the API $k coverage floor (80 %) is not enforced by the runner config"; done; ok
git check-ignore -q .scannerwork/report-task.txt || fail ".scannerwork/ (sonar-scanner output) is not ignored: attest.sh would refuse the tree after every gate"; ok
body lint | grep -q '^ *pnpm lint$' && body lint | grep -q '^ *pnpm typecheck$' || fail "lint does not run the former CI jobs pnpm lint and pnpm typecheck"; ok
body security | grep -q -- '--error' || fail "semgrep lost --error (findings would not fail)"; ok
body security | grep -q -- '--lockfile pnpm-lock.yaml' || fail "osv-scanner does not read pnpm-lock.yaml"; ok
[ -s .github/allowed_signers ] || fail ".github/allowed_signers missing or empty (the gate trust store)"; ok
body test | grep -q '^ *sh scripts/test-attest.sh$' || fail "test does not run the attestation tests"; ok

# No GitHub workflow (ADR-0002: nothing deploys from GitHub).
[ ! -e .github/workflows ] || fail ".github/workflows exists (ADR-0002: zero workflow)"; ok
grep -q "^node = \"$(cat .nvmrc)\"" mise.toml || fail "mise.toml node differs from .nvmrc"; ok
grep -q '^lockfile = true' mise.toml && [ -s mise.lock ] || fail "mise.lock missing or lockfile not enabled"; ok

# Hooks.
grep -qE '^ +run: +sh scripts/check-commit-msg.sh \{1\}$' lefthook.yml || fail "commit-msg hook does not run check-commit-msg.sh on the message file"; ok
grep -qE '^ +mise x -- just check$' lefthook.yml || fail "pre-push hook does not run just check"; ok
grep -qE '^ +files: echo justfile$' lefthook.yml && grep -qE '^ +: \{files\};$' lefthook.yml || fail "pre-push hook would be skipped on a push listing no file (tag, deletion)"; ok
lefthook validate > /dev/null || fail "lefthook validate"; ok

# commit-msg subjects (exemptions: merges, reverts, autosquash prefixes; only the subject is checked).
msg() { # msg <expected-exit> <subject>
  printf '%s\n' "$2" > "$work/msg"
  rc=0; sh scripts/check-commit-msg.sh "$work/msg" > /dev/null 2>&1 || rc=$?
  [ "$rc" -eq "$1" ] || fail "commit-msg '$2': exit $rc, expected $1"; ok
}
msg 0 'ci(workflows): wire just + lefthook + mise'
msg 0 'feat!: drop the legacy endpoint'
msg 0 'feat(api)!: drop the v1 endpoint'
msg 0 'Merge branch main into feat/1'
msg 0 'Revert "feat(api): drop the v1 endpoint"'
msg 0 'fixup! feat(api): drop the v1 endpoint'
msg 1 'feat(): empty scope'
msg 1 'feat(API): uppercase scope'
printf 'feat(api): subject\n\nbody that is not checked.\n' > "$work/msg" && sh scripts/check-commit-msg.sh "$work/msg" > /dev/null 2>&1 || fail "commit-msg refused a valid multi-line message"; ok
msg 1 'Wire just'
msg 1 'ci(workflows): ends with a period.'
msg 1 'wip: not a listed type'
msg 1 'Feat: capitalised type'
msg 1 'feat:no space after the colon'
msg 1 ''
long=$(printf 'x%.0s' $(seq 1 94))
msg 0 "feat: $long"   # 100 characters
msg 1 "feat: ${long}x" # 101
rc=0; sh scripts/check-commit-msg.sh > /dev/null 2>&1 || rc=$?; [ "$rc" -eq 2 ] || fail "check-commit-msg without argument: exit $rc, expected 2"; ok

# L0 in a throwaway repository holding this repository's hook config and scripts (no package.json:
# the eslint and prettier jobs match no staged file there).
repo="$work/repo"
mkdir -p "$repo" && cd "$repo"
git init -q -b main && git config user.email t@example.com && git config user.name t
cp -R "$root/scripts" "$root/lefthook.yml" "$root/justfile" "$root/typos.toml" "$root/mise.toml" "$root/mise.lock" "$root/.nvmrc" .
export MISE_TRUSTED_CONFIG_PATHS="$repo"
git add -A && git commit -qm init --no-verify
mkdir notes

# node-guard refuses a Node whose major differs from .nvmrc (local-ci rule 9); on the copied .nvmrc only.
guard() { rc=0; just node-guard > "$work/out" 2>&1 || rc=$?; [ "$rc" -eq "$1" ] || { cat "$work/out"; fail "node-guard with .nvmrc=$2: exit $rc, expected $1"; }; ok; }
guard 0 "$(cat .nvmrc)"
echo 99 > .nvmrc
guard 1 99; grep -q 'Node 99' "$work/out" || fail "node-guard does not name the required major"; ok
git checkout -q .nvmrc

fast() { # fast <expected-exit> <label> [<text the output must hold>]
  rc=0; just fast > "$work/out" 2>&1 || rc=$?
  [ "$rc" -eq "$1" ] || { cat "$work/out"; fail "$2: exit $rc, expected $1"; }
  [ -z "${3:-}" ] || grep -qF "$3" "$work/out" || { cat "$work/out"; fail "$2: output lacks '$3'"; }
  ok
}

fast 0 "empty stage"

echo 'Plain notes.' > notes/a.txt && git add notes/a.txt
fast 0 "clean staged change"

key="AKIA$(printf seed | sha256sum | cut -c1-16 | tr 'a-f0-9' 'A-FG-P')"
printf 'token %s\n' "$key" > notes/leak.txt && git add notes/leak.txt
fast 1 "staged secret refused" "leaks found"
git rm -q --cached notes/leak.txt

printf 't%sh notes\n' e > notes/b.txt && git add notes/b.txt
fast 1 "staged typo refused" "should be"
git rm -q --cached notes/b.txt

printf 'FROM node\nRUN cd /x\n' > notes/Dockerfile && git add notes/Dockerfile
fast 1 "staged Dockerfile smell refused" "DL3"
git rm -q --cached notes/Dockerfile
printf 'echo $x\nRUN cd /x\n' > notes/c.txt && git add notes/c.txt
fast 0 "a non-matching file triggers no linter"
git rm -q --cached notes/c.txt

# The installed commit-msg hook, end to end (pre-commit runs too: the stage is clean).
mise x -- lefthook install > /dev/null 2>&1 || fail "lefthook install in the throwaway repo"
git commit -qm 'Wire just' > "$work/out" 2>&1 && fail "commit-msg hook accepted a bad subject"
grep -q 'commit-msg' "$work/out" || { cat "$work/out"; fail "the refusal did not come from the commit-msg hook"; }; ok
git commit -qm 'test(notes): add a plain note' > /dev/null 2>&1 || fail "commit-msg hook refused a good subject"; ok

echo "test-local-ci: $n cases passed"
