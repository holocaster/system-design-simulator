#!/usr/bin/env bash
set -euo pipefail

# Exemplo de deploy: ajuste os diretorios para o seu servidor antes de executar.
# Pull-based, sem rsync/scp de maquina local — AD-060 em .specs/STATE.md.
REPO_DIR="${REPO_DIR:-/srv/system-design-simulator}"
cd "$REPO_DIR"

echo "Executando git pull"
git checkout -- .
git pull

echo "Executando npm ci"
npm ci

echo "Executando npm run build"
rm -rf dist/
npm run build

APP_ROOT="/var/www/example.com"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"

mkdir -p "$RELEASES_DIR"

if [ ! -f dist/index.html ]; then
  echo "Build esperado em dist/index.html mas o arquivo nao foi encontrado."
  exit 1
fi

DEPLOY_ID="${DEPLOYMENT_ID:-manual-$(date +%Y%m%d%H%M%S)}"
RELEASE_DIR="$RELEASES_DIR/$DEPLOY_ID"

mkdir -p "$RELEASE_DIR"
cp -a dist/. "$RELEASE_DIR"/

sudo nginx -t

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

sudo systemctl reload nginx

echo "Deploy concluido: $RELEASE_DIR -> $CURRENT_LINK"
