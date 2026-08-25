const {
  KPF_CONTACT_EMAIL,
  KPF_DONATE_HREF,
  KPF_FOOTER_CONNECT,
  KPF_FOOTER_EXPLORE,
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
  KPF_FOOTER_EXPLORE.map((item) => item.label).join("|") ===
    "About|Kevin’s story|Grants|Events",
  "footer Explore lists About, Kevin’s story, Grants, Events"
);
assert(
  KPF_FOOTER_CONNECT.map((item) => item.label).join("|") ===
    "Contact|Blog|Email us",
  "footer Connect lists Contact, Blog, Email us"
);
assert(
  KPF_FOOTER_CONNECT[2].href === `mailto:${KPF_CONTACT_EMAIL}` &&
    KPF_FOOTER_CONNECT[2].detail === KPF_CONTACT_EMAIL,
  "Email us uses the foundation Gmail address"
);
assert(
  !KPF_FOOTER_CONNECT.some((item) => /facebook|instagram/i.test(item.href + item.label)),
  "footer has no Facebook or Instagram links"
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
