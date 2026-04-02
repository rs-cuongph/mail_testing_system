#!/bin/sh
set -e

echo "⏳ Syncing database schema..."
# prisma db push: áp dụng schema mà không cần migration files
# Phù hợp với Prisma 7 adapter pattern
DATABASE_URL="$DATABASE_URL" npx prisma db push --accept-data-loss 2>&1 || \
  echo "⚠️  DB push warning (có thể bỏ qua nếu schema đã đồng bộ)"

echo "🚀 Starting Mail Testing System backend..."
exec node dist/main
