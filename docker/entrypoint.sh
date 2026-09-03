#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL não definida — abortando." >&2
  exit 1
fi

echo "Aplicando migrations pendentes do Prisma..."
npx prisma migrate deploy --schema=/app/backend/prisma/schema.prisma

exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
