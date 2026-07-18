# KPF Core

Site-specific WordPress tools for the Kevin Popke Foundation headless stack.

## Features

- Custom editorial dashboard with content metrics, readiness checks, publishing calendar, and quick actions
- Unified **Inbox** admin menu for Comments, Form submissions, and related settings
- WYSIWYG reusable component library with synced and independent patterns
- Assignable page-design library with HTML templates and CSS
- Sanitized SVG uploads in the WordPress Media Library
- GSAP interaction builder with keyframes, custom easing, and SVG effects
- Versioned global stylesheet editor under Appearance
- Scrapbook collection for single photos and multi-photo stories
- Global, per-post-type, and per-entity metadata inheritance
- Yoast-style dynamic tags (`%%title%%`, `%%sitename%%`, …) with click-to-copy library
- Open Graph, X/Twitter, robots, canonical, custom meta tags
- JSON-LD schema (`Organization`, `WebSite`, `WebPage`, `Article`, `BreadcrumbList`)
- AI crawler controls in `robots.txt` (allow, block, or no special rules)
- Frontend-domain XML sitemaps + `robots.txt`
- Redirect manager with exact/regex matching and loop protection
- WPGraphQL `kpfSeo` / `kpfSeoHome` fields for Faust

## Admin

WordPress admin → **Dashboard** for the foundation content and site-readiness overview

WordPress admin → **Inbox** for comments, form submissions, and notification settings

WordPress admin → **Components** for the reusable component library

WordPress admin → **Scrapbook** for photos and photo stories

WordPress admin → **Pages → Designs** for HTML/CSS page designs

WordPress admin → **Interactions → GSAP** for frontend motion and SVG animation

WordPress admin → **Appearance → Stylesheet** for global frontend CSS and version history

WordPress admin → **SEO**

Editor sidebar → **Scrapbook details** or **Search & sharing**, depending on the content type

## Page designs

**Pages → Designs** lists every page URL on the site. Rows without a design file
are marked red; rows with uploaded markup show green **Ready**. Upload an `.html`
file (and optional `.css`) per URL from that screen. HTML templates may still
contain sanitized inline SVG whose paths and groups can be targeted by GSAP selectors.

Ready designs include an **Edit code & copy** workspace. Its left sidebar
extracts visible text, image alt text, labels, and form copy into editor-friendly
fields; changing a field updates the matching markup without reformatting the
rest of the source. The main pane provides syntax-highlighted HTML and CSS editing.
Saves are sanitized and use revision tokens to prevent overwriting a newer edit.
Each save is added to **Version history**, where an earlier HTML/CSS pair can be
restored without losing the current version. Administrators can choose how many
versions to retain (2–100) from the Designs list.

Each page can have one active design. Optional page-specific placeholder values
can be managed in the Page editor under **Page design**.

HTML templates use escaped placeholders such as `{{page.title}}`,
`{{page.featuredImage.url}}`, and `{{fields.hero_heading}}`. Rendered WordPress
block content is the one intentionally raw value and uses
`{{{page.content}}}`.

## Inbox

The default **Comments** menu is replaced with **Inbox**, which has three sections:

1. **Comments** — the normal WordPress comments screen
2. **Forms** — form submissions waiting for review (read/unread)
3. **Settings** — notification email, comment/form alert toggles, and related options

When there are pending comments or unread form submissions, an unread count badge
appears on the top-level **Inbox** item (and on the relevant submenu). Opening a
form submission marks it as read.

## Reusable components

The component library uses normal WordPress blocks and patterns, so editors can
build visually without learning a separate page builder.

### Included blocks

- **Foundation Button** — editable label, destination, new-tab behavior, style, size, and alignment
- **Show/Hide Disclosure** — accessible question/answer or expandable content using native browser controls
- **Story Card** — optional image, heading, summary, destination, and visual style
- **Foundation Notice** — information, success, or warning messages
- **Call to Action** — heading, body, layout, color theme, and nested actions or components
- **Container** — a div/section/aside wrapper for grouping any blocks and Foundation components

Disclosure, Call to Action, and Container allow nested layout blocks (Group, Columns,
Row/Stack), core content blocks, other Foundation components, and saved patterns so
editors can compose freely in the component builder.

### Saving and reusing

1. Open **Components → Build a component**, or build a group of blocks in any page.
2. Save it as a WordPress pattern.
3. Choose **Synced** when changing the source should update every use.
4. Turn **Synced** off when each inserted copy should have independent text and settings.
5. Assign a **Component Group** before publishing.

Pages and posts include a **Component Library** toolbar button. It displays
saved components in their nested group hierarchy. Clicking an independent item
inserts editable blocks; clicking a synced item inserts a linked reference with
an **Edit original** action.

### Group hierarchy

**Components → Manage group hierarchy** supports parent and child folders. The
starter structure is:

```text
Foundation Components
├── Actions
├── Content
└── Information
```

