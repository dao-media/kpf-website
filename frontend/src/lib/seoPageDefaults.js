const { PRODUCTION_ORIGIN, publicSiteOrigin } = require("./publicSiteUrl");

const HOME_TITLE =
  "Kevin Popke Foundation | Veteran Grants in Tampa Bay, FL";
const HOME_DESCRIPTION =
  "The Kevin Popke Foundation makes targeted grants to veteran-focused nonprofits across Tampa Bay and Florida. See where your donation goes — and give today.";

const DEFAULT_OG_PATH = "/media/home/kevin-double-exposure-cutout.webp";

const PAGES = {
  "/": {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    ogPath: DEFAULT_OG_PATH,
  },
  "/about": {
    title: "Who Was Kevin Popke? | About the Foundation in His Name",
    description:
      "Meet Donald “Kevin” Popke — Army First Sergeant, paratrooper, and the man behind a foundation funding Florida’s veteran charities in his honor.",
    ogPath: "/media/about/hero-frame.png",
  },
  "/events": {
    title: "Events | Kevin Popke Foundation",
    description:
      "Songwriters for Vets and other events supporting Florida veterans. Partnership and sponsorship opportunities available.",
    ogPath: "/media/events/featured-1.webp",
  },
  "/contact": {
    title: "Contact the Kevin Popke Foundation | Tampa Bay, FL",
    description:
      "Questions about a grant, event, sponsorship, or how to help Florida’s veterans? Contact the Kevin Popke Foundation — a real person reads every message.",
    ogPath: "/media/contact/hero-bridge.webp",
  },
  "/blog": {
    title: "News & Updates | Kevin Popke Foundation, Inc.",
    description:
      "Follow our grantees, volunteers, and events on the KPF blog, where we post regular news and updates to keep you informed.",
    ogPath: DEFAULT_OG_PATH,
  },
};

function origin() {
  try {
    return publicSiteOrigin();
  } catch {
    return PRODUCTION_ORIGIN;
  }
}

function mediaUrl(path) {
  return `${origin()}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizePath(pathname) {
  if (!pathname) return "/";
  let path = String(pathname).split(/[?#]/)[0];
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    }
  } catch {
    /* keep path */
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

function defaultsForPath(pathname) {
  const path = normalizePath(pathname);
  if (PAGES[path]) return PAGES[path];
  if (path.startsWith("/blog") || /\/\d{4}\/\d{2}\/\d{2}\//.test(path)) {
    return {
      title: "",
      description: "",
      ogPath: DEFAULT_OG_PATH,
    };
  }
  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    ogPath: DEFAULT_OG_PATH,
  };
}

function isUsableDescription(description) {
  const text = String(description || "").trim();
  if (!text) return false;
  return text.toLowerCase() !== "editor save check";
}

function isGenericTitle(title, pathname) {
  const text = String(title || "").trim();
  if (!text) return true;
  const path = normalizePath(pathname);
  if (path === "/") {
    return (
      text === "The Kevin Popke Foundation" || text === "Kevin Popke Foundation"
    );
  }
  const prefixes = {
    "/about": "About |",
    "/events": "Events |",
    "/contact": "Contact |",
  };
  const prefix = prefixes[path];
  if (path === "/events" && text.startsWith("Songwriters for Vets")) return true;
  return prefix ? text.startsWith(prefix) : false;
}

function applySeoDefaults(seo, pathname) {
  if (!seo || typeof seo !== "object") return seo;
  const path =
    pathname ||
    normalizePath(seo.canonical || seo.openGraph?.url || "/");
  const defaults = defaultsForPath(path);
  const ogImage =
    seo.openGraph?.imageUrl ||
    seo.twitter?.imageUrl ||
    mediaUrl(defaults.ogPath);

  const title = isGenericTitle(seo.title, path)
    ? defaults.title || seo.title
    : seo.title;
  const description = isUsableDescription(seo.description)
    ? seo.description
    : defaults.description || seo.description;

  return {
    ...seo,
    title,
    description,
    openGraph: {
      ...(seo.openGraph || {}),
      title: isGenericTitle(seo.openGraph?.title, path)
        ? title
        : seo.openGraph?.title,
      description: isUsableDescription(seo.openGraph?.description)
        ? seo.openGraph.description
        : description,
      imageUrl: ogImage,
    },
    twitter: {
      ...(seo.twitter || {}),
      title: isGenericTitle(seo.twitter?.title, path)
        ? title
        : seo.twitter?.title,
      description: isUsableDescription(seo.twitter?.description)
        ? seo.twitter.description
        : description,
      imageUrl: seo.twitter?.imageUrl || ogImage,
    },
  };
}

module.exports = {
  DEFAULT_OG_PATH,
  HOME_DESCRIPTION,
  HOME_TITLE,
  applySeoDefaults,
  defaultsForPath,
  isGenericTitle,
  isUsableDescription,
  mediaUrl,
  normalizePath,
};
