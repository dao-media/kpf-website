export const KPF_STYLESHEET_QUERY = `
  kpfStylesheet
`;

export default function GlobalStylesheet({ css }) {
  if (!css) return null;

  return (
    <style
      data-kpf-global-stylesheet
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
