import { useMemo, useState } from "react";
import Link from "next/link";
import CtaClosingBand, {
  CTA_CLOSING_DEFAULTS,
} from "@/components/CtaClosingBand";
import KpfButton from "@/components/KpfButton";
import { BLOG } from "@/lib/pageCopy";

const { resolveMedia } = require("@/lib/scaffoldMedia");
const { blogFilterBar, normalizeBlogPosts } = require("@/lib/blogPosts");

function PostMeta({ category, date, readTime, chip = false }) {
  const parts = [];
  if (category) {
    parts.push(
      chip ? (
        <span key="cat" className="kpf-blog-row__chip">
          {category}
        </span>
      ) : (
        <span key="cat" className="kpf-blog-row__category">
          {category}
        </span>
      ),
    );
  }
  if (date) {
    parts.push(
      <span key="date" className="kpf-blog-row__date">
        {date}
      </span>,
    );
  }
  if (readTime) {
    parts.push(
      <span key="read" className="kpf-blog-row__read">
        {readTime}
      </span>,
    );
  }

  return (
    <div className="kpf-blog-row__meta">
      {parts.map((part, index) => (
        <span key={part.key} className="kpf-blog-row__meta-item">
          {!chip && index > 0 ? (
            <span className="kpf-blog-row__meta-sep" aria-hidden="true">
              ·
            </span>
          ) : null}
          {part}
        </span>
      ))}
    </div>
  );
}

function BlogCard({ post, featured = false }) {
  if (!post?.href || !post?.title) return null;

  const className = featured
    ? "kpf-blog-featured kpf-blog-row kpf-blog-row--featured"
    : "kpf-blog-row";

  const media = post.media?.src ? (
    <img
      className="kpf-blog-row__thumb"
      src={post.media.src}
      alt={post.media.alt || ""}
      loading={featured ? "eager" : "lazy"}
      decoding="async"
    />
  ) : (
    <div className="kpf-blog-row__thumb kpf-blog-row__thumb--empty" aria-hidden="true" />
  );

  return (
    <Link href={post.href} className={className}>
      <div className="kpf-blog-row__copy">
        <PostMeta
          category={post.category}
          date={post.date}
          readTime={featured ? post.readTime : ""}
          chip={!featured}
        />
        <h3
          className={`kpf-content-block__title ${
            featured
              ? "kpf-content-block__title--h2"
              : "kpf-content-block__title--h3"
          }`}
        >
          {post.title}
        </h3>
        {post.description ? (
          <p className="kpf-blog-row__excerpt">{post.description}</p>
        ) : null}
        <span className="kpf-link kpf-blog-row__cta">
          {post.cta || (featured ? "Read the story" : "Read story")}
        </span>
      </div>
      {featured ? <div className="kpf-blog-row__media">{media}</div> : media}
    </Link>
  );
}

/**
 * Blog archive scaffold — Figma 939:2123 / 939:2396 / 939:2612.
 * Requires a published WP Page with slug `blog` (Events pattern).
 */
export default function BlogPageScaffold({ media = {}, posts: postSource = null }) {
  const copy = BLOG;
  const [topic, setTopic] = useState("all");

  const posts = useMemo(
    () =>
      normalizeBlogPosts(postSource, {
        rowCta: copy.archive.rowCta,
      }),
    [postSource, copy.archive.rowCta],
  );

  const { items: filterItems, interactive: filtersInteractive, visible: filtersVisible } = useMemo(
    () => blogFilterBar(posts),
    [posts],
  );

  const filtered = useMemo(() => {
    if (topic === "all") return posts;
    return posts.filter((post) => post.categorySlug === topic);
  }, [posts, topic]);

  const featured = filtered[0]
    ? { ...filtered[0], cta: copy.archive.featuredCta || filtered[0].cta }
    : null;
  const rest = filtered.slice(1);
  const ctaFlag = resolveMedia(
    media,
    CTA_CLOSING_DEFAULTS.media.key,
    CTA_CLOSING_DEFAULTS.media,
  );

  return (
    <div className="kpf-page kpf-page--blog">
      <section
        className="kpf-hero kpf-hero--blog kpf-section kpf-section--inverse kpf-u-invert"
        aria-labelledby="kpf-blog-hero-title"
      >
        <div className="kpf-u-container">
          <div className="kpf-hero__layout">
            <div className="kpf-content-block kpf-hero__content">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <p className="kpf-content-block__eyebrow">{copy.hero.eyebrow}</p>
                  <h1
                    id="kpf-blog-hero-title"
                    className="kpf-content-block__title kpf-content-block__title--h1"
                  >
                    {copy.hero.title}
                  </h1>
                </div>
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.hero.body}</p>
                </div>
              </div>
              <div className="kpf-content-block__actions kpf-hero__actions">
                <KpfButton
                  href={copy.hero.primaryCta.href}
                  className="kpf-btn kpf-btn--primary"
                >
                  {copy.hero.primaryCta.label}
                </KpfButton>
                <KpfButton
                  href={copy.hero.secondaryCta.href}
                  className="kpf-btn kpf-btn--outline"
                >
                  {copy.hero.secondaryCta.label}
                </KpfButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id={copy.archive.id}
        className="kpf-blog-archive kpf-section"
        aria-labelledby="kpf-blog-archive-title"
      >
        <div className="kpf-u-container">
          <header className="kpf-blog-archive__header kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.archive.eyebrow}</p>
                <h2
                  id="kpf-blog-archive-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.archive.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{copy.archive.body}</p>
              </div>
            </div>
          </header>

          {featured ? <BlogCard post={featured} featured /> : null}

          {filtersVisible ? (
            <div
              id="topics"
              className="kpf-blog-filters"
              role="group"
              aria-label="Filter stories by topic"
            >
              {filterItems.map((item) => {
                const active = topic === item.slug;
                const inert = !filtersInteractive;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    className={`kpf-blog-filters__chip${active ? " is-active" : ""}`}
                    aria-pressed={active}
                    disabled={inert}
                    data-kpf-track={inert ? undefined : "filter_selected"}
                    data-kpf-track-component={inert ? undefined : "blog_filter"}
                    onClick={inert ? undefined : () => setTopic(item.slug)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {rest.length > 0 ? (
            <div className="kpf-blog-grid">
              {rest.map((post) => (
                <BlogCard key={post.id || post.href} post={post} />
              ))}
            </div>
          ) : null}

          {!featured ? (
            <p className="kpf-blog-archive__empty">{copy.archive.empty}</p>
          ) : null}
        </div>
      </section>

      <CtaClosingBand flagSrc={ctaFlag.src} titleId="kpf-blog-cta-title" />
    </div>
  );
}
