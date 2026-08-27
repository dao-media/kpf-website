const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.NEXT_PUBLIC_WORDPRESS_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://kpf.dreamhosters.com";

const emptyPolyfill = path.join(__dirname, "empty-polyfill.js");
const nextConfig = require("../../next.config.js");

describe("Next polyfill-module alias", () => {
  it("stubs Next's Baseline polyfill module for turbopack and webpack", () => {
    const aliases = nextConfig.turbopack?.resolveAlias || {};
    assert.equal(
      aliases["../build/polyfills/polyfill-module"],
      "./src/lib/empty-polyfill.js",
    );
    assert.equal(
      aliases["next/dist/build/polyfills/polyfill-module"],
      "./src/lib/empty-polyfill.js",
    );

    const config = { resolve: { alias: {} } };
    const out = nextConfig.webpack(config);
    assert.equal(
      out.resolve.alias["../build/polyfills/polyfill-module"],
      emptyPolyfill,
    );
    assert.equal(
      out.resolve.alias["next/dist/build/polyfills/polyfill-module"],
      emptyPolyfill,
    );
  });

  it("keeps the stub free of polyfill implementations", () => {
    const src = fs.readFileSync(emptyPolyfill, "utf8");
    assert.equal(/Array\.prototype\.(at|flat)\s*=/.test(src), false);
    assert.equal(/Object\.(fromEntries|hasOwn)\s*=/.test(src), false);
    assert.equal(/module\.exports/.test(src), false);
  });
});
