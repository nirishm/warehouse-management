#!/usr/bin/env bash
# scripts/test-integration.sh
# Runs the full backend test suite including HTTP contract tests.
#
# What it does:
#   1. Starts `pnpm dev` on port 3000 in the background
#   2. Polls http://localhost:3000 until the server is ready (max 60s)
#   3. Runs `vitest` with INTEGRATION=true (unskips describe.skipIf blocks)
#   4. Kills the dev server and exits with the test exit code
#
# Usage:
#   pnpm test:integration
#   pnpm test:integration -- --reporter=verbose   (pass extra vitest flags)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_URL="http://localhost:3000"
MAX_WAIT=60
DEV_PID=""

cleanup() {
  if [[ -n "$DEV_PID" ]]; then
    echo ""
    echo "→ Stopping dev server (PID $DEV_PID)..."
    kill "$DEV_PID" 2>/dev/null || true
    # Give child processes time to exit
    sleep 1
  fi
}
trap cleanup EXIT

cd "$PROJECT_ROOT"

# Kill any process already using port 3000 to avoid EADDRINUSE
if lsof -ti:3000 &>/dev/null; then
  echo "→ Port 3000 already in use — killing existing process..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "→ Starting Next.js dev server..."
pnpm dev --port 3000 &>/tmp/wareos-dev-server.log &
DEV_PID=$!

echo "→ Waiting for $SERVER_URL to be ready (max ${MAX_WAIT}s)..."
WAITED=0
until curl -sf "$SERVER_URL" -o /dev/null 2>/dev/null; do
  if [[ $WAITED -ge $MAX_WAIT ]]; then
    echo ""
    echo "✗ Server did not start within ${MAX_WAIT}s. Last server output:"
    tail -20 /tmp/wareos-dev-server.log
    exit 1
  fi
  printf "."
  sleep 2
  WAITED=$((WAITED + 2))
done
echo ""
echo "✓ Server ready after ${WAITED}s"
echo ""

echo "→ Running backend test suite (INTEGRATION=true)..."
INTEGRATION=true pnpm vitest --config vitest.backend.config.ts tests/backend/ "$@"
TEST_EXIT=$?

exit $TEST_EXIT
