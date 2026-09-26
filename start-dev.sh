#!/usr/bin/env bash
# JUGAAD - macOS / Linux 1-click launcher
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found. Install it from https://nodejs.org/ (v18+)"; exit 1
fi
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."; npm install || exit 1
fi
echo "Game URL: http://localhost:5173/  (Ctrl + C to stop)"
npx vite --open --port 5173 --host
