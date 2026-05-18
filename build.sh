#!/usr/bin/env bash
set -e

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in Netlify environment variables."
  exit 1
fi

rm -rf dist
mkdir dist

cp *.html *.js dist/

# Replace placeholders safely using a temp file
sed "s|%%SUPABASE_URL%%|$SUPABASE_URL|g; s|%%SUPABASE_ANON_KEY%%|$SUPABASE_ANON_KEY|g" dist/app.js > dist/app.js.tmp
mv dist/app.js.tmp dist/app.js