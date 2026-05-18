#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# build.sh  —  Injects env vars into source files → dist/
# Works whether files are in src/ or at the repo root.
# ─────────────────────────────────────────────────────────────────
set -e

# Validate required variables are present
: "${SUPABASE_URL:?  ERROR: SUPABASE_URL is not set}"
: "${SUPABASE_ANON_KEY:?  ERROR: SUPABASE_ANON_KEY is not set}"

DIST="dist"

echo "🏗  Building into $DIST/ ..."
rm -rf "$DIST"
mkdir -p "$DIST"

# ── Copy source files: use src/ if it exists, otherwise repo root ──
if [ -d "src" ]; then
  echo "📂 Source: src/"
  cp -r src/. "$DIST/"
else
  echo "📂 Source: repo root"
  # Copy all HTML, JS, CSS files from root
  find . -maxdepth 1 \
    \( -name "*.html" -o -name "*.js" -o -name "*.css" \) \
    ! -name "." \
    -exec cp {} "$DIST/" \;
fi

# ── Inject env vars into all JS files in dist/ ────────────────────
find "$DIST" -name "*.js" | while read -r file; do
  sed -i.bak \
    -e "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g" \
    -e "s|%%SUPABASE_ANON_KEY%%|${SUPABASE_ANON_KEY}|g" \
    "$file"
  rm -f "$file.bak"
done

echo "✅ Build complete. Output in $DIST/"
