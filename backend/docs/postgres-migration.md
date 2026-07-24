# Migracao SQLite para PostgreSQL

Este projeto agora usa PostgreSQL no Prisma. O arquivo SQLite local nao deve ser apagado: ele e a fonte para a carga inicial no PostgreSQL.

## Passo a passo

1. Suba um PostgreSQL local ou de homologacao:

```bash
docker compose -f docker-compose.postgres.yml up -d
```

2. Configure o backend:

```bash
cp .env.postgres.example .env
```

No PowerShell:

```powershell
Copy-Item .env.postgres.example .env
```

3. Ajuste `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_PASSWORD` e demais variaveis sensiveis no `.env`.

4. Crie o schema no PostgreSQL:

```bash
npm run db:migrate
```

5. Copie os dados do SQLite para o PostgreSQL:

```bash
SQLITE_DATABASE_URL="file:./dev.db" npm run db:migrate:sqlite-to-postgres
```

No PowerShell:

```powershell
$env:SQLITE_DATABASE_URL = "file:./dev.db"
npm run db:migrate:sqlite-to-postgres
```

Para recarregar um banco PostgreSQL de homologacao do zero, use:

```bash
SQLITE_DATABASE_URL="file:./dev.db" npm run db:migrate:sqlite-to-postgres -- --truncate
```

No PowerShell:

```powershell
$env:SQLITE_DATABASE_URL = "file:./dev.db"
npm run db:migrate:sqlite-to-postgres -- --truncate
```

O script copia os models em ordem de dependencia, preserva IDs, ajusta sequencias do PostgreSQL e falha se alguma tabela ficar com menos registros no destino do que na origem.

## Arquivos locais

Nao versionar:

- `backend/prisma/*.db`
- `backend/uploads/`
- `backend/backups/`
- clients temporarios gerados em `backend/prisma/.generated/`

Uploads e backups devem ser preservados no servidor por rotina operacional propria, fora do Git.
