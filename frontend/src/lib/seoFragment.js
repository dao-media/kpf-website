const KPF_SEO_FRAGMENT = `
  kpfSeo {
    title
    description
    canonical
    robots {
      index
      follow
      noarchive
      nosnippet
    }
    openGraph {
      title
      description
      imageUrl
      type
      url
      section
      tags
    }
    twitter {
      card
      site
      title
      description
      imageUrl
    }
    customMeta {
      name
      property
      content
      rel
      href
      media
    }
    schemaJson
    focusKeyphrase
    primaryCategory {
      id
      name
      slug
      url
    }
    primaryTopic {
      id
      name
      slug
      url
    }
    breadcrumbs {
      name
      url
    }
  }
`;

module.exports = { KPF_SEO_FRAGMENT };
