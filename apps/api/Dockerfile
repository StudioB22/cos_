# syntax=docker/dockerfile:1.7
# check=error=true
# Digest-pinned base (skill docker-hardening); Dependabot docker bumps the tag and digest together.
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN corepack prepare pnpm@10.30.3 --activate \
  && pnpm install --filter @cos/api --filter @cos/shared --frozen-lockfile

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @cos/api build \
  && mkdir -p apps/api/data \
  && chown -R node:node apps/api/data

# Runtime: node as PID 1 (no pnpm, which the non-root user cannot re-download), numeric UID,
# the SQLite path absolute so the default does not resolve against a read-only directory.
# A production-only runtime stage on a patched base is #6.
WORKDIR /app/apps/api
USER 1000:1000

ENV API_PORT=3001
ENV SQLITE_PATH=/app/apps/api/data/cos.sqlite
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:3001/health"]

CMD ["node", "dist/index.js"]
