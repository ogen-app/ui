#!/usr/bin/env bash
# Run the checks on another machine over SSH, so vitest, tsc and eslint don't
# load this one.
#
#   scripts/test-remote.sh                     # CI's gate: typecheck, lint, format:check, test
#   scripts/test-remote.sh test src/lib        # any package script, with its arguments
#   scripts/test-remote.sh exec vitest run -t 'MADE INTO'
#
# The working tree, uncommitted changes included and .gitignore and
# .git/info/exclude respected, is rsynced to ~/src/ui-<checkout dir> on REMOTE_HOST (default: mac2, an
# ~/.ssh/config alias). Each checkout or worktree gets its own remote
# directory, so suites from several worktrees can run at once. The remote
# keeps its own node_modules (never synced, never deleted) and
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
	# Every check runs, as CI's steps do, so one run reports everything wrong.
	run='rc=0; for s in typecheck lint format:check test; do pnpm "$s" || rc=1; done; exit $rc'
else
	run="pnpm $(printf '%q ' "$@")"
fi

# What goes is what git would see: .gitignore, and this clone's own
# .git/info/exclude — the place for local strays (a sketch at the root) that
# CI never sees and format:check would trip on. Excluded paths are left alone
# on the remote, which is what keeps its node_modules; macOS's openrsync
# ignores protect rules, so --delete-excluded would take those with it. So a
# stray excluded after it was synced stays there until removed by hand.
filters=(--exclude .git --exclude .claude --exclude /node_modules/)
exclude=$(git rev-parse --git-path info/exclude)
[ -f "$exclude" ] && filters+=(--exclude-from="$exclude")
filters+=(--filter=':- .gitignore')

# macOS's rsync has no --mkpath and won't create missing parents.
ssh "$host" "mkdir -p ~/$dir"
rsync -az --delete "${filters[@]}" "$root/" "$host:$dir/"

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
