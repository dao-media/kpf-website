import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import CtaClosingBand, {
  CTA_CLOSING_DEFAULTS,
} from "@/components/CtaClosingBand";
import KpfButton from "@/components/KpfButton";
import PostTocNav from "@/components/PostTocNav";
import { normalizeBlogPosts } from "@/lib/blogPosts";
import { normalizeBlogPostPage } from "@/lib/blogPost";

const { resolveMedia } = require("@/lib/scaffoldMedia");
const { stripHtml } = require("@/lib/searchDocuments");
const { useTocActiveId } = require("@/lib/useTocActiveId");

function RelatedCard({ post }) {
  if (!post?.href || !post?.title) return null;
  return (
    <Link href={post.href} className="kpf-blog-row kpf-related__card">
      <div className="kpf-blog-row__copy">
        <div className="kpf-blog-row__meta">
          {post.category ? (
            <span className="kpf-blog-row__chip">{post.category}</span>
          ) : null}
          {post.date ? (
            <span className="kpf-blog-row__date">{post.date}</span>
          ) : null}
        </div>
        <h3 className="kpf-content-block__title kpf-content-block__title--h3">
          {post.title}
        </h3>
        {post.description ? (
          <p className="kpf-blog-row__excerpt">{post.description}</p>
        ) : null}
        <span className="kpf-link kpf-blog-row__cta">
          {post.cta || "Read story"}
        </span>
      </div>
      {post.media?.src ? (
        <img
          className="kpf-blog-row__thumb"
          src={post.media.src}
          alt={post.media.alt || ""}
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </Link>
  );
}

function CommentForm({ postId, open, onSubmitted }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if (!open) {
    return (
      <p className="kpf-comments__closed">
        Comments are closed for this story.
      </p>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("submitting");

    const base = String(process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
      /\/$/,
      "",
    );
    if (!base || !postId) {
      setStatus("idle");
      setError("Comments are temporarily unavailable.");
      return;
    }

    try {
      const response = await fetch(`${base}/wp-json/wp/v2/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: postId,
          author_name: name.trim(),
          author_email: email.trim(),
          content: message.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          stripHtml(payload?.message) || "Could not post your comment.",
        );
      }
      setName("");
      setEmail("");
      setMessage("");
      setStatus("success");
      onSubmitted?.();
    } catch (err) {
      setStatus("idle");
      setError(err?.message || "Could not post your comment.");
    }
  }

  return (
    <form className="kpf-comments__form" onSubmit={handleSubmit}>
      <h3 className="kpf-comments__form-title">Leave a comment</h3>
      <div className="kpf-comments__form-row">
        <label className="kpf-comments__field">
          <span>Name</span>
          <input
            type="text"
            name="author_name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="kpf-comments__field">
          <span>Email</span>
          <input
            type="email"
            name="author_email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>
      <label className="kpf-comments__field">
        <span>Message</span>
        <textarea
          name="content"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {error ? <p className="kpf-comments__error">{error}</p> : null}
      {status === "success" ? (
        <p className="kpf-comments__success">
          Thanks — your comment was submitted and may await moderation.
        </p>
      ) : null}
      <KpfButton
        type="submit"
        className="kpf-btn kpf-btn--primary"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Posting…" : "Post comment"}
      </KpfButton>
    </form>
  );
}

/**
 * Single blog post scaffold — Figma 939:2828 / 944:2825 / 944:3054.
 */
export default function BlogPostScaffold({
  post: postSource = null,
  relatedPosts: relatedSource = null,
  media = {},
}) {
  const post = useMemo(
    () => normalizeBlogPostPage(postSource),
    [postSource],
  );
  const related = useMemo(() => {
    return normalizeBlogPosts(relatedSource, { rowCta: "Read story" })
      .filter((item) => item.href !== post?.uri)
      .slice(0, 2);
  }, [relatedSource, post?.uri]);

  const currentId = useTocActiveId(post?.toc);
  const commentsOpen = post?.commentStatus === "open";
  const ctaFlag = resolveMedia(
    media,
    CTA_CLOSING_DEFAULTS.media.key,
    CTA_CLOSING_DEFAULTS.media,
  );

  if (!post) {
    return (
      <div className="kpf-page kpf-page--post">
        <section className="kpf-section">
          <div className="kpf-u-container">
            <p>This story could not be found.</p>
            <Link href="/blog/" className="kpf-link">
              Back to the blog
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const activity = post.comments.slice(0, 3);

  return (
    <div className="kpf-page kpf-page--post">
      <section
        className="kpf-hero kpf-hero--post kpf-section kpf-u-invert"
        aria-labelledby="kpf-post-title"
      >
        <div className="kpf-u-container">
          <div className="kpf-hero__layout">
            <div className="kpf-content-block kpf-hero__content">
              <nav className="kpf-post-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true"> / </span>
                <Link href="/blog/">Blog</Link>
                <span aria-hidden="true"> / </span>
                <span>{post.category}</span>
              </nav>
              <h1
                id="kpf-post-title"
                className="kpf-content-block__title kpf-content-block__title--h1"
              >
                {post.title}
              </h1>
              <p className="kpf-post-meta">
                {post.date ? <span>{post.date}</span> : null}
                {post.readTime ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span>{post.readTime}</span>
                  </>
                ) : null}
                {post.author ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span>By {post.author}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-post-body kpf-section" aria-label="Article">
        <div className="kpf-u-container kpf-post-body__inner">
          <aside className="kpf-post-sidebar">
            <PostTocNav toc={post.toc} activeId={currentId} />

            <div className="kpf-post-activity">
              <p className="kpf-post-activity__title">Activity</p>
              {activity.length > 0 ? (
                <ul className="kpf-post-activity__list">
                  {activity.map((comment) => (
                    <li key={comment.id} className="kpf-post-activity__item">
                      <span
                        className="kpf-post-activity__icon"
                        aria-hidden="true"
                      >
                        <MessageSquareText size={14} strokeWidth={2} />
                      </span>
                      <p>“{comment.excerpt}”</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="kpf-post-activity__empty">
                  Be the first to join the conversation.
                </p>
              )}
              {commentsOpen ? (
                <a href="#comments" className="kpf-post-activity__leave">
                  Leave a Comment
                  <MessageSquareText size={18} strokeWidth={2} aria-hidden />
                </a>
              ) : null}
            </div>
          </aside>

          <div className="kpf-post-main">
            {post.media?.src ? (
              <figure className="kpf-post-featured">
                <img
                  src={post.media.src}
                  alt={post.media.alt || ""}
                  loading="eager"
                  decoding="async"
                />
              </figure>
            ) : null}
            <article
              className="kpf-article"
              // Trusted WP author HTML with injected heading ids.
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          </div>
        </div>
      </section>

      <section
        id="comments"
        className="kpf-comments kpf-section"
        aria-labelledby="kpf-comments-title"
      >
        <div className="kpf-u-container">
          <header className="kpf-comments__header kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">Comments</p>
                <h2
                  id="kpf-comments-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  Join the conversation
                </h2>
              </div>
            </div>
          </header>

          {post.comments.length > 0 ? (
            <ul className="kpf-comments__list">
              {post.comments.map((comment) => (
                <li key={comment.id} className="kpf-comments__item">
                  <span className="kpf-comments__quote" aria-hidden="true">
                    “
                  </span>
                  <div className="kpf-comments__body">
                    <div className="kpf-comments__meta">
                      <span className="kpf-comments__avatar" aria-hidden="true">
                        {comment.initials}
                      </span>
                      <span className="kpf-comments__name">{comment.name}</span>
                      {comment.date ? (
                        <span className="kpf-comments__date">{comment.date}</span>
                      ) : null}
                    </div>
                    <p>{comment.content}</p>
                  </div>
                  <span className="kpf-comments__quote" aria-hidden="true">
                    ”
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <CommentForm postId={post.id} open={commentsOpen} />
        </div>
      </section>

      {related.length > 0 ? (
        <section
          className="kpf-related kpf-section"
          aria-labelledby="kpf-related-title"
        >
          <div className="kpf-u-container">
            <header className="kpf-related__header kpf-content-block">
              <p className="kpf-content-block__eyebrow">Keep reading</p>
              <h2
                id="kpf-related-title"
                className="kpf-content-block__title kpf-content-block__title--h2"
              >
                Other stories from the foundation
              </h2>
            </header>
            <div className="kpf-related__grid">
              {related.map((item) => (
                <RelatedCard key={item.id || item.href} post={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CtaClosingBand flagSrc={ctaFlag.src} titleId="kpf-post-cta-title" />
    </div>
  );
}
