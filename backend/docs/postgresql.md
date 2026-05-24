# Migração futura para PostgreSQL

O projeto segue usando SQLite no desenvolvimento local para preservar os dados atuais em `prisma/dev.db`.

Para produção, o caminho recomendado é PostgreSQL.

## Subir PostgreSQL local

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

## Configurar ambiente

Copie `.env.postgres.example` para `.env` em um ambiente separado de produção/homologação.

```env
DATABASE_URL="postgresql://jetguard:jetguard_password@localhost:5432/jetguard?schema=public"
```

## Ajuste necessário no Prisma

No arquivo `prisma/schema.prisma`, alterar:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Depois executar:

```powershell
npx prisma migrate deploy
npx prisma generate
```

## Observação importante

Não altere o provider para PostgreSQL no ambiente atual sem antes subir o banco e validar backup dos dados do SQLite.
