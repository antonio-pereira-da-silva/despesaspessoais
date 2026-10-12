#!/bin/sh
# Roda a cada 2 minutos (timer do systemd despesas-atualizar.timer): se o ramo "master" mudou, atualiza.
set -eu
cd /opt/despesas
git fetch --quiet origin master
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" ] && [ -d /opt/sgaf/caddy-extra/despesas ] && exit 0
exec /bin/sh /opt/despesas/deploy/deploy.sh
