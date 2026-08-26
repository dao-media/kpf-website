/**
 * Decode common HTML entities so values that were already escaped
 * (or stored with numeric entities) are not double-escaped into visible codes.
 */
function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0?39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function escapeTemplateValue(value) {
  return decodeHtmlEntities(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resolvePath(model, path) {
  if (!path) return "";
  return String(path)
    .split(".")
    .reduce(
      (value, key) =>
        value && Object.prototype.hasOwnProperty.call(value, key)
          ? value[key]
          : "",
      model,
    );
}

function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "items")) {
      return Array.isArray(value.items) && value.items.length > 0;
    }
    return Object.keys(value).length > 0;
  }
  return Boolean(value);
}

function sanitizeUrlAttributes(html) {
  return html.replace(
    /\b(href|src)\s*=\s*(["'])([\s\S]*?)\2/gi,
    (attribute, name, quote, value) => {
      const normalized = value
        .trim()
        .replace(/&#(?:x0*3a|0*58);|&colon;/gi, ":")
        .replace(/[\u0000-\u0020\u007f]+/g, "");
      const allowed =
        normalized === "" ||
        !normalized.includes(":") ||
        /^(?:https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(normalized);
      return allowed ? attribute : `${name}=${quote}${quote}`;
    },
  );
}

function findMatchingClose(source, openIndex, openRe, closeRe) {
  const openMatch = source.slice(openIndex).match(openRe);
  if (!openMatch || openMatch.index !== 0) {
    return -1;
  }

  let index = openIndex + openMatch[0].length;
  let depth = 1;

  while (index < source.length && depth > 0) {
    const rest = source.slice(index);
    const nextOpen = rest.search(openRe);
    const nextClose = rest.search(closeRe);

    if (nextClose === -1) {
      return -1;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const matched = rest.slice(nextOpen).match(openRe);
      depth += 1;
      index += nextOpen + (matched ? matched[0].length : 1);
      continue;
    }

    const matched = rest.slice(nextClose).match(closeRe);
    depth -= 1;
    if (depth === 0) {
      return {
        start: index + nextClose,
        end: index + nextClose + (matched ? matched[0].length : 1),
      };
    }
    index += nextClose + (matched ? matched[0].length : 1);
  }

  return -1;
}

function findElseAtDepth(inner) {
  const openRe = /\{\{\s*#if\s+([^{}]+?)\s*\}\}/i;
  const closeRe = /\{\{\s*\/if\s*\}\}/i;
  const elseRe = /\{\{\s*else\s*\}\}/i;
  let index = 0;
  let depth = 0;

  while (index < inner.length) {
    const rest = inner.slice(index);
    const nextOpen = rest.search(openRe);
    const nextClose = rest.search(closeRe);
    const nextElse = rest.search(elseRe);
    const nearest = Math.min(
      nextOpen === -1 ? Infinity : nextOpen,
      nextClose === -1 ? Infinity : nextClose,
      nextElse === -1 ? Infinity : nextElse,
    );
    if (nearest === Infinity) {
      return -1;
    }

    if (nextElse === nearest && depth === 0) {
      const matched = rest.slice(nextElse).match(elseRe);
      return {
        start: index + nextElse,
        end: index + nextElse + (matched ? matched[0].length : 1),
      };
    }

    if (nextOpen === nearest) {
      const matched = rest.slice(nextOpen).match(openRe);
      depth += 1;
      index += nextOpen + (matched ? matched[0].length : 1);
      continue;
    }

    if (nextClose === nearest) {
      if (depth === 0) {
        return -1;
      }
      const matched = rest.slice(nextClose).match(closeRe);
      depth -= 1;
      index += nextClose + (matched ? matched[0].length : 1);
      continue;
    }

    const matched = rest.slice(nextElse).match(elseRe);
    index += nextElse + (matched ? matched[0].length : 1);
  }

  return -1;
}

function renderSections(template, model) {
  let source = String(template || "");
  const eachOpen = /\{\{\s*#each\s+([^{}]+?)\s*\}\}/i;
  const eachClose = /\{\{\s*\/each\s*\}\}/i;
  const ifOpen = /\{\{\s*#if\s+([^{}]+?)\s*\}\}/i;
  const ifClose = /\{\{\s*\/if\s*\}\}/i;

  while (true) {
    const eachMatch = source.match(eachOpen);
    const ifMatch = source.match(ifOpen);
    const eachIndex = eachMatch ? eachMatch.index ?? Infinity : Infinity;
    const ifIndex = ifMatch ? ifMatch.index ?? Infinity : Infinity;
    if (eachIndex === Infinity && ifIndex === Infinity) {
      break;
    }

    if (eachIndex <= ifIndex) {
      const openIndex = eachIndex;
      const close = findMatchingClose(source, openIndex, eachOpen, eachClose);
      if (close === -1) break;

      const path = eachMatch[1].trim();
      const inner = source.slice(openIndex + eachMatch[0].length, close.start);
      const value = resolvePath(model, path);
      const items = Array.isArray(value)
        ? value
        : Array.isArray(value?.items)
          ? value.items
          : [];

      const renderedItems = items
        .map((item, index) => {
          const scoped = {
            ...model,
            ...(item && typeof item === "object" ? item : { value: item }),
            this: item,
            "@index": index,
            "@first": index === 0,
            "@last": index === items.length - 1,
          };
          return renderDesignTemplate(inner, scoped);
        })
        .join("");

      source =
        source.slice(0, openIndex) + renderedItems + source.slice(close.end);
      continue;
    }

    const openIndex = ifIndex;
    const close = findMatchingClose(source, openIndex, ifOpen, ifClose);
    if (close === -1) break;

    const path = ifMatch[1].trim();
    const inner = source.slice(openIndex + ifMatch[0].length, close.start);
    const elseMatch = findElseAtDepth(inner);
    let truthyBlock = inner;
    let falsyBlock = "";
    if (elseMatch !== -1) {
      truthyBlock = inner.slice(0, elseMatch.start);
      falsyBlock = inner.slice(elseMatch.end);
    }

    const chosen = isTruthy(resolvePath(model, path))
      ? truthyBlock
      : falsyBlock;
    const rendered = renderDesignTemplate(chosen, model);
    source = source.slice(0, openIndex) + rendered + source.slice(close.end);
  }

  return source;
}

const BARE_ISLANDS = "partners-slider|blog-filters|post-sidebar|comments";
const ISLAND_MARKER_RE = new RegExp(
  `\\{\\{\\s*(?:(form|stacked-slider):([a-z0-9_-]+)|(${BARE_ISLANDS}))\\s*\\}\\}`,
  "gi",
);

function preserveIslandMarkers(template) {
  const markers = [];
  const source = String(template || "").replace(
    ISLAND_MARKER_RE,
    (_match, kind, slug, bareIsland) => {
      const index =
        markers.push(
          bareIsland
            ? { kind: String(bareIsland).toLowerCase(), slug: "" }
            : {
                kind: String(kind).toLowerCase(),
                slug: String(slug).toLowerCase(),
              },
        ) - 1;
      return `KPF_ISLAND_MARKER_${index}_END`;
    },
  );
  return { source, markers };
}

function restoreIslandMarkers(html, markers) {
  return markers.reduce((output, marker, index) => {
    const token = marker.slug
      ? `{{${marker.kind}:${marker.slug}}}`
      : `{{${marker.kind}}}`;
    return output.replaceAll(`KPF_ISLAND_MARKER_${index}_END`, token);
  }, html);
}

function renderDesignTemplate(template, model) {
  const { source: protectedTemplate, markers } = preserveIslandMarkers(template);
  const withSections = renderSections(protectedTemplate, model);
  const rawValues = [];

  const withRawContent = withSections.replace(
    /\{\{\{\s*([^{}]+?)\s*\}\}\}/g,
    (_match, token) => {
      const path = token.trim();
      if (path !== "page.content") {
        return escapeTemplateValue(resolvePath(model, path));
      }
      const index = rawValues.push(String(resolvePath(model, path) || "")) - 1;
      return `KPF_RAW_CONTENT_${index}_END`;
    },
  );

  const rendered = withRawContent.replace(
    /\{\{\s*(?!else\b)([^{}#\/]+?)\s*\}\}/g,
    (_match, token) => escapeTemplateValue(resolvePath(model, token.trim())),
  );

  const withContent = rawValues.reduce(
    (html, value, index) =>
      html.replaceAll(`KPF_RAW_CONTENT_${index}_END`, value),
    rendered,
  );

  return restoreIslandMarkers(sanitizeUrlAttributes(withContent), markers);
}

function discoverQuerySlugs(template) {
  const source = String(template || "");
  const matches = [
    ...source.matchAll(/\{\{\s*#each\s+queries\.([a-z0-9_-]+)\s*\}\}/gi),
  ];
  return [...new Set(matches.map((match) => match[1].toLowerCase()))];
}

function discoverFormSlugs(template) {
  const source = String(template || "");
  const matches = [...source.matchAll(/\{\{\s*form:([a-z0-9_-]+)\s*\}\}/gi)];
  return [...new Set(matches.map((match) => match[1].toLowerCase()))];
}

function discoverStackedSliderSlugs(template) {
  const source = String(template || "");
  const matches = [
    ...source.matchAll(/\{\{\s*stacked-slider:([a-z0-9_-]+)\s*\}\}/gi),
  ];
  return [...new Set(matches.map((match) => match[1].toLowerCase()))];
}

function splitDesignHtml(html) {
  const source = String(html || "");
  const parts = [];
  const re = new RegExp(
    `\\{\\{\\s*(?:(form|stacked-slider):([a-z0-9_-]+)|(${BARE_ISLANDS}))\\s*\\}\\}`,
    "gi",
  );
  let lastIndex = 0;
  let match;

  while ((match = re.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "html", html: source.slice(lastIndex, match.index) });
    }
    if (match[3]) {
      parts.push({ type: String(match[3]).toLowerCase() });
    } else {
      parts.push({
        type: String(match[1]).toLowerCase(),
        slug: String(match[2]).toLowerCase(),
      });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    parts.push({ type: "html", html: source.slice(lastIndex) });
  }

  return parts;
}

/**
 * Keep island markers in the HTML tree so React does not split a container
 * across sibling wrappers (which the parser then auto-closes).
 * @param {string} html
 * @returns {{ html: string, islands: Array<{ id: string, type: string, slug: string }> }}
 */
function embedDesignIslands(html, idPrefix = "kpf-island") {
  const islands = [];
  const prefix =
    String(idPrefix || "kpf-island").replace(/[^a-zA-Z0-9_-]/g, "") ||
    "kpf-island";
  const re = new RegExp(
    `\\{\\{\\s*(?:(form|stacked-slider):([a-z0-9_-]+)|(${BARE_ISLANDS}))\\s*\\}\\}`,
    "gi",
  );
  const next = String(html || "").replace(
    re,
    (_match, kind, slug, bareIsland) => {
      const type = String(bareIsland || kind).toLowerCase();
      const id = `${prefix}-${islands.length}`;
      islands.push({
        id,
        type,
        slug: slug ? String(slug).toLowerCase() : "",
      });
      return `<div id="${id}" data-kpf-island="${type}"></div>`;
    },
  );
  return { html: next, islands };
}

module.exports = {
  decodeHtmlEntities,
  escapeTemplateValue,
  renderDesignTemplate,
  discoverQuerySlugs,
  discoverFormSlugs,
  discoverStackedSliderSlugs,
  splitDesignHtml,
  embedDesignIslands,
};
