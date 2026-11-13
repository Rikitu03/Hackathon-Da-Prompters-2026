import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function buildKnowledge(markdown) {
  const headings = [...markdown.matchAll(/^## (.+) \{#([a-z0-9-]+)\}\r?$/gm)];
  if (!headings.length) throw new Error("The product guide needs stable section IDs.");
  const seen = new Set();
  const passages = [];
  headings.forEach((heading, index) => {
    const [, title, id] = heading;
    if (seen.has(id)) throw new Error(`Duplicate section ID: ${id}`);
    seen.add(id);
    let text = markdown.slice(heading.index + heading[0].length, headings[index + 1]?.index).trim();
    const tagLine = /^<!-- tags: (.+) -->\r?\n?/m.exec(text);
    if (!tagLine) throw new Error(`Missing search tags: ${id}`);
    const tags = tagLine[1].split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean);
    text = text.replace(tagLine[0], "").replace(/\s+/g, " ").trim();
    if (!text) throw new Error(`Empty section: ${id}`);
    let part = 0;
    while (text) {
      let cut = Math.min(900, text.length);
      if (cut < text.length) {
        const boundary = text.lastIndexOf(" ", cut);
        if (boundary > 450) cut = boundary;
      }
      passages.push({ sourceId: `product-help:${id}:${++part}`, title: `GabayIskolar product guide — ${title}`, tags, content: text.slice(0, cut).trim() });
      text = text.slice(cut).trim();
    }
  });
  return { version: 1, sourceChecksum: createHash("sha256").update(markdown.replace(/\r\n/g, "\n")).digest("hex"), passages };
}
export const serializeKnowledge = markdown => JSON.stringify(buildKnowledge(markdown), null, 2) + "\n";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = new URL("../docs/PRODUCT_HELP.md", import.meta.url);
  const output = new URL("../src/lib/product-help/knowledge.generated.json", import.meta.url);
  const generated = serializeKnowledge(await readFile(source, "utf8"));
  if (process.argv.includes("--check")) {
    const existing = await readFile(output, "utf8").catch(() => "");
    if (existing.replace(/\r\n/g, "\n") !== generated) {
      console.error("Product knowledge is outdated. Run npm run kb:build and commit the guide and index together.");
      process.exitCode = 1;
    } else console.log("Product knowledge matches the reviewed guide.");
  } else {
    await writeFile(output, generated);
    console.log("Built the reviewed product knowledge index.");
  }
}
