-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "apelido" TEXT,
    "fotoPerfil" TEXT,
    "re" TEXT,
    "setor" TEXT,
    "cargo" TEXT,
    "empresa" TEXT,
    "unidade" TEXT,
    "perfilAcesso" TEXT NOT NULL DEFAULT 'USUARIO',
    "statusUsuario" TEXT NOT NULL DEFAULT 'ATIVO',
    "deveAlterarSenha" BOOLEAN NOT NULL DEFAULT true,
    "senhaAlteradaEm" DATETIME,
    "ultimoAcesso" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Usuario" ("apelido", "cargo", "createdAt", "email", "empresa", "fotoPerfil", "id", "nome", "perfilAcesso", "re", "senha", "setor", "statusUsuario", "ultimoAcesso", "unidade") SELECT "apelido", "cargo", "createdAt", "email", "empresa", "fotoPerfil", "id", "nome", "perfilAcesso", "re", "senha", "setor", "statusUsuario", "ultimoAcesso", "unidade" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
