import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

// Extract the trusted, checked-in SVG paths without changing their geometry.
const parts = [];
for (const [side, count] of [
  ["anterior", 21],
  ["posterior", 19],
]) {
  const svg = readFileSync(
    new URL(`../public/images/pressure-sore-${side}.svg`, import.meta.url),
    "utf8",
  );
  assert.ok(svg.includes('viewBox="0 0 344.7 932.661"'));
  const paths = [...svg.matchAll(/<path\s+([^>]+)>/g)].map(([, attributes]) => {
    const attrs = Object.fromEntries(
      [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [
        key,
        value,
      ]),
    );
    assert.ok(attrs.id && attrs.d && attrs.transform);
    return { side, id: attrs.id, d: attrs.d, transform: attrs.transform };
  });
  assert.equal(paths.length, count);
  parts.push(...paths);
}
assert.equal(new Set(parts.map(({ id }) => id)).size, 40);
writeFileSync(
  new URL("../src/lib/bodyPaths.json", import.meta.url),
  JSON.stringify(parts, null, 2) + "\n",
);
