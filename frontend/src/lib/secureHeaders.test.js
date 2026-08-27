const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createKpfSecureHeaders } = require("./secureHeaders");

describe("secureHeaders", () => {
  it("emits CSP that allows GTM, DreamHost, and GraphQL while keeping xssProtection off", () => {
    const headers = createKpfSecureHeaders();
    const map = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    assert.equal(map["X-XSS-Protection"], "0");
    const csp = map["Content-Security-Policy"];
    assert.ok(csp, "Content-Security-Policy missing");
    assert.match(csp, /www\.googletagmanager\.com/);
    assert.match(csp, /kpf\.dreamhosters\.com/);
    assert.match(csp, /www\.paypal\.com/);
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.equal(
      map["Strict-Transport-Security"],
      "max-age=63072000; includeSubDomains; preload",
    );
  });
});
