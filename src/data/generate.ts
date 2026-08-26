import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { validateGameData } from "./validation.js";

const rawPath = resolve(process.cwd(), "src/data/raw/GAME_DATA_v4.json");
const generatedPath = resolve(process.cwd(), "src/data/generated/game-data.ts");
const checkOnly = process.argv.includes("--check");
const raw = await readFile(rawPath, "utf8");
const data: unknown = JSON.parse(raw);
const report = validateGameData(data);

if (!report.valid) {
  console.error(JSON.stringify(report.issues, null, 2));
  process.exitCode = 1;
} else {
  const sourceHash = createHash("sha256").update(raw).digest("hex");
  const output = `// Generated from src/data/raw/GAME_DATA_v4.json. Do not edit.\n` +
    `export const GAME_DATA_SOURCE_HASH = "${sourceHash}" as const;\n` +
    `export const GAME_DATA_CONTENT_HASH = "${report.contentHash}" as const;\n` +
    `export const GAME_DATA = ${JSON.stringify(data, null, 2)} as const;\n`;
  if (checkOnly) {
    const existing = await readFile(generatedPath, "utf8").catch(() => "");
    if (existing !== output) {
      console.error("Generated runtime data is stale. Run pnpm data:generate.");
      process.exitCode = 1;
    }
  } else {
    await mkdir(dirname(generatedPath), { recursive: true });
    await writeFile(generatedPath, output);
    console.log(`Data certified. Content hash: ${report.contentHash}`);
  }
}
