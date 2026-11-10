import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const url = "http://localhost:3000";
const children = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function available() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok && (await response.text()).includes("AI Study Planner");
  } catch {
    return false;
  }
}
function openBrowser() {
  const browser = spawn("explorer.exe", [url], { windowsHide: true, stdio: "ignore" });
  browser.on("error", () => console.log(`Open this address in your browser: ${url}`));
  browser.unref();
}
function run(args) {
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.on("error", (error) => console.error(error.message));
  return child;
}
try {
  if (await available()) {
    openBrowser();
  } else {
    console.log("Starting AI Study Planner. Please keep this window open.");
    const database = run(["scripts/local-db.mjs"]);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Database startup timed out.")), 30000);
      let output = "";
      database.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (output.includes("Local PostgreSQL ready")) { clearTimeout(timer); resolve(); }
      });
      database.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Database exited (${code}).`)); });
    });
    const mode = existsSync(".next/BUILD_ID") ? "start" : "dev";
    const server = run(["node_modules/next/dist/bin/next", mode, "--hostname", "127.0.0.1"]);
    let ready = false;
    for (let i = 0; i < 90; i++) {
      if (await available()) { ready = true; break; }
      if (server.exitCode !== null) throw new Error("The application could not start. See the message above.");
      await sleep(500);
    }
    if (!ready) throw new Error(`Startup took too long. Try opening ${url} manually.`);
    console.log(`Ready: ${url}\nKeep this window open while using the site.`);
    openBrowser();
  }
} catch (error) {
  console.error(error.message);
  for (const child of children) child.kill();
  process.exitCode = 1;
}
