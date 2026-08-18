import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  "node_modules/next/dist/client/dev/hot-reloader/pages/hot-reloader-pages.js",
  "node_modules/next/dist/esm/client/dev/hot-reloader/pages/hot-reloader-pages.js",
].map((rel) => path.join(root, rel));

const needle =
  "const routeInfo = window.next.router.components[window.next.router.pathname];";
const replacement = `const router = window.next?.router;
        if (!router?.components) return;
        const routeInfo = router.components[router.pathname];`;
const appNeedle =
  "const appComponent = window.next.router.components['/_app']?.Component;";
const appReplacement =
  "const appComponent = router.components['/_app']?.Component;";

let patched = 0;
let skipped = 0;

for (const target of targets) {
  if (!fs.existsSync(target)) {
    console.warn(`[patch-next-hmr] skip missing ${path.relative(root, target)}`);
    skipped += 1;
    continue;
  }

  const src = fs.readFileSync(target, "utf8");
  if (src.includes("if (!router?.components) return")) {
    console.log(`[patch-next-hmr] already applied ${path.relative(root, target)}`);
    skipped += 1;
    continue;
  }

  if (!src.includes(needle)) {
    console.warn(`[patch-next-hmr] pattern missing ${path.relative(root, target)}`);
    skipped += 1;
    continue;
  }

  const next = src.replace(needle, replacement).replace(appNeedle, appReplacement);
  fs.writeFileSync(target, next);
  console.log(`[patch-next-hmr] patched ${path.relative(root, target)}`);
  patched += 1;
}

if (patched === 0 && skipped === targets.length) {
  // Nothing to do — already patched or missing patterns.
}
