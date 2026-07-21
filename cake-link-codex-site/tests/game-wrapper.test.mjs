import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("syncs the complete playable Cake Link runtime", async () => {
  const index = await readFile(new URL("public/game/index.html", projectRoot), "utf8");
  assert.match(index, /CAKE LINK/);
  assert.match(index, /engine\.js/);
  assert.match(index, /mechanics\.js/);
  assert.match(index, /motion\.js/);
  assert.match(index, /app\.js/);

  await Promise.all([
    "editor.html",
    "editor.js",
    "editor.css",
    "simulator.js",
    "mechanics.js",
    "stages.js",
    "styles.css",
    "og.png",
  ].map((file) => access(new URL(`public/game/${file}`, projectRoot))));
});

test("keeps the Sites wrapper product-specific", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
  ]);

  assert.match(page, /redirect\("\/game\/index\.html"\)/);
  assert.match(layout, /케이크 링크/);
  assert.match(packageJson, /cake-link-codex-site/);
  assert.doesNotMatch(page + layout + packageJson, /SkeletonPreview|codex-preview|react-loading-skeleton/);
});
