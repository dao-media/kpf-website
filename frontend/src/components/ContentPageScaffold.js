import { useMemo } from "react";
import PostTocNav from "@/components/PostTocNav";

const { prepareArticleHtml } = require("@/lib/blogPost");
const { stripHtml } = require("@/lib/searchDocuments");
const { useTocActiveId } = require("@/lib/useTocActiveId");

/**
 * React scaffold for WP pages that do not have a dedicated 1:1 build.
 * Renders title + Gutenberg/HTML content — never Mustache design HTML.
 */
export default function ContentPageScaffold({ page = null }) {
  const title = stripHtml(page?.title) || "Page";
  const { html, toc } = useMemo(
    () => prepareArticleHtml(String(page?.content || "")),
    [page],
  );
  const currentId = useTocActiveId(toc);

  return (
    <div className="kpf-page kpf-page--content">
      <section
        className="kpf-hero kpf-hero--post kpf-hero--privacy kpf-section kpf-u-invert"
        aria-labelledby="kpf-content-page-title"
      >
        <div className="kpf-u-container">
          <div className="kpf-hero__layout">
            <div className="kpf-content-block kpf-hero__content">
              <h1
                id="kpf-content-page-title"
                className="kpf-content-block__title kpf-content-block__title--h1"
              >
                {title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-post-body kpf-section" aria-label={title}>
        <div className="kpf-u-container kpf-post-body__inner">
          {toc.length > 0 ? (
            <aside className="kpf-post-sidebar">
              <PostTocNav toc={toc} activeId={currentId} />
            </aside>
          ) : null}

          <div className="kpf-post-main">
            {html ? (
              <article
                className="kpf-article"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="kpf-content-block__body">This page has no content yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
