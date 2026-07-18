function escapeTemplateValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resolvePath(model, path) {
  return path
    .split(".")
    .reduce(
      (value, key) =>
        value && Object.prototype.hasOwnProperty.call(value, key)
          ? value[key]
          : "",
      model,
    );
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

function renderDesignTemplate(template, model) {
  const source = String(template || "");
  const rawValues = [];

  const withRawContent = source.replace(
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
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (_match, token) => escapeTemplateValue(resolvePath(model, token.trim())),
  );

  const withContent = rawValues.reduce(
    (html, value, index) =>
      html.replaceAll(`KPF_RAW_CONTENT_${index}_END`, value),
    rendered,
  );

  return sanitizeUrlAttributes(withContent);
}

module.exports = {
  escapeTemplateValue,
  renderDesignTemplate,
};
