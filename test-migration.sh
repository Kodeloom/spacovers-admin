#!/bin/bash

# Test the database migration
echo "Testing database migration..."

# Check if we can connect to the database
npx prisma db push --accept-data-loss

# Validate the schema
npx prisma validate

# Generate client to ensure everything works
npx prisma generate

echo "Migration test completed!"