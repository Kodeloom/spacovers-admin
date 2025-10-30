#!/bin/bash

# Generate Prisma schema from ZenStack
echo "Generating Prisma schema from ZenStack..."
npx zenstack generate

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo "Schema generation completed!"