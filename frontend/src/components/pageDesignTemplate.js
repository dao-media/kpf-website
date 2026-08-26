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

function renderSections(template, model) {
  let source = String(template || "");
  const eachOpen = /\{\{\s*#each\s+([^{}]+?)\s*\}\}/i;
  const eachClose = /\{\{\s*\/each\s*\}\}/i;
  const ifOpen = /\{\{\s*#if\s+([^{}]+?)\s*\}\}/i;
  const ifClose = /\{\{\s*\/if\s*\}\}/i;

  while (true) {
    const openMatch = source.match(eachOpen);
    if (!openMatch) break;
    const openIndex = openMatch.index ?? -1;
    if (openIndex < 0) break;
    const close = findMatchingClose(source, openIndex, eachOpen, eachClose);
    if (close === -1) break;

    const path = openMatch[1].trim();
    const inner = source.slice(openIndex + openMatch[0].length, close.start);
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
  }

  while (true) {
    const openMatch = source.match(ifOpen);
    if (!openMatch) break;
    const openIndex = openMatch.index ?? -1;
    if (openIndex < 0) break;
    const close = findMatchingClose(source, openIndex, ifOpen, ifClose);
    if (close === -1) break;

    const path = openMatch[1].trim();
    const inner = source.slice(openIndex + openMatch[0].length, close.start);
    const elseMatch = inner.match(/\{\{\s*else\s*\}\}/i);
    let truthyBlock = inner;
    let falsyBlock = "";
    if (elseMatch) {
      truthyBlock = inner.slice(0, elseMatch.index);
      falsyBlock = inner.slice(elseMatch.index + elseMatch[0].length);
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

module.exports = {
  decodeHtmlEntities,
  escapeTemplateValue,
  renderDesignTemplate,
  discoverQuerySlugs,
  discoverFormSlugs,
  discoverStackedSliderSlugs,
  splitDesignHtml,
};
