import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
// PostgreSQL on Windows cannot initialize from paths containing Cyrillic.
// Keep development binaries and cluster in the user's ASCII temporary directory.
const win = process.platform === "win32";
const directory = path.resolve(
  process.env.LOCAL_DB_DIR ||
    (win
      ? path.join(tmpdir(), "ai-study-planner-local", "data")
      : ".local-data/postgres"),
);
mkdirSync(path.dirname(directory), { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  user: "planner",
  password: "local-development-only",
  port: 54329,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
  onError: (message) => console.error(String(message)),
});
let server;
if (win) {
  const binary = await import("@embedded-postgres/windows-x64");
  const native = path.join(tmpdir(), "ai-study-planner-local", "native");
  if (!existsSync(path.join(native, "bin", "postgres.exe")))
    cpSync(path.dirname(path.dirname(binary.postgres)), native, {
      recursive: true,
    });
  if (!existsSync(path.join(directory, "PG_VERSION"))) {
    const passwordFile = path.join(path.dirname(directory), "init-password");
    writeFileSync(passwordFile, "local-development-only\n");
    try {
      const init = spawnSync(
        path.join(native, "bin", "initdb.exe"),
        [
          "-D",
          directory,
          "-U",
          "planner",
          `--pwfile=${passwordFile}`,
          "--auth=scram-sha-256",
          "--encoding=UTF8",
          "--locale=C",
        ],
        { windowsHide: true, encoding: "utf8" },
      );
      if (init.status !== 0) throw new Error(init.stderr || init.stdout);
    } finally {
      rmSync(passwordFile, { force: true });
    }
  }
  server = spawn(
    path.join(native, "bin", "postgres.exe"),
    ["-D", directory, "-p", "54329", "-h", "127.0.0.1"],
    { windowsHide: true, stdio: "ignore" },
  );
  let ready = false;
  for (let i = 0; i < 40; i++) {
    const probe = pg.getPgClient();
    try {
      await probe.connect();
      await probe.end();
      ready = true;
      break;
    } catch {
      await probe.end().catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!ready) throw new Error("Local PostgreSQL did not become ready.");
} else {
  if (!existsSync(path.join(directory, "PG_VERSION"))) await pg.initialise();
  await pg.start();
}
const client = pg.getPgClient();
await client.connect();
const found = await client.query(
  "SELECT 1 FROM pg_database WHERE datname='studyplanner'",
);
if (!found.rowCount) await client.query("CREATE DATABASE studyplanner");
await client.end();
if (!existsSync(".env"))
  writeFileSync(
    ".env",
    `DATABASE_URL="postgresql://planner:local-development-only@127.0.0.1:54329/studyplanner?schema=public"\nNEXTAUTH_URL="http://localhost:3000"\nNEXTAUTH_SECRET="${randomBytes(48).toString("hex")}"\nCRON_SECRET="${randomBytes(32).toString("hex")}"\nOPENAI_API_KEY=""\nOPENAI_MODEL="gpt-4.1-mini"\n`,
  );
console.log(
  "Local PostgreSQL ready on 127.0.0.1:54329. Keep this process open.",
);
async function stop() {
  if (server) {
    spawnSync(
      path.join(
        tmpdir(),
        "ai-study-planner-local",
        "native",
        "bin",
        "pg_ctl.exe",
      ),
      ["-D", directory, "stop", "-m", "fast"],
      { windowsHide: true, stdio: "ignore" },
    );
  } else await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
