import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const tests = readdirSync(new URL("./", import.meta.url))
  .filter((file) => /(?:\.test\.tsx?|\.browser\.test\.mjs)$/.test(file))
  .map((file) => `apps/frontend/tests/${file}`);
const result = spawnSync(process.execPath, [
  "node_modules/tsx/dist/cli.mjs", "--tsconfig", "apps/frontend/tsconfig.json",
  "--test", "--test-concurrency=1", ...tests,
], { cwd: root, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
