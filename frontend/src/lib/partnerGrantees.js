/**
 * Homepage partners / grantee slider query helpers.
 */

const { preferLocalWebp } = require("./preferLocalWebp");

const KPF_PARTNER_GRANTEES_QUERY = `
  kpfPartnerGrantees(first: 24) {
    databaseId
    name
    website
    logoUrl
    logoAlt
  }
`;

function normalizePartnerNameKey(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizePartnerGrantees(nodes) {
  if (!Array.isArray(nodes)) return [];
  const seen = new Set();
  const items = [];

  for (const node of nodes) {
    const name = String(node?.name || "").trim();
    const logoUrl = preferLocalWebp(String(node?.logoUrl || "").trim());
    if (!name || !logoUrl) continue;

    const key = normalizePartnerNameKey(name) || `id:${Number(node?.databaseId) || name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      id: Number(node?.databaseId) || key,
      name,
      website: String(node?.website || "").trim(),
      logoUrl,
      logoAlt: String(node?.logoAlt || name).trim() || name,
    });
  }

  return items;
}

module.exports = {
  KPF_PARTNER_GRANTEES_QUERY,
  normalizePartnerGrantees,
  normalizePartnerNameKey,
};
