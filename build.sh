#!/bin/bash
set -euo pipefail

echo "🔧 Building إدارتي أونلاين..."

if [ -z "${SUPABASE_URL:-}" ]; then
  echo "❌ Error: SUPABASE_URL is not set"
  exit 1
fi

if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "❌ Error: SUPABASE_ANON_KEY is not set"
  exit 1
fi

rm -rf dist
mkdir -p dist

cp netlify.toml dist/
cp *.html dist/
cp *.js dist/

for file in dist/*.html dist/*.js; do
  if [ -f "$file" ]; then
    sed -i "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g" "$file"
    sed -i "s|%%SUPABASE_ANON_KEY%%|${SUPABASE_ANON_KEY}|g" "$file"
  fi
done

cp dist/public.html dist/index.html

echo "✅ Build complete. Ready for deployment."

