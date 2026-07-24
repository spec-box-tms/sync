#!/usr/bin/env sh

set -e

rm -rf dist
npm --prefix ./serve-ui run build
mkdir -p dist
mv serve-ui/dist/serve-ui/browser dist/ui
tsc --build tsconfig.json
