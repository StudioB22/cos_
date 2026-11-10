# Branch protection — `main`

Canonical reference for the protection of `main`, committed so the configuration can be replayed,
diffed or audited without the GitHub UI (ADR-0002, #2). Available once the repository is public
(a private Free repository has no branch protection). Status: not applied yet, applied right after
the visibility flip of #2 (date recorded in `PROJECT_LOG.md`).

## Policy

- Pull request required before merge; `just merge <pr>` is the only merge path (skill `local-ci`).
- Required status check, strict (branch up to date with `main`): `gate`, the commit status written
  by `scripts/attest.sh write gate` at the end of `just gate`. No workflow writes any status.
- Linear history required (squash only), force-pushes and deletions blocked, conversation
  resolution required.
- `required_approving_review_count`: 0 (solo project; the attested gate, the `review-local` report
  and the owner's validation are the review signal). `enforce_admins`: false (emergency bypass).

## Apply / update

```bash
gh api -X PUT repos/StudioB22/cos_/branches/main/protection --input - <<'EOF2'
{
  "required_status_checks": { "strict": true, "contexts": ["gate"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF2
```

Verify: `gh api repos/StudioB22/cos_/branches/main/protection --jq .required_status_checks`.
