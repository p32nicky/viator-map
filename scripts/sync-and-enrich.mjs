/**
 * Run Viator sync then enrichment in one command.
 *
 * Usage:
 *   node scripts\sync-and-enrich.mjs
 */
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run("node", ["scripts/viator-sync.mjs"]);
run("node", ["scripts/enrich-coordinates.mjs"]);
