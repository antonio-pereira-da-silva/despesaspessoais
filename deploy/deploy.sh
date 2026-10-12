#!/bin/sh
# Atualiza o Despesas Pessoais na VPS do SGAF com a versão do ramo "master" no GitHub.
# Chamado por deploy/verificar.sh (a cada 2 minutos) ou à mão.
set -eu
cd /opt/despesas
echo "== $(date '+%Y-%m-%d %H:%M:%S') atualizando"
git fetch --quiet origin master
git reset --quiet --hard origin/master
echo "versão: $(git log --oneline -1)"
docker run --rm -v /opt/despesas:/app -v despesas-npm:/root/.npm -w /app node:24 \
  sh -c 'npm ci --no-audit --no-fund && npm run build'
# Troca a pasta inteira de uma vez, para o Caddy nunca servir um site pela metade.
SITE=/opt/sgaf/caddy-extra/despesas
rm -rf "$SITE.novo" "$SITE.antigo"
cp -r dist "$SITE.novo"
[ -d "$SITE" ] && mv "$SITE" "$SITE.antigo"
mv "$SITE.novo" "$SITE"
rm -rf "$SITE.antigo"
echo "== pronto"
