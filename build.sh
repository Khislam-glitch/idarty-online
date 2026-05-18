#!/usr/bin/env bash
set -e

: "${SUPABASE_URL:?ERROR: SUPABASE_URL is not set}"
: "${SUPABASE_ANON_KEY:?ERROR: SUPABASE_ANON_KEY is not set}"

echo "🏗  Building into dist/ ..."
rm -rf dist && mkdir -p dist

# List files before copying (for debugging)
echo "Files found in root:"
ls -la *.html *.js 2>/dev/null || echo "No files found!"

# Copy files
cp -v *.html *.js dist/ 2>/dev/null || echo "Copy failed!"

# Inject env vars into app.js
if [ -f "dist/app.js" ]; then
  echo "Injecting environment variables into app.js..."
  sed -i "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g" dist/app.js
  sed -i "s|%%SUPABASE_ANON_KEY%%|${SUPABASE_ANON_KEY}|g" dist/app.js
  echo "✅ Variables injected"
else
  echo "❌ dist/app.js not found!"
  exit 1
fi

echo "✅ Done"
echo "Files in dist:"
ls -la dist/
