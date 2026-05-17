#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# build.sh  —  Injects env vars into src/ files → dist/
# Run by Netlify as the build command, and locally via:
#   source .env && bash build.sh
# ─────────────────────────────────────────────────────────────────
set -e

# Validate required variables are present
: "${SUPABASE_URL:?  ERROR: SUPABASE_URL is not set}"
: "${SUPABASE_ANON_KEY:?  ERROR: SUPABASE_ANON_KEY is not set}"

DIST="dist"
SRC="src"

echo "🏗  Building into $DIST/ ..."
rm -rf "$DIST"
mkdir -p "$DIST"

# Copy all source files into dist
cp -r "$SRC"/. "$DIST/"

# Inject env vars by replacing placeholder tokens in every JS file
# (sed -i works on both GNU and BSD/macOS with the '' trick)
find "$DIST" -name "*.js" | while read -r file; do
  sed -i.bak \
    -e "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g" \
    -e "s|%%SUPABASE_ANON_KEY%%|${SUPABASE_ANON_KEY}|g" \
    "$file"
  rm -f "$file.bak"
done

echo "✅ Build complete. Output in $DIST/"
