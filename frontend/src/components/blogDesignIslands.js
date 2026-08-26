import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import KpfButton from "@/components/KpfButton";
import PostTocNav from "@/components/PostTocNav";
import { useStickyPostSidebar } from "@/hooks/useStickyPostSidebar";
import { blogFilterBar } from "@/lib/blogPosts";

const { stripHtml } = require("@/lib/searchDocuments");
const { useTocActiveId } = require("@/lib/useTocActiveId");

export function BlogFiltersIsland({ posts = [] }) {
  const rootRef = useRef(null);
  const [topic, setTopic] = useState("all");
  const { items, interactive } = useMemo(() => blogFilterBar(posts), [posts]);

  useEffect(() => {
    const archive = rootRef.current?.closest(".kpf-blog-archive");
    if (!archive) return undefined;

    const cards = archive.querySelectorAll("[data-kpf-category]");
    let visible = 0;
    cards.forEach((card) => {
      const slug = String(card.getAttribute("data-kpf-category") || "");
      const match = topic === "all" || slug === topic;
      card.hidden = !match;
      if (match) visible += 1;
    });

    const empty = archive.querySelector("[data-kpf-filter-empty]");
    if (empty) {
      empty.hidden = visible > 0;
    }

    return undefined;
  }, [topic, posts]);

  if (!posts.length) return null;

  return (
    <div
      ref={rootRef}
      id="topics"
      className="kpf-blog-filters"
      role="group"
      aria-label="Filter stories by topic"
    >
      {items.map((item) => {
        const active = topic === item.slug;
        const inert = !interactive;
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
  );
}

export function PostSidebarIsland({ post }) {
  const currentId = useTocActiveId(post?.toc);
  const commentsOpen = post?.commentStatus === "open";
  const activity = Array.isArray(post?.comments) ? post.comments.slice(0, 3) : [];

  useStickyPostSidebar([post?.uri, post?.html]);

  if (!post) return null;

  return (
    <aside className="kpf-post-sidebar">
      <PostTocNav toc={post.toc} activeId={currentId} />

      <div className="kpf-post-activity">
        <p className="kpf-post-activity__title">Activity</p>
        {activity.length > 0 ? (
          <ul className="kpf-post-activity__list">
            {activity.map((comment) => (
              <li key={comment.id} className="kpf-post-activity__item">
                <span className="kpf-post-activity__icon" aria-hidden="true">
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
      <p className="kpf-comments__closed">Comments are closed for this story.</p>
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

export function CommentsIsland({ post }) {
  if (!post) return null;

  const commentsOpen = post.commentStatus === "open";
  const comments = Array.isArray(post.comments) ? post.comments : [];

  return (
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

        {comments.length > 0 ? (
          <ul className="kpf-comments__list">
            {comments.map((comment) => (
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
  );
}
