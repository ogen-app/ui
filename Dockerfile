# syntax=docker/dockerfile:1
# Standalone deploy of the Ogen UI (CON-98): build the SPA, serve it with Caddy,
# and reverse-proxy /api to the backend so the browser stays same-origin (no
# CORS, the session cookie flows normally).

# ─── Stage 1: build the SPA ──────────────────────────────────────────────────
FROM node:24-alpine AS build

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install
RUN pnpm install --frozen-lockfile

COPY . .

# Leave empty to use the same-origin Caddy proxy (default). Set to an absolute
# API origin only when calling the backend cross-origin (then enable CORS on it).
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm build

# ─── Stage 2: serve with Caddy ───────────────────────────────────────────────
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Railway injects $PORT; the Caddyfile listens on it (default 8080 locally).
EXPOSE 8080
