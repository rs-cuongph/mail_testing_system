#!/bin/sh
set -e

echo "⏳ Waiting for database..."

# DATABASE_URL format: postgresql://user:pass@host:port/dbname?schema=public
DB_URL="$DATABASE_URL"

# Parse connection info từ URL (đủ dùng cho docker-compose hiện tại)
DB_HOST=$(echo "$DB_URL" | sed 's|.*@\([^:]*\):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed 's|.*:\([0-9]*\)/.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed 's|.*/\([^?]*\).*|\1|')
DB_USER=$(echo "$DB_URL" | sed 's|.*://\([^:]*\):.*|\1|')

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

echo "📦 Running Prisma migrations..."
if ! npx prisma migrate deploy --config prisma/prisma.config.js; then
  echo ""
  echo "❌ Prisma migrate failed."
  echo "Nếu bạn đang dùng DB volume cũ (đã có sẵn tables theo schema cũ), hãy reset volume rồi chạy lại:"
  echo "  docker compose down -v"
  echo "  docker compose up -d --build"
  exit 1
fi

echo "🚀 Starting Mail Testing System backend..."
exec node dist/src/main
