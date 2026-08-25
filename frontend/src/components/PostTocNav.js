import { ArrowRight } from "lucide-react";

const { buildTocTree } = require("@/lib/blogPost");

/**
 * Single TOC row — Lucide arrow only when active (Figma Sidebar Parent/Child).
 */
function TocLink({ item, activeId }) {
  const isActive = activeId === item.id;
  return (
    <a href={`#${item.id}`} aria-current={isActive ? "true" : undefined}>
      <span className="kpf-post-toc__arrow" aria-hidden="true">
        {isActive ? (
          <ArrowRight size={16} strokeWidth={1.75} absoluteStrokeWidth />
        ) : null}
      </span>
      <span className="kpf-post-toc__label">{item.text}</span>
    </a>
  );
}

/**
 * Contents nav — H2 parents with nested H3 child links (Figma 939:2828).
 */
export default function PostTocNav({ toc = [], activeId = "" }) {
  const tree = buildTocTree(toc);
  if (!tree.length) return null;

  return (
    <nav className="kpf-post-toc" aria-label="Contents">
      <p className="kpf-post-toc__title">Contents</p>
      <ol className="kpf-post-toc__list">
        {tree.map((item) => {
          const isActive = activeId === item.id;
          const hasChildren = item.children?.length > 0;
          return (
            <li
              key={item.id}
              className={`kpf-post-toc__item kpf-post-toc__item--h${item.level}${
                isActive ? " is-active" : ""
              }`}
            >
              <TocLink item={item} activeId={activeId} />
              {hasChildren ? (
                <ol className="kpf-post-toc__sublist">
                  {item.children.map((child) => {
                    const childActive = activeId === child.id;
                    return (
                      <li
                        key={child.id}
                        className={`kpf-post-toc__item kpf-post-toc__item--h${child.level}${
                          childActive ? " is-active" : ""
                        }`}
                      >
                        <TocLink item={child} activeId={activeId} />
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
