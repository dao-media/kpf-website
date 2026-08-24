const fallback = require("@/data/wpContentFallback.json");

function isFilledArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function fallbackForm(live) {
  if (live?.definitionJson || live?.definition) return live;
  return fallback.form || null;
}

function fallbackGrants(live) {
  return isFilledArray(live) ? live : fallback.grants || [];
}

function fallbackGrantsTotal(live) {
  const label = String(live || "").trim();
  return label || String(fallback.grantsTotal || "").trim();
}

function fallbackScrapbook(live) {
  return isFilledArray(live) ? live : fallback.scrapbookTiles || [];
}

function fallbackKevin(live) {
  return isFilledArray(live) ? live : fallback.kevinSlides || [];
}

function fallbackPartners(live) {
  return isFilledArray(live) ? live : fallback.partnerGrantees || [];
}

function fallbackEvents(live) {
  return isFilledArray(live) ? live : fallback.events || [];
}

module.exports = {
  fallbackForm,
  fallbackGrants,
  fallbackGrantsTotal,
  fallbackScrapbook,
  fallbackKevin,
  fallbackPartners,
  fallbackEvents,
};
