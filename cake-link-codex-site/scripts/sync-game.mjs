import { copyFile, mkdir, rm } from "node:fs/promises";

const sourceRoot = new URL("../../cake-link/", import.meta.url);
const targetRoot = new URL("../public/game/", import.meta.url);
const runtimeFiles = [
  "index.html",
  "editor.html",
  "app.js",
  "engine.js",
  "mechanics.js",
  "stages.js",
  "motion.js",
  "simulator.js",
  "editor.js",
  "styles.css",
  "editor.css",
  "og.png",
];

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });
await Promise.all(runtimeFiles.map((file) =>
  copyFile(new URL(file, sourceRoot), new URL(file, targetRoot))
));

console.log(`Synced ${runtimeFiles.length} Cake Link runtime files.`);
