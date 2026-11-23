#!/usr/bin/env bash
# Start a built image twice and check what /env.js hands the browser (CON-518).
#
#   scripts/smoke-image.sh ghcr.io/ogen-app/ui:smoke
#
# CI runs this on every image before it is pushed. It proves the three things
# the page cannot check for itself:
#
#   - the allow-list holds: the container is started with secrets and other
#     variables beside the four keys, and only the four (set and non-empty)
#     come back;
#   - values survive the trip: a DSN with quotes, a backslash and </script>
#     reads back exactly as it went in;
#   - /env.js is served with Cache-Control: no-store, and index.html loads it.
#
# A second start with nothing set must give an empty object — what production
# looks like when a variable is forgotten. Needs docker, curl and node.
set -euo pipefail

image=${1:?usage: scripts/smoke-image.sh <image>}
tricky='https://k@o0.ingest.sentry.io/1#"\</script>'
containers=()
trap 'docker rm -f "${containers[@]}" >/dev/null 2>&1 || true' EXIT

# Starts the image with the given -e flags and prints the host port.
start() {
	local id port
	id=$(docker run -d -p 127.0.0.1::8080 "$@" "$image")
	containers+=("$id")
	port=$(docker port "$id" 8080/tcp | head -1 | sed 's/.*://')
	for _ in $(seq 40); do
		curl -fsS -o /dev/null "http://127.0.0.1:$port/" 2>/dev/null && break
		sleep 0.25
	done
	echo "$port"
}

# Fetches /env.js from the port and compares what it sets with the JSON given.
expect_config() {
	local port=$1 want=$2 headers body
	headers=$(curl -fsS -D - -o /dev/null "http://127.0.0.1:$port/env.js")
	if ! grep -qi '^cache-control: *no-store' <<<"$headers"; then
		echo "FAIL /env.js is cacheable:" >&2
		echo "$headers" >&2
		exit 1
	fi
	body=$(curl -fsS "http://127.0.0.1:$port/env.js")
	WANT=$want node -e '
		const vm = require("node:vm")
		const window = {}
		vm.runInNewContext(require("node:fs").readFileSync(0, "utf8"), { window })
		const got = JSON.stringify(window.__OGEN_CONFIG__, Object.keys(window.__OGEN_CONFIG__ ?? {}).sort())
		const want = JSON.stringify(JSON.parse(process.env.WANT), Object.keys(JSON.parse(process.env.WANT)).sort())
		if (got !== want) {
			console.error(`FAIL /env.js\n  got  ${got}\n  want ${want}`)
			process.exit(1)
		}
	' <<<"$body"
}

dev=$(start \
	-e DEV_TOOLS=1 \
	-e SENTRY_ENVIRONMENT=development \
	-e "SENTRY_DSN=$tricky" \
	-e SENTRY_TRACES_SAMPLE_RATE= \
	-e SENTRY_AUTH_TOKEN=must-not-leak \
	-e DATABASE_URL=must-not-leak \
	-e API_ORIGIN=api.invalid:8080)
expect_config "$dev" "$(
	TRICKY=$tricky node -e 'console.log(JSON.stringify({
		DEV_TOOLS: "1",
		SENTRY_ENVIRONMENT: "development",
		SENTRY_DSN: process.env.TRICKY,
	}))'
)"

if ! curl -fsS "http://127.0.0.1:$dev/" | grep -q '<script src="/env.js"></script>'; then
	echo 'FAIL index.html does not load /env.js' >&2
	exit 1
fi

prod=$(start)
expect_config "$prod" '{}'

echo "ok: $image serves /env.js from its environment, allow-listed and uncached"
