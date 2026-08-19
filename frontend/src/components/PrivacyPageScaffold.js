import { useMemo } from "react";
import PostTocNav from "@/components/PostTocNav";

const { prepareArticleHtml } = require("@/lib/blogPost");
const { formatPostDate } = require("@/lib/latestBlogPost");
const { PRIVACY_BODY_HTML } = require("@/lib/privacyContent");
const { stripHtml } = require("@/lib/searchDocuments");
const { useTocActiveId } = require("@/lib/useTocActiveId");

/**
 * Prefer CMS content when it's real policy copy; ignore WP tutorial defaults.
 * @param {unknown} page
 * @returns {string}
 */
function resolvePrivacyHtml(page) {
  const raw = String(page?.content || "");
  if (
    raw &&
    !/privacy-policy-tutorial/i.test(raw) &&
    !/Suggested text:/i.test(raw)
  ) {
    return raw;
  }
  return PRIVACY_BODY_HTML;
}

/**
 * Privacy Policy scaffold — Figma 1086:3070 (adapted from blog post template).
 */
export default function PrivacyPageScaffold({ page = null }) {
  const title = stripHtml(page?.title) || "Privacy Policy";
  const updatedLabel =
    formatPostDate(page?.modified || page?.date) || "August 18, 2026";

  const { html, toc } = useMemo(
    () => prepareArticleHtml(resolvePrivacyHtml(page)),
    [page],
  );

  const currentId = useTocActiveId(toc);
  return (
    <div className="kpf-page kpf-page--privacy">
      <section
        className="kpf-hero kpf-hero--post kpf-hero--privacy kpf-section kpf-u-invert"
        aria-labelledby="kpf-privacy-title"
      >
        <div className="kpf-u-container">
          <div className="kpf-hero__layout">
            <div className="kpf-content-block kpf-hero__content">
              <h1
                id="kpf-privacy-title"
                className="kpf-content-block__title kpf-content-block__title--h1"
              >
                {title}
              </h1>
              <p className="kpf-post-meta">
                <span className="kpf-post-meta__label">Last Updated: </span>
                <span>{updatedLabel}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-post-body kpf-section" aria-label="Privacy policy">
        <div className="kpf-u-container kpf-post-body__inner">
          {toc.length > 0 ? (
            <aside className="kpf-post-sidebar">
              <PostTocNav toc={toc} activeId={currentId} />
            </aside>
          ) : null}

          <div className="kpf-post-main">
            <article
              className="kpf-article"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
