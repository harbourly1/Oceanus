#!/bin/sh
set -e

echo "Running Prisma db push (create/update schema)..."
npx prisma db push --skip-generate

echo "Running database seed..."
npx prisma db seed || echo "Seed skipped or already done"

echo "Starting NestJS API..."
exec node dist/src/main
