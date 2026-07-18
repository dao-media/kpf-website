import { Fragment } from "react";

const {
  buildBlockTree,
  containerClassName,
  safeUrl,
} = require("./blockData");

export const KPF_EDITOR_BLOCKS_QUERY = `
  editorBlocks(flat: true) {
    __typename
    clientId
    parentClientId
    name
    renderedHtml
    ... on CoreParagraph {
      attributes {
        align
        anchor
        className
        content
        cssClassName
      }
    }
    ... on CoreHeading {
      attributes {
        align
        anchor
        className
        content
        cssClassName
        level
      }
    }
    ... on CoreQuote {
      attributes {
        align
        anchor
        citation
        className
        cssClassName
        value
      }
    }
    ... on CoreGallery {
      attributes {
        align
        anchor
        className
        columns
        imageCrop
        linkTarget
        linkTo
        sizeSlug
        images {
          alt
          caption
          fullUrl
          id
          link
          url
        }
      }
    }
    ... on CoreImage {
      attributes {
        align
        alt
        anchor
        caption
        className
        cssClassName
        height
        href
        id
        linkTarget
        sourceUrl: url
        width
      }
    }
    ... on KpfButton {
      attributes {
        alignment
        opensInNewTab
        size
        text
        url
        variant
      }
    }
    ... on KpfDisclosure {
      attributes {
        anchor
        openInitially
        summary
      }
    }
    ... on KpfCard {
      attributes {
        anchor
        body
        heading
        imageAlt
        imageId
        imageUrl
        linkText
        url
        variant
      }
    }
    ... on KpfNotice {
      attributes {
        anchor
        body
        heading
        tone
      }
    }
    ... on KpfCallToAction {
      attributes {
        align
        anchor
        body
        eyebrow
        heading
        layout
        theme
      }
    }
    ... on KpfContainer {
      attributes {
        align
        anchor
        contentWidth
        padding
        tagName
        theme
      }
    }
  }
`;

