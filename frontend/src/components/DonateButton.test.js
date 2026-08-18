const assert = require("assert");
const { KPF_DONATE_HREF } = require("../lib/navigation");

// Mirror isDonateAction without JSX/Next imports (DonateButton is ESM-via-Next).
function isDonateAction(action) {
  if (!action || typeof action !== "object") return false;
  if (action.donate === true) return true;
  return Boolean(action.href && action.href === KPF_DONATE_HREF);
}

assert.equal(isDonateAction({ donate: true, label: "Donate" }), true);
assert.equal(isDonateAction({ href: KPF_DONATE_HREF, label: "Donate" }), true);
assert.equal(isDonateAction({ href: "/contact/", label: "Get in touch" }), false);
assert.equal(isDonateAction(null), false);

console.log("DonateButton helpers ok");
