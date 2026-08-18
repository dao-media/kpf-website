const {
  KPF_DONATE_HREF,
  htmlIncludesChromeClass,
  isCurrentPath,
  normalizePath,
} = require("./navigation");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(normalizePath("") === "/", "empty path normalizes to /");
assert(normalizePath("/about") === "/about/", "paths get trailing slash");
assert(normalizePath("/about/?x=1") === "/about/", "query is stripped");
assert(isCurrentPath("/", "/"), "home matches home");
assert(!isCurrentPath("/about/", "/"), "about is not home");
assert(isCurrentPath("/about/team/", "/about/"), "nested about matches");
assert(isCurrentPath("/events", "/events/"), "events without slash matches");
assert(
  KPF_DONATE_HREF.includes("paypal.com") &&
    KPF_DONATE_HREF.includes("kevinpopke.foundation"),
  "donate points at Foundation PayPal"
);
assert(
  htmlIncludesChromeClass('<header class="kpf-header">', "kpf-header"),
  "detects kpf-header class"
);
assert(
  !htmlIncludesChromeClass('<div class="kpf-site-header">', "kpf-header"),
  "ignores unrelated chrome class"
);

console.log("navigation helpers ok");
