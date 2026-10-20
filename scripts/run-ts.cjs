// Runs a TypeScript script with the project's "@/…" import alias (via jiti).
// Usage: node scripts/run-ts.cjs scripts/check-run-replay.ts
const path = require("path");
const jiti = require("jiti")(__filename, {
  alias: { "@": path.join(__dirname, "..", "src") },
  interopDefault: true,
});
jiti(path.resolve(process.argv[2]));
