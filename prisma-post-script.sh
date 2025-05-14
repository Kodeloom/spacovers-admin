#!/bin/bash

echo "Fixing '__dirname' and '__filename' in Prisma generated files..."

TARGET_DIR="./generated/prisma"

# find "$TARGET_DIR" -type f \( -name "*.js" -o -name "*.mjs" \) -exec sed -i \
#   "s|__dirname|new URL('.', import.meta.url).pathname|g" {} +

find "$TARGET_DIR" -type f \( -name "*.js" -o -name "*.mjs" \) \
  -exec sed -i 's/__dirname/new URL(import.meta.url).pathname/g' {} +

find "$TARGET_DIR" -type f \( -name "*.js" -o -name "*.mjs" \) \
  -exec sed -i 's/__filename/new URL(import.meta.url).pathname/g' {} +

echo "Prisma patching complete."