export const KPF_STYLESHEET_QUERY = `
  kpfStylesheet
  kpfStylesheetInfo {
    css
    foundation
    pages
    revision
    hasPagesLayer
    byteLength
    updatedAt
  }
`;

export default function GlobalStylesheet({ css, revision }) {
  if (!css) return null;

  return (
    <style
      data-kpf-global-stylesheet
      data-kpf-stylesheet-revision={revision || undefined}
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
