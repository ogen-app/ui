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

# "1" builds in the staging dev tools: per-browser feature-flag overrides and
# the /flags panel (src/config/flagOverrides.ts). Set it on the **staging**
# service only — it is what lets one teammate exercise a half-built feature
# there without the rest of the team seeing it. Anything else, including
# leaving it unset, folds the whole thing out of the bundle, which is why the
# default here is empty: a production image gets it right by doing nothing.
ARG VITE_DEV_TOOLS=""
ENV VITE_DEV_TOOLS=${VITE_DEV_TOOLS}

# Sentry error monitoring + tracing (CON-304). All empty by default ⇒ telemetry
# is off (fail-open) and the build ships no source maps. Set the DSN to turn it
# on. VITE_APP_RELEASE should be the commit SHA, matching the API's
# SENTRY_RELEASE so a UI error and its server trace share one release.
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ARG VITE_SENTRY_ENVIRONMENT="production"
ENV VITE_SENTRY_ENVIRONMENT=${VITE_SENTRY_ENVIRONMENT}
ARG VITE_SENTRY_TRACES_SAMPLE_RATE="0.1"
ENV VITE_SENTRY_TRACES_SAMPLE_RATE=${VITE_SENTRY_TRACES_SAMPLE_RATE}
ARG VITE_APP_RELEASE=""
ENV VITE_APP_RELEASE=${VITE_APP_RELEASE}

# Build-time only, for source-map upload — these have NO VITE_ prefix, so Vite
# never injects them into the client bundle, and this build stage is discarded
# before the runtime image, so the token never ships. Leaving the token empty
# skips the upload entirely.
ARG SENTRY_AUTH_TOKEN=""
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ARG SENTRY_ORG=""
ENV SENTRY_ORG=${SENTRY_ORG}
ARG SENTRY_PROJECT=""
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

RUN pnpm build

# ─── Stage 2: serve with Caddy ───────────────────────────────────────────────
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Railway injects $PORT; the Caddyfile listens on it (default 8080 locally).
EXPOSE 8080
