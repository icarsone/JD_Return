import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "template-source.html");

let html = await readFile(sourcePath, "utf8");

const startCandidates = [
  '<div class="css-175oi2r r-akgwms',
  "<div class=css-175oi2r style=background-color:rgb(246,246,246)",
  '<div class="css-175oi2r r-eqz5dr'
];

function findStart(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return -1;

  let best = -1;
  for (const candidate of startCandidates) {
    const index = source.lastIndexOf(candidate, markerIndex);
    if (index > best) best = index;
  }
  return best;
}

function findMatchingDivEnd(source, start) {
  const divPattern = /<\/?div\b[^>]*>/g;
  divPattern.lastIndex = start;

  let depth = 0;
  let match;
  while ((match = divPattern.exec(source))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      return divPattern.lastIndex;
    }
  }

  return -1;
}

function removeBlock(source, marker) {
  const start = findStart(source, marker);
  if (start < 0) return { source, removed: false, chars: 0 };

  const end = findMatchingDivEnd(source, start);
  if (end < 0) {
    throw new Error(`Cannot find closing div for marker: ${marker}`);
  }

  return {
    source: source.slice(0, start) + source.slice(end),
    removed: true,
    chars: end - start
  };
}

const markers = ["你有新到的优惠券", "订单编号", "猜你想问:"];
const report = [];

for (const marker of markers) {
  const result = removeBlock(html, marker);
  html = result.source;
  report.push({ marker, removed: result.removed, chars: result.chars });
}

await writeFile(sourcePath, html, "utf8");
console.log(JSON.stringify(report, null, 2));
