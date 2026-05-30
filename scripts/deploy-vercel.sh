#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v vercel >/dev/null 2>&1; then
  echo "Using npx vercel..."
  VERCEL="npx vercel"
else
  VERCEL="vercel"
fi

if ! $VERCEL whoami >/dev/null 2>&1; then
  echo "Not logged in to Vercel. Run: npx vercel login"
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env.local
set +a

REQUIRED=(
  TURSO_DATABASE_URL
  TURSO_AUTH_TOKEN
  BOX_CLIENT_ID
  BOX_CLIENT_SECRET
  BOX_ENTERPRISE_ID
)

for var in "${REQUIRED[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing $var in .env.local"
    exit 1
  fi
done

BOX_MEMES_FOLDER_ID="${BOX_MEMES_FOLDER_ID:-0}"

add_env() {
  local name="$1"
  local value="$2"
  local env="$3"

  printf '%s' "$value" | $VERCEL env add "$name" "$env" --force >/dev/null 2>&1 || \
    printf '%s' "$value" | $VERCEL env add "$name" "$env" >/dev/null
  echo "  set $name ($env)"
}

echo "Linking Vercel project (if needed)..."
$VERCEL link --yes 2>/dev/null || $VERCEL link

echo "Setting environment variables..."
for env in production preview; do
  echo "  [$env]"
  add_env TURSO_DATABASE_URL "$TURSO_DATABASE_URL" "$env"
  add_env TURSO_AUTH_TOKEN "$TURSO_AUTH_TOKEN" "$env"
  add_env BOX_CLIENT_ID "$BOX_CLIENT_ID" "$env"
  add_env BOX_CLIENT_SECRET "$BOX_CLIENT_SECRET" "$env"
  add_env BOX_ENTERPRISE_ID "$BOX_ENTERPRISE_ID" "$env"
  add_env BOX_MEMES_FOLDER_ID "$BOX_MEMES_FOLDER_ID" "$env"
done

echo "Deploying to production..."
$VERCEL --prod --yes

echo ""
echo "Done. Open the production URL printed above."
