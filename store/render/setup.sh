#!/bin/bash
# Builds the throwaway web copy of the app used for the design renders and
# the store screenshots, outside the repo, then serves it on port 8723.
#   bash store/render/setup.sh [dir]     (default /tmp/shotlog-web)
# Then: node store/render/render.mjs      -> store/render/out/*.png
#       node store/screenshots.js         -> store/screenshots/*.png
# The copy aliases the native modules to quiet stand-ins (harness/): an
# in-memory SQLite on sql.js seeded from seed.mjs, the store with the planned
# prices and a 3-day trial, notifications, print and share as no-ops, a drawn
# stand-in for the iOS compact date picker, fixed iPhone safe areas, and a
# fixed clock (Sat Nov 14, 2026, 10 am New York). Nothing here ships.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
W="${1:-/tmp/shotlog-web}"
rm -rf "$W" && mkdir -p "$W"
(cd "$ROOT" && tar --exclude=.git --exclude=node_modules --exclude=store -cf - .) | (cd "$W" && tar xf -)
cd "$W"
npm ci --silent
npm install --no-save --silent react-native-web@0.21 react-dom@19.2.3 @expo/metro-runtime@~57 sql.js
mkdir -p harness public
cp "$HERE"/harness/*.js harness/
mv harness/metro.config.js metro.config.js
cp node_modules/sql.js/dist/sql-wasm.js node_modules/sql.js/dist/sql-wasm.wasm public/
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json"));p.main="harness/entry.js";fs.writeFileSync("package.json",JSON.stringify(p,null,2))'
npx expo export --platform web --output-dir dist
cd dist && python3 -m http.server 8723
