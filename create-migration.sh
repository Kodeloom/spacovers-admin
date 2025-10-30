#!/bin/bash

# Create database migration for new fields and PrintQueue model
echo "Creating database migration..."
npx prisma migrate dev --name "add-po-tracking-and-print-queue"

echo "Migration created successfully!"