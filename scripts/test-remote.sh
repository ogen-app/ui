#!/usr/bin/env bash
# Run the checks on another machine over SSH, so vitest, tsc and eslint don't
# load this one.
#
#   scripts/test-remote.sh                     # CI's gate: typecheck, lint, format:check, test
#   scripts/test-remote.sh test src/lib        # any package script, with its arguments
#   scripts/test-remote.sh exec vitest run -t 'MADE INTO'
#
# The working tree, uncommitted changes included and .gitignore respected, is
# rsynced to ~/src/ui-<checkout dir> on REMOTE_HOST (default: mac2, an
# ~/.ssh/config alias). Each checkout or worktree gets its own remote
# directory, so suites from several worktrees can run at once. The remote
# keeps its own node_modules (ignored, so never synced or deleted) and
# installs from the lockfile on every run, which is quick when nothing
# changed. The exit code is the checks'.
#
# The remote needs Node (see .nvmrc) on its login shell's PATH, and pnpm at
# the version package.json pins, which this installs into ~/.local (no sudo)
# when the remote has another or none.
set -euo pipefail

host=${REMOTE_HOST:-mac2}
root=$(git rev-parse --show-toplevel)
name=$(basename "$root")
dir="src/ui-$name"
pnpm_version=$(sed -nE 's/.*"packageManager": *"pnpm@([^"]+)".*/\1/p' "$root/package.json")

if [ $# -eq 0 ]; then
	run="pnpm typecheck && pnpm lint && pnpm format:check && pnpm test"
else
	run="pnpm $(printf '%q ' "$@")"
fi

# macOS's rsync (2.6.9) has no --mkpath and won't create missing parents.
ssh "$host" "mkdir -p ~/$dir"
rsync -az --delete \
	--exclude .git --exclude .claude \
	--filter=':- .gitignore' \
	"$root/" "$host:$dir/"

# The remote's own shell does the quoting from here: one script, run by zsh -l
# so Node is on PATH.
remote=$(
	cat <<EOF
set -e
cd ~/$dir
export PATH=~/.local/bin:\$PATH
if [ "\$(pnpm -v 2>/dev/null)" != "$pnpm_version" ]; then
	npm install -g --silent --prefix ~/.local "pnpm@$pnpm_version"
fi
CI=true pnpm install --frozen-lockfile --prefer-offline --reporter=silent
$run
EOF
)

# A terminal only when there is one: colours for a person, none for a pipe.
tty=-T
[ -t 1 ] && tty=-t
set +e
ssh "$tty" "$host" "zsh -lc $(printf '%q' "$remote")"
rc=$?
set -e
exit $rc
