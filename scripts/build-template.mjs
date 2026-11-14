import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "template-source.html");
let html = await readFile(sourcePath, "utf8");
// The saved page contains two translation extensions after the actual JD page.
const extensionStart = html.indexOf('<volc-translate ');
if (extensionStart >= 0) html = html.slice(0, extensionStart);
html = html.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\sdata-immersive-translate-[\w-]+=(?:"[^"]*"|'[^']*'|[^\s>]+)/g, '')
  .replace(/<meta\b[^>]*http-equiv=content-security-policy[^>]*>/gi, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<html\b[^>]*>/i, '<html lang="zh-CN">');
for (const token of ['RETURN_ADDRESS', 'RETURN_NAME', 'RETURN_PHONE']) {
  if (!html.includes(`{{${token}}}`)) throw new Error(`Missing template token: ${token}`);
}
html += '\n</body></html>\n';
const output = resolve(root, 'dist');
await mkdir(resolve(output, 'public'), { recursive: true });
await writeFile(resolve(output, 'template.html'), html, 'utf8');
for (const file of ['index.html', 'app.js', 'address-parser.js', 'styles.css']) {
  await copyFile(resolve(root, file), resolve(output, 'public', file));
}
const redirect = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/"><title>退货工具</title><a href="/">打开退货工具</a></html>\n';
await writeFile(resolve(output, 'public', '京东退货详情修改器.html'), redirect);
console.log(`Built dist: template ${Buffer.byteLength(html)} bytes; public assets ready`);
