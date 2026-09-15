const net = require("net");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");

const mysqlHost = process.env.DEV_MYSQL_HOST || "localhost";
const mysqlPort = Number(process.env.DEV_MYSQL_PORT || 3306);
const hostsTeste = Array.from(new Set([mysqlHost, "127.0.0.1", "::1"]));
const mysqlExe =
  process.env.DEV_MYSQL_EXE ||
  "C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin\\mysqld.exe";
const mysqlIni =
  process.env.DEV_MYSQL_INI ||
  "C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\my.ini";

function testarHost(host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: mysqlPort });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

async function portaDisponivel() {
  for (const host of hostsTeste) {
    if (await testarHost(host)) return true;
  }
  return false;
}

async function aguardarMysql() {
  for (let tentativa = 1; tentativa <= 30; tentativa += 1) {
    if (await portaDisponivel()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function iniciarMysql() {
  if (!fs.existsSync(mysqlExe) || !fs.existsSync(mysqlIni)) {
    console.warn("[dev] MySQL Laragon nao encontrado. Verifique DEV_MYSQL_EXE/DEV_MYSQL_INI.");
    return;
  }

  if (process.platform === "win32") {
    spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Start-Process",
        "-FilePath",
        mysqlExe,
        "-ArgumentList",
        `--defaults-file=${mysqlIni}`,
        "-WindowStyle",
        "Hidden",
      ],
      { stdio: "ignore", windowsHide: true },
    );
    return;
  }

  const processo = spawn(mysqlExe, [`--defaults-file=${mysqlIni}`], {
    detached: true,
    stdio: "ignore",
  });
  processo.unref();
}

function iniciarBackend() {
  const comando = process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/c", "npm", "run", "dev:server"]
      : ["run", "dev:server"];
  const servidor = spawn(comando, args, {
    stdio: "inherit",
    shell: false,
  });

  servidor.on("exit", (codigo) => process.exit(codigo || 0));
}

(async () => {
  if (!(await portaDisponivel())) {
    console.log(`[dev] MySQL nao esta respondendo em ${mysqlHost}:${mysqlPort}. Iniciando Laragon MySQL...`);
    iniciarMysql();
  }

  if (!(await aguardarMysql())) {
    console.error(`[dev] MySQL nao respondeu em ${mysqlHost}:${mysqlPort}.`);
    console.error("[dev] Confirme se ha espaco em disco e se o Laragon consegue iniciar o MySQL.");
    process.exit(1);
  }

  console.log("[dev] MySQL pronto. Iniciando backend...");
  iniciarBackend();
})();
