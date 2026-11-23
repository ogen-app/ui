#!/usr/bin/env bash
# Carry a branch's catalogue changes made before the split (2026-11-23) onto
# the section files. It splits the catalogue at <base> and at <branch> the
# same way, diffs the two per section, and applies that to <target>.
#
#   scripts/catalogue-port.sh <repo> <branch> <base> <target resources dir>
#
# <base> must be develop as the branch last merged it, never an older merge
# base: a branch carrying commits develop squashed would otherwise "add" keys
# develop already has. So, on the branch:
#
#   1. merge the split commit's parent (develop just before it) and commit;
#   2. merge develop, and before committing it take develop's
#      src/i18n/resources/en.ts and es.ts (`git checkout --theirs`);
#   3. still before committing, so HEAD is step 1's commit:
#      scripts/catalogue-port.sh "$PWD" HEAD <split>^ src/i18n/resources
#      then prettier --write src/i18n/resources, typecheck, and commit.
#
# Delete this and catalogue-split.mjs once no branch predates the split.
set -euo pipefail
repo=$1 branch=$2 base=$3 target=$4
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
for side in base branch; do
  rev=$base; [ "$side" = branch ] && rev=$branch
  mkdir -p "$tmp/$side"
  for l in en es; do git -C "$repo" show "${rev}:src/i18n/resources/${l}.ts" > "$tmp/$side/$l.ts"; done
  node "$here/catalogue-split.mjs" "$tmp/$side" en en plain >/dev/null
  node "$here/catalogue-split.mjs" "$tmp/$side" es es typed >/dev/null
  rm "$tmp/$side/en/index.ts" "$tmp/$side/es/index.ts"
done
(cd "$tmp" && diff -ruN base branch > keys.patch) || true
echo "sections changed: $(grep -c '^+++ ' "$tmp/keys.patch" || true)"
# git apply never guesses that a hunk is reversed, unlike patch(1).
git -C "$target" apply -p1 --reject "$tmp/keys.patch"
rm -rf "$tmp"
