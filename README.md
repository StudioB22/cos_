# COS_ - Chat Old School

Retro full-stack chat inspired by French 90s web culture, built as a portfolio project with a clean architecture focus.

## Stack

- React + Vite + Tailwind
- Node + Express + Socket.io
- SQLite + `better-sqlite3`
- TypeScript strict mode
- Vitest + Playwright, local CI with just + lefthook + mise (no GitHub workflow, [ADR-0002](docs/architecture/decisions/0002-run-every-check-locally.md))

## Workspace

- `apps/web`: retro UI, onboarding, rooms, chat, DM, ignore
- `apps/api`: HTTP API, realtime gateway, SQLite adapters
- `packages/shared`: Zod contracts, shared types, smiley catalog

## Architecture

- Backend: modular hexagonal architecture by feature
- Frontend: feature-first React layout
- Messages, presence, DM history, and ignore lists reset on restart by design

## Quick start

```bash
mise trust mise.toml && mise x -- just setup
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`just setup` installs the pinned toolchain (`mise.toml`), the workspace dependencies, Chromium for
Playwright and the git hooks. Checks: `just fast` (pre-commit), `just check` (pre-push),
`just gate` (before every merge), `just nightly` — see [CONTRIBUTING](CONTRIBUTING.md).

## Key flows

- Demo auth through email + signed cookie
- Up to three aliases per user
- Public rooms accessible to everyone
- Private rooms owned by an alias, invitations controlled by the owner
- Realtime rooms, DMs, ignore rules, and retro smiley palette

## Deploy

- Frontend target: Vercel
- Backend target: Render

Use `render.yaml` for the API service and `vercel.json` for SPA routing.

## Git workflow

- One task = one branch, one issue; Conventional Commits subjects (checked by the commit-msg hook)
- Frequent small commits inside the task branch; `just check` runs on every push
- A pull request merges through `just merge <pr>` once `just gate` attested its head commit
- GitHub owner target: `https://github.com/StudioB22`
