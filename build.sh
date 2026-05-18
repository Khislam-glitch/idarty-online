#!/usr/bin/env bash
set -e

: "${SUPABASE_URL:?ERROR: SUPABASE_URL is not set}"
: "${SUPABASE_ANON_KEY:?ERROR: SUPABASE_ANON_KEY is not set}"

echo "🏗  Building into dist/ ..."
rm -rf dist && mkdir -p dist

# Copy everything from root except build artifacts
find . -maxdepth 1 \( -name "*.html" -o -name "*.js" -o -name "*.css" \) \
  -exec cp {} dist/ \;

# Inject env vars - using different delimiter since URLs contain slashes
sed -i.bak \
  -e "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g" \
  -e "s|%%SUPABASE_ANON_KEY%%|${SUPABASE_ANON_KEY}|g" \
  dist/app.js

# Remove backup files
rm -f dist/*.bak

echo "✅ Done"
