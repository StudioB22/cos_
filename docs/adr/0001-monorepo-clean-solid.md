# ADR 0001 - Monorepo and Modular Hexagonal Architecture

## Status
Accepted

## Context
COS_ is a portfolio-grade full-stack application with a retro UI, real-time chat, and a small persistence layer.
The project needs:

- fast iteration in four weeks;
- a clean architecture story for recruiters;
- shared contracts between frontend and backend;
- a deploy path split across Vercel and Render.

## Decision
Use a `pnpm` monorepo with three top-level packages:

- `apps/web` for the React/Tailwind client;
- `apps/api` for the Express/Socket.io backend;
- `packages/shared` for Zod contracts and cross-app types.

On the backend, use a modular hexagonal architecture:

- `domain` for entities and invariants;
- `application` for use-cases and orchestration;
- `infrastructure` for SQLite/in-memory adapters;
- `presentation` for HTTP and Socket.io entrypoints.

On the frontend, use a feature-first layout:

- `features/*` for user-facing slices;
- `lib` for API, socket, and query utilities;
- `app` for providers, routing, and application shell.

## Consequences
- The codebase is easy to explain and demo.
- Feature boundaries stay explicit without introducing unnecessary microservices.
- Shared schemas reduce contract drift.
- Some boilerplate is accepted in exchange for SOLID boundaries and testability.