function RichText({ as = "span", className, html }) {
  const Element = as;
  if (!html) {
    return null;
  }

  return (
    <Element
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function alignmentClass(align) {
  return align ? `has-text-align-${align}` : "";
}

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

function CoreParagraph({ attributes = {} }) {
  return (
    <RichText
      as="p"
      className={joinClasses(
        attributes.cssClassName || attributes.className,
        alignmentClass(attributes.align),
      )}
      html={attributes.content}
    />
  );
}

function CoreHeading({ attributes = {} }) {
  const level = Math.min(6, Math.max(1, Number(attributes.level) || 2));
  const Heading = `h${level}`;

  return (
    <RichText
      as={Heading}
      className={joinClasses(
        attributes.cssClassName || attributes.className,
        alignmentClass(attributes.align),
      )}
      html={attributes.content}
    />
  );
}

function CoreQuote({ attributes = {} }) {
  return (
    <blockquote
      id={attributes.anchor || undefined}
      className={joinClasses(
        "wp-block-quote",
        attributes.cssClassName || attributes.className,
        attributes.align ? `align${attributes.align}` : "",
      )}
    >
      <RichText as="div" html={attributes.value} />
      <RichText as="cite" html={attributes.citation} />
    </blockquote>
  );
}

function GalleryImage({ image, linkTarget }) {
  const src = safeUrl(image?.url || image?.fullUrl, { allowHash: false });
  if (!src) {
    return null;
  }

  const media = (
    <>
      {/* Gutenberg image dimensions are author-controlled and not always known. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={image?.alt || ""} loading="lazy" />
      <RichText as="figcaption" html={image?.caption} />
    </>
  );
  const href = safeUrl(image?.link);

  return (
    <figure className="wp-block-image">
      {href ? (
        <a
          href={href}
          target={linkTarget || undefined}
          rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
        >
          {media}
        </a>
      ) : (
        media
      )}
    </figure>
  );
}

function CoreGallery({ attributes = {} }) {
  const columns = Number(attributes.columns) || undefined;
  const classes = joinClasses(
    "wp-block-gallery has-nested-images",
    columns ? `columns-${columns}` : "",
    attributes.imageCrop === false ? "is-cropped-false" : "is-cropped",
    attributes.align ? `align${attributes.align}` : "",
    attributes.className,
  );

  return (
    <figure id={attributes.anchor || undefined} className={classes}>
      {(attributes.images || []).map((image, index) => (
        <GalleryImage
          key={image?.id || image?.url || index}
          image={image}
          linkTarget={attributes.linkTarget}
        />
      ))}
    </figure>
  );
}

function CoreImage({ attributes = {} }) {
  const src = safeUrl(attributes.sourceUrl, { allowHash: false });
  if (!src) {
    return null;
  }

  const image = (
    // Gutenberg allows editors to set dimensions independently.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={attributes.alt || ""}
      width={attributes.width || undefined}
      height={attributes.height || undefined}
      className={attributes.id ? `wp-image-${attributes.id}` : undefined}
      loading="lazy"
    />
  );
  const href = safeUrl(attributes.href);

  return (
    <figure
      id={attributes.anchor || undefined}
      className={joinClasses(
        "wp-block-image",
        attributes.align ? `align${attributes.align}` : "",
        attributes.cssClassName || attributes.className,
      )}
    >
      {href ? (
        <a
          href={href}
          target={attributes.linkTarget || undefined}
          rel={
            attributes.linkTarget === "_blank"
              ? "noopener noreferrer"
              : undefined
          }
        >
          {image}
        </a>
      ) : (
        image
      )}
      <RichText as="figcaption" html={attributes.caption} />
    </figure>
  );
}

function KpfButton({ attributes = {} }) {
  const href = safeUrl(attributes.url);
  const opensInNewTab = Boolean(attributes.opensInNewTab);

  return (
    <div
      className={joinClasses(
        "kpf-button",
        `kpf-button--${attributes.variant || "primary"}`,
        `kpf-button--${attributes.size || "medium"}`,
        alignmentClass(attributes.alignment || "left"),
      )}
    >
      <a
        className="kpf-button__link"
        href={href}
        target={opensInNewTab ? "_blank" : undefined}
        rel={opensInNewTab ? "noopener noreferrer" : undefined}
      >
        <RichText
          className="kpf-button__label"
          html={attributes.text || "Learn more"}
        />
      </a>
    </div>
  );
}

function KpfDisclosure({ attributes = {}, children }) {
  return (
    <details
      id={attributes.anchor || undefined}
      className="kpf-disclosure"
      open={attributes.openInitially || undefined}
    >
      <RichText
        as="summary"
        className="kpf-disclosure__summary"
        html={attributes.summary}
      />
      <div className="kpf-disclosure__content">{children}</div>
    </details>
  );
}

function KpfCard({ attributes = {} }) {
  const imageUrl = safeUrl(attributes.imageUrl, { allowHash: false });
  const href = safeUrl(attributes.url);

  return (
    <article
      id={attributes.anchor || undefined}
      className={`kpf-card kpf-card--${attributes.variant || "paper"}`}
    >
      {imageUrl ? (
        <figure className="kpf-card__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={attributes.imageAlt || ""}
            className={
              attributes.imageId ? `wp-image-${attributes.imageId}` : undefined
            }
            loading="lazy"
          />
        </figure>
      ) : null}
      <div className="kpf-card__content">
        <RichText
          as="h3"
          className="kpf-card__heading"
          html={attributes.heading}
        />
        <RichText
          as="p"
          className="kpf-card__body"
          html={attributes.body}
        />
        {href ? (
          <a className="kpf-card__link" href={href}>
            <RichText
              className="kpf-card__link-label"
              html={attributes.linkText || "Read the story"}
            />
            <span aria-hidden="true"> →</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

function KpfNotice({ attributes = {} }) {
  return (
    <aside
      id={attributes.anchor || undefined}
      className={`kpf-notice kpf-notice--${attributes.tone || "information"}`}
    >
      <span className="kpf-notice__icon" aria-hidden="true">
        i
      </span>
      <div>
        <RichText
          as="h3"
          className="kpf-notice__heading"
          html={attributes.heading}
        />
        <RichText
          as="p"
          className="kpf-notice__body"
          html={attributes.body}
        />
      </div>
    </aside>
  );
}

function KpfCallToAction({ attributes = {}, children }) {
  return (
    <section
      id={attributes.anchor || undefined}
      className={joinClasses(
        "kpf-cta",
        `kpf-cta--${attributes.theme || "ink"}`,
        `kpf-cta--${attributes.layout || "stacked"}`,
        attributes.align ? `align${attributes.align}` : "",
      )}
    >
      <div className="kpf-cta__copy">
        <RichText
          as="p"
          className="kpf-cta__eyebrow"
          html={attributes.eyebrow}
        />
        <RichText
          as="h2"
          className="kpf-cta__heading"
          html={attributes.heading}
        />
        <RichText
          as="p"
          className="kpf-cta__body"
          html={attributes.body}
        />
      </div>
      <div className="kpf-cta__actions">{children}</div>
    </section>
  );
}

function KpfContainer({ attributes = {}, children }) {
  const allowedTags = new Set(["div", "section", "aside"]);
  const Element = allowedTags.has(attributes.tagName)
    ? attributes.tagName
    : "div";

  return (
    <Element
      id={attributes.anchor || undefined}
      className={joinClasses(
        containerClassName(attributes),
        attributes.align ? `align${attributes.align}` : "",
      )}
    >
      {children}
    </Element>
  );
}

function HtmlFallback({ block }) {
  if (!block?.renderedHtml) {
    return null;
  }

  return (
    <div
      data-wp-block={block.name || undefined}
      dangerouslySetInnerHTML={{ __html: block.renderedHtml }}
    />
  );
}

const BLOCK_COMPONENTS = {
  "core/gallery": CoreGallery,
  "core/heading": CoreHeading,
  "core/image": CoreImage,
  "core/paragraph": CoreParagraph,
  "core/quote": CoreQuote,
  "kpf/button": KpfButton,
  "kpf/call-to-action": KpfCallToAction,
  "kpf/card": KpfCard,
  "kpf/container": KpfContainer,
  "kpf/disclosure": KpfDisclosure,
  "kpf/notice": KpfNotice,
};

export function hasMappedBlock(name) {
  return Boolean(BLOCK_COMPONENTS[name]);
}

function RenderBlock({ block }) {
  const Component = BLOCK_COMPONENTS[block?.name];
  if (!Component) {
    return <HtmlFallback block={block} />;
  }

  return (
    <Component attributes={block.attributes || {}} block={block}>
      {(block.innerBlocks || []).map((child, index) => (
        <RenderBlock
          key={child.clientId || `${child.name || "block"}-${index}`}
          block={child}
        />
      ))}
    </Component>
  );
}

export default function BlockRenderer({ blocks }) {
  const tree = buildBlockTree(blocks);

  return (
    <>
      {tree.map((block, index) => (
        <Fragment key={block.clientId || `${block.name || "block"}-${index}`}>
          <RenderBlock block={block} />
        </Fragment>
      ))}
    </>
  );
}
