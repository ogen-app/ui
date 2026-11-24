#!/bin/sh
# Writes /srv/env.js from the container's environment, then hands over to the
# command — Caddy (CON-518). This is what lets one image run in development and
# in production: the values that differ are read at start, not at build.
#
# The allow-list is the object below, and nothing else in the environment can
# reach the browser — API_ORIGIN, Railway's own variables and any secret set on
# the service stay here. A key that is unset or empty is left out, so the page
# falls back to the build's value (src/config/runtimeConfig.ts). jq does the
# JSON escaping; the result is a plain object literal.
set -eu

config=$(jq -cn '$ENV
  | {SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE, DEV_TOOLS}
  | with_entries(select(.value != null and .value != ""))')

printf 'window.__OGEN_CONFIG__ = %s\n' "$config" > /srv/env.js

exec "$@"
