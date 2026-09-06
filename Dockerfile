# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-slim

# ---- deps: install all dependencies (incl. dev) for building -------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ---- build: compile TypeScript -> dist ------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build && pnpm install --frozen-lockfile --prod

# ---- production: minimal runtime image ------------------------------------
FROM node:${NODE_VERSION} AS production
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs kokyu

COPY --from=build --chown=kokyu:nodejs /app/dist ./dist
COPY --from=build --chown=kokyu:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=kokyu:nodejs /app/package.json ./package.json

USER kokyu

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
