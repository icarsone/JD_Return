import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "template-source.html");
const outputPath = resolve(root, "template.js");

const html = await readFile(sourcePath, "utf8");
const output = `window.JD_RETURN_TEMPLATE = ${JSON.stringify(html)};\n`;

await writeFile(outputPath, output, "utf8");
console.log(`Built template.js from template-source.html (${html.length} chars)`);
