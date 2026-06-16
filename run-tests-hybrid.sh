#!/bin/bash
set -e

# Bitwarden Hybrid Compiler Test Runner Script (Refactored)
# Preprocesses and compiles targets using ngp -> tsgo, and runs tests.

PREPROCESSOR_DIR="${1:-/Users/arick/dev/primary/ng-hybrid-preprocessor}"
if [[ "$PREPROCESSOR_DIR" == "~"* ]]; then
  PREPROCESSOR_DIR="${PREPROCESSOR_DIR/#\~/$HOME}"
fi

echo "=== 0. Building and Installing Hybrid Preprocessor ==="
WORKSPACE_DIR=$(pwd)

echo "--> Compiling Preprocessor in $PREPROCESSOR_DIR..."
(cd "$PREPROCESSOR_DIR" && pnpm run bundle)

# Locate the generated tarball
TARBALL=$(find "$PREPROCESSOR_DIR" -maxdepth 1 -name "ng-hybrid-preprocessor-*.tgz" | head -n 1)
if [ -z "$TARBALL" ]; then
  echo "Error: Could not find generated tarball in $PREPROCESSOR_DIR"
  exit 1
fi
echo "--> Found preprocessor tarball: $TARBALL"

echo "--> Installing Preprocessor and TypeScript 7 preview locally..."
npm install --no-save --legacy-peer-deps "$TARBALL" @typescript/native-preview

echo "=== 1. Building all targets with ngp -> tsgo ==="
node scripts/build-hybrid.js

echo "=== 2. Running All Compiled Tests ==="
set +e
npx jest --config jest-compiled-all.config.json "${@:2}"
JEST_EXIT_CODE=$?

echo "============================================="
if [ $JEST_EXIT_CODE -eq 0 ]; then
  echo "SUCCESS: All compiled tests passed!"
  exit 0
else
  echo "FAILURE: Some compiled tests failed (Exit code: $JEST_EXIT_CODE)"
  exit $JEST_EXIT_CODE
fi
