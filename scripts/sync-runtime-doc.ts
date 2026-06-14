/**
 * Build the runtime documentation payload imported by /runtime.
 *
 * Source of truth: content/runtime-doc.md (hand-authored, example-driven).
 * Output:          content/runtime-doc.json  ({ markdown }) — imported by the
 *                  page so Next.js bundles it reliably (JSON safely escapes the
 *                  backticks and ${ } that fill the code samples).
 *
 *   pnpm tsx scripts/sync-runtime-doc.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const md = readFileSync(join(root, "content/runtime-doc.md"), "utf8").trim() + "\n";
writeFileSync(join(root, "content/runtime-doc.json"), JSON.stringify({ markdown: md }));

const sections = (md.match(/^## /gm) ?? []).length;
console.log(`✓ content/runtime-doc.json — ${md.length} bytes, ${sections} sections`);
