import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "node_modules/next/dist/client/dev/hot-reloader/pages/hot-reloader-pages.js");
if (!fs.existsSync(target)) { console.warn("[patch-next-hmr] skip"); process.exit(0); }
const src = fs.readFileSync(target, "utf8");
if (src.includes("if (!router?.components) return")) { console.log("[patch-next-hmr] already applied"); process.exit(0); }
const needle = "const routeInfo = window.next.router.components[window.next.router.pathname];";
if (!src.includes(needle)) { console.warn("[patch-next-hmr] pattern missing"); process.exit(0); }
const next = src.replace(needle, `const router = window.next?.router;\n        if (!router?.components) return;\n        const routeInfo = router.components[router.pathname];`)
  .replace("const appComponent = window.next.router.components['/_app']?.Component;", "const appComponent = router.components['/_app']?.Component;");
fs.writeFileSync(target, next);
console.log("[patch-next-hmr] patched");
