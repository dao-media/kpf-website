/**
 * About grantee cards — saved Queries slug `grants` (Code → Queries).
 * GraphQL: kpfQuery(slug: "grants")
 *
 * Site total (%%grants_total%% / {{grants.total}}):
 * GraphQL: kpfGrantsTotal { amount, label }
 */

const KPF_GRANTS_QUERY = `
  kpfQuery(slug: "grants") {
    slug
    title
    items {
      databaseId
      title
      slug
      postType
      recipientName
      blurb
      grantAmountLabel
      awardedLabel
      checkPhotoUrl
      logoUrl
      website
      featuredImage {
        url
        alt
      }
    }
  }
`;

const KPF_GRANTS_TOTAL_QUERY = `
  kpfGrantsTotal {
    amount
    label
  }
`;

/**
 * Parse a display amount like "$10,000" or "10000.50" into a number.
 * @param {unknown} value
 * @returns {number}
 */
function parseGrantAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? value : 0;
  }
  const cleaned = String(value ?? "")
    .replace(/[^0-9.-]/g, "")
    .trim();
  if (!cleaned) return 0;
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

/**
 * Format a USD total the same way WP number_format_i18n does for whole dollars.
 * @param {number} amount
 * @returns {string}
 */
function formatGrantTotal(amount) {
  const n = Number(amount);
  if (!(n > 0)) return "";
  const whole = Math.abs(n - Math.round(n)) < 0.00001;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n);
}

/**
 * Sum amount fields from normalized grantee cards or raw query items.
 * @param {Array<{ amount?: string, grantAmountLabel?: string }>} items
 * @returns {number}
 */
function sumGrantAmounts(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (sum, item) =>
      sum + parseGrantAmount(item?.amount ?? item?.grantAmountLabel),
    0,
  );
}

/**
 * Prefer GraphQL kpfGrantsTotal.label; else sum items; else "".
 * @param {{ amount?: number, label?: string }|null|undefined} totalPayload
 * @param {Array<{ amount?: string, grantAmountLabel?: string }>} [items]
 * @returns {string}
 */
function resolveGrantsTotalLabel(totalPayload, items = []) {
  const fromApi = String(totalPayload?.label || "").trim();
  if (fromApi) return fromApi;

  const fromAmount = formatGrantTotal(totalPayload?.amount);
  if (fromAmount) return fromAmount;

  return formatGrantTotal(sumGrantAmounts(items));
}

/**
 * Replace `{total}` in a title template.
 * @param {string} template
 * @param {string} totalLabel
 * @returns {string}
 */
function formatGranteesTitle(template, totalLabel) {
  const label = String(totalLabel || "").trim();
  const tpl = String(template || "");
  if (!label) {
    return tpl.replace(/\s*\{total\}\s*/g, " ").replace(/\s+/g, " ").trim();
  }
  return tpl.replaceAll("{total}", label);
}

/**
 * Map kpfQuery(slug: "grants") items → GranteeCard props.
 * @param {unknown} queryResult
 * @returns {Array<{
 *   id: string|number,
 *   name: string,
 *   body: string,
 *   date: string,
 *   amount: string,
 *   logoUrl: string,
 *   photoUrl: string,
 *   photoAlt: string,
 *   href: string,
 * }>}
 */
function normalizeGrantQueryItems(queryResult) {
  const nodes = Array.isArray(queryResult?.items) ? queryResult.items : [];
  const out = [];

  for (const node of nodes) {
    const name = String(node?.recipientName || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!name) continue;

    const photoUrl = String(node?.checkPhotoUrl || node?.featuredImage?.url || "").trim();
    const logoUrl = String(node?.logoUrl || "").trim();
    const href = String(node?.website || "").trim();

    out.push({
      id: node?.databaseId || node?.slug || name,
      name,
      body: String(node?.blurb || "").trim(),
      date: String(node?.awardedLabel || "").trim(),
      amount: String(node?.grantAmountLabel || "").trim(),
      logoUrl,
      photoUrl,
      photoAlt: String(node?.featuredImage?.alt || name).trim(),
      href,
    });
  }

  return out;
}

module.exports = {
  KPF_GRANTS_QUERY,
  KPF_GRANTS_TOTAL_QUERY,
  parseGrantAmount,
  formatGrantTotal,
  sumGrantAmounts,
  resolveGrantsTotalLabel,
  formatGranteesTitle,
  normalizeGrantQueryItems,
};
