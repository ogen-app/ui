#!/usr/bin/env bash
# set-secret.sh — set or rotate a platform API key on a RUNNING Ogen API.
#
# Keys live in the API's encrypted secret store and are hot-reloaded on
# write (the backend re-validates and swaps them live), so rotation needs
# no container restart and no downtime. The backend never reads these keys
# from the environment — ANTHROPIC_API_KEY / ZERNIO_API_KEY in .env.api are
# ignored — so this script (PUT /api/secrets/{name}) is the only way to set
# or change a key.
#
# Usage:
#   scripts/set-secret.sh <name> [api-base]
#     name      one of: anthropic_api_key | zernio_api_key | gemini_api_key
#     api-base  default http://localhost:9001
#
# Login and the key value are prompted interactively; for non-interactive
# use (CI, direnv):
#   OGEN_EMAIL / OGEN_PASSWORD    skip the login prompts
#   echo "$KEY" | scripts/set-secret.sh zernio_api_key    value from stdin
#
# Nothing secret is ever passed as a CLI argument, so neither the key nor
# the password can leak via shell history or `ps`.

set -euo pipefail

NAME="${1:-}"
BASE="${2:-http://localhost:9001}"

case "$NAME" in
  anthropic_api_key | zernio_api_key | gemini_api_key) ;;
  *)
    echo "usage: $0 <anthropic_api_key|zernio_api_key|gemini_api_key> [api-base]" >&2
    exit 2
    ;;
esac

EMAIL="${OGEN_EMAIL:-}"
PASSWORD="${OGEN_PASSWORD:-}"
[ -n "$EMAIL" ] || read -rp "Ogen login email: " EMAIL
[ -n "$PASSWORD" ] || { read -rsp "Ogen password: " PASSWORD; echo; }

if [ -t 0 ]; then
  read -rsp "New value for $NAME (input hidden): " VALUE
  echo
else
  VALUE="$(cat)"
fi
[ -n "$VALUE" ] || { echo "empty value — aborting" >&2; exit 1; }

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

code=$(jq -n --arg e "$EMAIL" --arg p "$PASSWORD" '{email:$e,password:$p}' |
  curl -s -o /dev/null -w '%{http_code}' -c "$JAR" \
    -X POST "$BASE/api/sessions" -H 'Content-Type: application/json' --data @-)
case "$code" in
  2??) ;;
  *) echo "login failed (HTTP $code)" >&2; exit 1 ;;
esac

code=$(jq -n --arg v "$VALUE" '{value:$v}' |
  curl -s -o /dev/null -w '%{http_code}' -b "$JAR" \
    -X PUT "$BASE/api/secrets/$NAME" -H 'Content-Type: application/json' --data @-)
case "$code" in
  200) echo "✓ $NAME rotated (existing secret replaced)" ;;
  201) echo "✓ $NAME created" ;;
  *) echo "set failed (HTTP $code)" >&2; exit 1 ;;
esac

# Zernio re-validates the key with a live ping on every change — wait for
# the state it lands on. (Anthropic/Gemini expose no public health check.)
if [ "$NAME" = "zernio_api_key" ]; then
  state=""
  for _ in $(seq 1 15); do
    state=$(curl -s "$BASE/api/integrations/zernio/health" | jq -r '.state // empty')
    [ "$state" = "ok" ] && break
    sleep 1
  done
  case "$state" in
    ok) echo "zernio integration: ok" ;;
    degraded)
      echo "zernio integration: degraded — key saved but failed validation (wrong/expired key?)" >&2
      exit 1
      ;;
    *) echo "zernio integration state: ${state:-unknown}" >&2 ;;
  esac
fi
