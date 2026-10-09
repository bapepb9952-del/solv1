import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

// Run the installed JS launcher directly; works on Windows without a shell/.cmd.
// Never truncate the original types when the CLI fails.
const require = createRequire(import.meta.url);
const packagePath = require.resolve("supabase/package.json");
const cliPackage = JSON.parse(readFileSync(packagePath, "utf8")) as { bin: { supabase: string } };
const launcher = resolve(dirname(packagePath), cliPackage.bin.supabase);
const output = execFileSync(process.execPath, [launcher, "gen", "types", "typescript", "--local"], { encoding: "utf8" });
if (!output.includes("export type Database")) throw new Error("O Supabase não retornou os tipos esperados.");
writeFileSync("src/lib/supabase/database.types.ts", output);
console.log("Tipos atualizados a partir do Supabase local.");
