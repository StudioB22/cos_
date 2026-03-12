# COS_ Architecture

```mermaid
flowchart LR
  Browser[React + Tailwind Retro UI]
  Browser -->|HTTP| Api[Express API]
  Browser -->|Socket.io| Socket[Realtime Gateway]
  Api --> Shared[@cos/shared contracts]
  Socket --> Shared
  Api --> Db[(SQLite)]
  Socket --> Memory[(RAM state)]
```

## Core runtime rules
- Users persist in SQLite through email-only demo auth.
- Aliases persist in SQLite and are capped to three per user.
- Public rooms are seeded and visible to every alias.
- Private rooms are owned by an alias and membership is explicit.
- Messages, presence, DM threads, and ignore lists live in memory and reset on API restart.