Additional levels can be added for campaigns, events, departments, or any other
editorial structure. Filtering a parent group includes its descendants.

### Frontend delivery

Page, post, and assigned-front-page queries request rendered WordPress content.
Faust renders the static block markup through `WordPressContent`, while
`frontend/src/styles/components.css` mirrors the editor presentation.
Disclosures use native `<details>` and `<summary>` elements and do not require a
separate JavaScript runtime.

## Scrapbook

Each Scrapbook item uses the normal WordPress title and story editor, plus a
**Scrapbook details** sidebar panel.

### Editor workflow

1. Choose **One photo** or **A story with several photos**.
2. Select images from the Media Library.
3. Add a screen-reader description and optional per-story caption to each image.
4. Move story images up or down to set their order.
5. Add the date precision, known date, place, photographer, source, and historical notes.
6. Optionally mark the item as featured or assign a manual order.
7. Publish.

The first selected image becomes the cover image when no cover has been chosen
manually. Exact and approximate dates are grouped into a Decade automatically.
The collection is API-only for now and does not create public WordPress routes.

### Scrapbook data shape

The `_kpf_scrapbook` post meta object contains:

- `entry_type`: `photo` or `story`
- `event_date` and `date_precision`: `exact`, `month`, `year`, `decade`, or `unknown`
- `location`, `photographer`, `source`, and `historical_notes`
- `featured` and `display_order`
- `images`: ordered attachment references with per-placement `alt_text` and `caption`

Per-placement image text does not overwrite the shared Media Library attachment.

### REST

Core REST endpoints are enabled:

```text
GET /wp-json/wp/v2/kpf_scrapbook
GET /wp-json/wp/v2/kpf_scrapbook/{id}
```

The editable object is available at `meta._kpf_scrapbook`. The read-only
`scrapbookDetails` field also includes resolved image URLs, dimensions, MIME
types, alt text, captions, and indexes.

Collection filters can be combined:

```text
?entry_type=story
&featured=true
&decade=1990
&orderby=display_order
```

### WPGraphQL

```graphql
query Scrapbook {
  scrapbookItems(
    first: 20
    where: { featured: true, entryType: STORY, orderByDisplay: true }
  ) {
    nodes {
      databaseId
      title
      content
      scrapbookDecades {
        nodes {
          name
          slug
        }
      }
      scrapbookDetails {
        entryType
        eventDate
        datePrecision
        location
        photographer
        source
        historicalNotes
        featured
        displayOrder
        images {
          attachmentId
          sourceUrl
          srcSet
          width
          height
          mimeType
          altText
          caption
          index
          mediaItem {
            databaseId
            sourceUrl
          }
        }
      }
      kpfSeo {
        title
        description
        canonical
      }
    }
  }
}
```

Connection filters:

- `entryType: PHOTO | STORY`
- `featured: Boolean`
- `decade: String` using a decade slug such as `1990`
- `orderByDisplay: true` for manual order, then newest first

## Dynamic tags

Templates use `%%token%%` syntax. Unknown tags resolve to empty strings. Custom fields require an allowlist:

```php
add_filter('kpf_seo_allowed_custom_fields', function (array $keys, int $post_id): array {
	$keys[] = 'subtitle';
	return $keys;
}, 10, 2);
```

Extend the registry:

```php
add_action('kpf_seo_register_tags', function (callable $register): void {
	$register('brand', [
		'label' => 'Brand',
		'description' => 'Foundation brand name',
		'group' => 'Site',
		'callback' => fn () => 'Kevin Popke Foundation',
	]);
});
```

## Precedence

1. Entity override (`_kpf_seo` post meta)
2. Post-type defaults
3. Global defaults
4. Safe system fallbacks

`null`/blank templates inherit. Explicit empty strings are treated as inherit for template fields.

## Public REST endpoints

| Endpoint | Purpose |
|---|---|
| `GET /wp-json/kpf-seo/v1/public/redirect?path=` | Frontend redirect lookup |
| `GET /wp-json/kpf-seo/v1/public/robots` | robots.txt body |
| `GET /wp-json/kpf-seo/v1/public/sitemap` | Sitemap index JSON |
| `GET /wp-json/kpf-seo/v1/public/sitemap/{type}/{page}` | Sitemap page JSON |

## Frontend delivery

Faust templates query `kpfSeo` and render [`frontend/src/components/SeoHead.js`](../../../frontend/src/components/SeoHead.js).

Rewrites in `frontend/next.config.js` expose:

- `/robots.txt`
- `/sitemap.xml`
- `/sitemap-{type}-{page}.xml`

Redirects are applied in `frontend/src/middleware.js`.

## Build admin assets

```bash
cd wordpress/plugins/kpf-core
npm install
npm run build
```

## Smoke tests

```bash
npm run test:seo
npm run test:scrapbook
npm run test:components
npm run test:inbox
```
