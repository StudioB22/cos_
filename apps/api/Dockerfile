FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN corepack prepare pnpm@10.30.3 --activate \
  && pnpm install --filter @cos/api --filter @cos/shared --frozen-lockfile=false

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @cos/api build

ENV API_PORT=3001
EXPOSE 3001

CMD ["pnpm", "--filter", "@cos/api", "start"]
