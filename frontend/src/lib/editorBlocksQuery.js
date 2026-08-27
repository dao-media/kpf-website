const KPF_EDITOR_BLOCKS_QUERY_BODY = `
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
    ... on KpfCigar {
      attributes {
        anchor
        cigarAlt
        cigarId
        cigarUrl
        smokeId
        smokeUrl
      }
    }
  }
`;

// DreamHost staging is missing WPGraphQL Content Blocks; skip this field
// there so Faust can build. Local wp-env still queries editorBlocks.
const KPF_EDITOR_BLOCKS_QUERY =
  process.env.KPF_SKIP_EDITOR_BLOCKS === "1"
    ? ""
    : KPF_EDITOR_BLOCKS_QUERY_BODY;

module.exports = { KPF_EDITOR_BLOCKS_QUERY };
