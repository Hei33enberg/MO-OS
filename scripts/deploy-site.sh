#!/bin/sh
# Deploy the mo-os site (docs/index.html, docs/site.css, docs/assets/, docs/fonts/) to https://mot3r.com/mo-os/.
# Runs from a maintainer's machine. No CI.
#
#   MO_OS_HOSTS="user@node-a user@node-b" MO_OS_SSH_KEY=~/.ssh/key sh scripts/deploy-site.sh
#
# Each node serves the files from /srv/www/mo-os (the web server route for /mo-os/* lives with the hosted gate, not here).
set -eu

: "${MO_OS_HOSTS:?set MO_OS_HOSTS to the nodes, space separated}"
KEY_OPT=""
[ -n "${MO_OS_SSH_KEY:-}" ] && KEY_OPT="-i $MO_OS_SSH_KEY"

cd "$(dirname "$0")/.."
FILES="docs/index.html docs/site.css docs/assets docs/fonts"
for f in $FILES; do [ -e "$f" ] || { echo "missing $f" >&2; exit 1; }; done

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
SHA=$(git rev-parse --short HEAD)
PACK=$(mktemp -d)
mkdir -p "$PACK/mo-os"
cp -R docs/index.html docs/site.css docs/assets docs/fonts "$PACK/mo-os/"
rm -f "$PACK/mo-os/fonts/README.md"
printf '{"sha":"%s","deployed_at":"%s"}\n' "$SHA" "$STAMP" > "$PACK/mo-os/version.json"
tar -C "$PACK" -czf "$PACK/mo-os.tgz" mo-os

for h in $MO_OS_HOSTS; do
  echo "== $h"
  # shellcheck disable=SC2086
  scp -q $KEY_OPT "$PACK/mo-os.tgz" "$h:/tmp/mo-os-$STAMP.tgz"
  # shellcheck disable=SC2086
  ssh $KEY_OPT "$h" "set -e
    T=\$(mktemp -d); tar -xzf /tmp/mo-os-$STAMP.tgz -C \$T
    sudo -n install -d -m 0755 /srv/www/mo-os-releases
    sudo -n rm -rf /srv/www/mo-os-releases/$STAMP
    sudo -n cp -R \$T/mo-os /srv/www/mo-os-releases/$STAMP
    sudo -n chown -R root:root /srv/www/mo-os-releases/$STAMP
    sudo -n find /srv/www/mo-os-releases/$STAMP -type d -exec chmod 0755 {} +
    sudo -n find /srv/www/mo-os-releases/$STAMP -type f -exec chmod 0644 {} +
    if [ -d /srv/www/mo-os ] && [ ! -L /srv/www/mo-os ]; then sudo -n mv /srv/www/mo-os /srv/www/mo-os-releases/before-$STAMP; fi
    sudo -n ln -sfn /srv/www/mo-os-releases/$STAMP /srv/www/mo-os
    rm -rf \$T /tmp/mo-os-$STAMP.tgz
    readlink /srv/www/mo-os"
done
rm -rf "$PACK"
echo "deployed $SHA ($STAMP)"
