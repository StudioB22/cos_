# COS_ - Chat Old School

Retro full-stack chat inspired by French 90s web culture, built as a portfolio project with a clean architecture focus.

## Stack
- React + Vite + Tailwind
- Node + Express + Socket.io
- SQLite + `better-sqlite3`
- TypeScript strict mode
- Vitest + Playwright + GitHub Actions

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
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

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
