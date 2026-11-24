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

# Sentry, the dev tools (per-browser flag overrides and /flags) and anything
# else that differs between development and production are NOT build args: the
# same image runs in both, so they are read at container start from the
# container's environment — SENTRY_DSN, SENTRY_ENVIRONMENT,
# SENTRY_TRACES_SAMPLE_RATE, DEV_TOOLS (docker/entrypoint.sh, CON-518).

# The release is compiled in, because one image is one release: the commit SHA,
# matching the API's SENTRY_RELEASE so a UI error and its server trace share it.
ARG VITE_APP_RELEASE=""
ENV VITE_APP_RELEASE=${VITE_APP_RELEASE}

# Source-map upload. The org and project are plain args; the auth token is a
# BuildKit secret (`--secret id=sentry_auth_token,...`), never an ARG, so it
# stays out of the image history and the build cache. No VITE_ prefix, so
# none of these reach the bundle. Without the secret the upload is skipped and
# no maps are emitted.
ARG SENTRY_ORG=""
ENV SENTRY_ORG=${SENTRY_ORG}
ARG SENTRY_PROJECT=""
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

# Vite only: `pnpm build` would also run `tsc`, which repeats CI's typecheck
# and adds ~35 s to every deploy.
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    pnpm exec vite build

# ─── Stage 2: serve with Caddy ───────────────────────────────────────────────
FROM caddy:2-alpine
# jq builds /srv/env.js at start with proper JSON escaping.
RUN apk add --no-cache jq
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/ogen-entrypoint
# Railway injects $PORT; the Caddyfile listens on it (default 8080 locally).
EXPOSE 8080
# Setting ENTRYPOINT clears the base image's CMD, so it is restated here.
ENTRYPOINT ["/usr/local/bin/ogen-entrypoint"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
