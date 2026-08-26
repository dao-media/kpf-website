const { createSecureHeaders } = require("next-secure-headers");
const { WORDPRESS_CMS_ORIGIN } = require("./publicSiteUrl");

const WP_HOST = String(WORDPRESS_CMS_ORIGIN || "https://kpf.dreamhosters.com").replace(
  /\/$/,
  "",
);

/**
 * Public Faust CSP. xssProtection stays off (legacy header); CSP is the control.
 * Allows GTM/GA, DreamHost media + GraphQL, PayPal donate, and optional captcha.
 */
function kpfSecureHeaderOptions() {
  return {
    xssProtection: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: "'self'",
        baseURI: "'self'",
        objectSrc: "'none'",
        frameAncestors: "'none'",
        formAction: ["'self'", "https://www.paypal.com"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://challenges.cloudflare.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
        fontSrc: ["'self'", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          WP_HOST,
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://www.paypal.com",
          "https://www.paypalobjects.com",
        ],
        mediaSrc: ["'self'", "blob:", WP_HOST],
        connectSrc: [
          "'self'",
          WP_HOST,
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com",
          "https://region1.google-analytics.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://challenges.cloudflare.com",
        ],
        frameSrc: [
          "'self'",
          "https://www.googletagmanager.com",
          "https://www.paypal.com",
          "https://www.sandbox.paypal.com",
          "https://www.google.com",
          "https://challenges.cloudflare.com",
        ],
        workerSrc: ["'self'", "blob:"],
      },
    },
  };
}

function createKpfSecureHeaders() {
  return createSecureHeaders(kpfSecureHeaderOptions());
}

module.exports = {
  createKpfSecureHeaders,
  kpfSecureHeaderOptions,
};
