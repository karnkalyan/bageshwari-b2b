import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

function readSecret(name) {
  const fileName = `${name}_FILE`;
  const directValue = process.env[name];
  const secretPath = process.env[fileName];

  if (directValue && secretPath) {
    throw new Error(`Set either ${name} or ${fileName}, not both.`);
  }

  if (!secretPath) return directValue;

  const value = readFileSync(secretPath, "utf8").trim();
  if (!value) throw new Error(`${fileName} points to an empty secret.`);

  process.env[name] = value;
  delete process.env[fileName];
  return value;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function resolveDatabaseUrl() {
  const configuredUrl = readSecret("DATABASE_URL");
  if (configuredUrl) return;

  const password = readSecret("DATABASE_PASSWORD");
  if (!password) {
    throw new Error("DATABASE_URL_FILE or DATABASE_PASSWORD_FILE is required.");
  }

  const host = required("DATABASE_HOST");
  const port = required("DATABASE_PORT");
  const user = required("DATABASE_USER");
  const database = required("DATABASE_NAME");

  if (!/^\d+$/.test(port)) throw new Error("DATABASE_PORT must be numeric.");

  const url = new URL("mysql://localhost");
  url.hostname = host;
  url.port = port;
  url.username = user;
  url.password = password;
  url.pathname = `/${encodeURIComponent(database)}`;
  process.env.DATABASE_URL = url.toString();
}

function resolveRuntimeSecrets() {
  resolveDatabaseUrl();
  readSecret("AUTH_SECRET");
  readSecret("SEED_PASSWORD");

  if (process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = process.env.AUTH_URL;
  }
}

resolveRuntimeSecrets();

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("A container command is required.");

const child = spawn(command, args, {
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`Unable to start ${command}:`, error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
