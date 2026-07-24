import "dotenv/config";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $executeRawUnsafe(query: string): Promise<number>;
  [key: string]: any;
};

type ModelInfo = {
  name: string;
  dbName?: string | null;
  fields: Array<{
    name: string;
    dbName?: string | null;
    kind: string;
    type: string;
    isId?: boolean;
    relationFromFields?: string[];
  }>;
};

const backendRoot = path.resolve(__dirname, "..");
const prismaDir = path.join(backendRoot, "prisma");
const schemaPath = path.join(prismaDir, "schema.prisma");
const sqliteSchemaPath = path.join(prismaDir, "schema.sqlite.generated.prisma");
const sqliteClientOutput = path.join(prismaDir, ".generated", "sqlite-migration-client");
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

function runPrisma(args: string[], env: NodeJS.ProcessEnv = process.env) {
  execFileSync(npxBin, ["prisma", ...args], {
    cwd: backendRoot,
    env,
    stdio: "inherit",
  });
}

function sqliteSchemaFromPostgres(schema: string) {
  const withSqliteProvider = schema.replace(
    /provider\s*=\s*"postgresql"/,
    'provider = "sqlite"',
  );

  return withSqliteProvider.replace(/generator\s+client\s+\{([\s\S]*?)\}/, (block) => {
    if (block.includes("output")) return block;
    return block.replace(/\n\}/, `\n  output   = ".generated/sqlite-migration-client"\n}`);
  });
}

function delegateName(modelName: string) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function modelDependencies(model: ModelInfo) {
  return new Set(
    model.fields
      .filter((field) => field.kind === "object" && (field.relationFromFields || []).length > 0)
      .map((field) => field.type)
      .filter((dependency) => dependency !== model.name),
  );
}

function sortModelsByDependency(models: ModelInfo[]) {
  const pending = new Map(models.map((model) => [model.name, model]));
  const sorted: ModelInfo[] = [];

  while (pending.size > 0) {
    const ready = [...pending.values()].filter((model) =>
      [...modelDependencies(model)].every((dependency) => !pending.has(dependency)),
    );

    if (ready.length === 0) {
      sorted.push(...[...pending.values()].sort((a, b) => a.name.localeCompare(b.name)));
      break;
    }

    for (const model of ready) {
      sorted.push(model);
      pending.delete(model.name);
    }
  }

  return sorted;
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function copyModel(
  model: ModelInfo,
  sqlite: PrismaClientLike,
  postgres: PrismaClientLike,
) {
  const delegate = delegateName(model.name);
  const source = sqlite[delegate];
  const target = postgres[delegate];

  if (!source || !target) {
    throw new Error(`Delegate Prisma nao encontrado para o model ${model.name}.`);
  }

  const total = await source.count();
  if (total === 0) {
    console.log(`${model.name}: sem registros`);
    return;
  }

  const batchSize = 500;
  let migrated = 0;

  for (let skip = 0; skip < total; skip += batchSize) {
    const data = await source.findMany({
      orderBy: model.fields.some((field) => field.isId) ? { [model.fields.find((field) => field.isId)!.name]: "asc" } : undefined,
      skip,
      take: batchSize,
    });

    await target.createMany({ data, skipDuplicates: true });
    migrated += data.length;
  }

  const idField = model.fields.find((field) => field.isId && field.type === "Int");
  if (idField) {
    const aggregate = await target.aggregate({ _max: { [idField.name]: true } });
    const maxId = aggregate?._max?.[idField.name];
    if (typeof maxId === "number" && maxId > 0) {
      const tableName = quoteIdent(model.dbName || model.name);
      const columnName = idField.dbName || idField.name;
      await postgres.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence(${sqlString(tableName)}, ${sqlString(columnName)}), ${maxId}, true)`,
      );
    }
  }

  console.log(`${model.name}: ${migrated}/${total} registros processados`);
}

async function truncateTarget(postgres: PrismaClientLike, models: ModelInfo[]) {
  const tables = models
    .map((model) => quoteIdent(model.dbName || model.name))
    .join(", ");

  if (!tables) return;
  await postgres.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

async function validateCounts(
  models: ModelInfo[],
  sqlite: PrismaClientLike,
  postgres: PrismaClientLike,
) {
  const mismatches: string[] = [];

  for (const model of models) {
    const delegate = delegateName(model.name);
    const sourceCount = await sqlite[delegate].count();
    const targetCount = await postgres[delegate].count();

    if (targetCount < sourceCount) {
      mismatches.push(`${model.name}: origem=${sourceCount}, destino=${targetCount}`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Validacao de contagem falhou:\n${mismatches.join("\n")}`);
  }
}

async function main() {
  const sqliteDatabaseUrl = process.env.SQLITE_DATABASE_URL || "file:./dev.db";
  const postgresDatabaseUrl = process.env.DATABASE_URL || "";
  const truncate = process.argv.includes("--truncate");

  if (!postgresDatabaseUrl.startsWith("postgres")) {
    throw new Error("DATABASE_URL precisa apontar para PostgreSQL.");
  }

  fs.writeFileSync(
    sqliteSchemaPath,
    sqliteSchemaFromPostgres(fs.readFileSync(schemaPath, "utf8")),
  );

  try {
    console.log("Gerando Prisma Client para PostgreSQL...");
    runPrisma(["generate"], { ...process.env, DATABASE_URL: postgresDatabaseUrl });

    console.log("Gerando Prisma Client temporario para SQLite...");
    runPrisma(["generate", "--schema", sqliteSchemaPath], {
      ...process.env,
      DATABASE_URL: sqliteDatabaseUrl,
    });

    const { PrismaClient: PostgresClient, Prisma } = require("@prisma/client");
    const { PrismaClient: SqliteClient } = require(sqliteClientOutput);

    const postgres: PrismaClientLike = new PostgresClient({
      datasourceUrl: postgresDatabaseUrl,
    });
    const sqlite: PrismaClientLike = new SqliteClient({
      datasourceUrl: sqliteDatabaseUrl,
    });

    const models = sortModelsByDependency(Prisma.dmmf.datamodel.models as ModelInfo[]);

    await sqlite.$connect();
    await postgres.$connect();

    try {
      if (truncate) {
        console.log("Limpando tabelas do PostgreSQL antes da carga...");
        await truncateTarget(postgres, models);
      }

      for (const model of models) {
        await copyModel(model, sqlite, postgres);
      }

      await validateCounts(models, sqlite, postgres);
      console.log("Migracao concluida e contagens validadas.");
    } finally {
      await sqlite.$disconnect();
      await postgres.$disconnect();
    }
  } finally {
    fs.rmSync(sqliteSchemaPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
