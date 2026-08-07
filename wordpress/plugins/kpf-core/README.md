# KPF Core

Site-specific WordPress tools for the Kevin Popke Foundation headless stack.

## Features

- Custom editorial dashboard with content metrics, readiness checks, publishing calendar, and quick actions
- Unified **Inbox** admin menu for Comments, Form submissions, and related settings
- WYSIWYG reusable component library with synced and independent patterns
- Assignable page-design library with HTML templates and CSS
- Reusable content Queries under Code for design loops (`{{#each queries.slug}}`)
- Visual Forms builder under Communications with conditional fields and Inbox handoff
- Sanitized SVG uploads in the WordPress Media Library
- GSAP interaction builder with keyframes, premium eases (CustomEase / CustomWiggle / CustomBounce / EasePack), and premium effects (DrawSVG, MorphSVG, MotionPath, SplitText, ScrambleText, TextPlugin, Physics2D / PhysicsProps)
- Versioned global stylesheet editor and design tokens manager under **Design** (headless; no WP theme UI)
- Scrapbook collection for single photos and multi-photo stories
- Grants + Grantees: awards (recipient, date, amount, check photo) and recipient organizations for the partners slider
- Events collection for Events-page cards (hosts, frequency schedule, contacts; no public archive)
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

WordPress admin → **Scrapbook** for photos and photo stories

WordPress admin → **Grants** for awards and recipient organizations (Grantees)

WordPress admin → **Events** for Events-page cards (hosts, frequency, contacts)

WordPress admin → **Pages → Designs** for HTML/CSS page designs

WordPress admin → **Code → Queries** for reusable content loops used in designs

WordPress admin → **Forms** (Communications) for the visual form builder

WordPress admin → **Interactions → GSAP** for frontend motion with the full GSAP premium plugin suite

WordPress admin → **Design** (Utilities) for Stylesheet, Tokens, and the reusable Components library

WordPress admin → **SEO**

This install is headless: the public site is Faust/Next. WordPress keeps a
minimal `kpf-blank` theme only because core requires an active theme. Appearance /
Themes / Customizer / Site Editor are removed from the admin.

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

Saved content queries (Code → Queries) can be looped in designs:

```html
{{#each queries.latest_news}}
  <a href="{{link}}">{{title}}</a>
{{/each}}

{{#if queries.latest_news.pagination.hasNext}}
  <a href="?page={{queries.latest_news.pagination.page}}">Next</a>
{{/if}}
```

Queries are stored as allowlisted JSON (post type, count, order, exclusions,
taxonomy filters, custom-field filters, related-post rules, pagination) — never
raw PHP.

## Forms builder

**Forms** (under Communications, before Inbox) is a visual builder for public
site forms. Definitions are a hidden `kpf_form` CPT with an allowlisted JSON
meta bag (`status`, settings, rows/columns, fields, conditions). Submissions
still land in **Inbox → Forms** (`kpf_form_entry`); the builder never replaces
the inbox.

**Forms → Settings** stores shared captcha keys:

- **Cloudflare Turnstile** site + secret keys (selectable when both keys are saved)
- **Google reCAPTCHA** site + secret keys, version (v2 checkbox / v3 score), and
  optional v3 minimum score

Each form’s Captcha setting only lists providers that are configured, plus
honeypot and off. Secret keys never leave WordPress; only the site key is
exposed to the Faust renderer.

Embed a form in a page design with:

```html
{{form:contact}}
```

The Faust renderer resolves that marker to `FormRenderer`, which evaluates
conditional logic (field / path / history / referrer / UTM / query / auth /
schedule), formats telephone numbers, and suggests US cities via
`/api/forms/cities`. Semantic classes are styled in **Design → Stylesheet** /
foundation CSS (`.kpf-form`, `.kpf-form__row`, `.kpf-form__col`, `.kpf-field`,
`.kpf-field__label`, `.kpf-field__control`, `.kpf-field__help`,
`.kpf-field__error`, plus type modifiers like `.kpf-field--tel`). Promote shared
values via **Design → Tokens**.

GraphQL: `kpfForm(slug)`, `kpfForms(slugs)`, and `KpfPageDesign.forms` for
batch embeds.

## Design (Utilities)

**Design** groups the global **Stylesheet**, **Tokens**, and **Components** managers.

- **Stylesheet** — versioned site-wide CSS for the Faust frontend.
- **Tokens** — inventory of CSS variables (`--token`) and classes (`.name`) from
  the global stylesheet and page designs. Create or promote managed globals
  (written into a marked block in the stylesheet). Editing a value or renaming
  a token updates matching design HTML/CSS as well.
- **Components** — reusable synced / independent Gutenberg patterns for the
  Foundation block library.

Pages → Designs remains the place to edit full design markup.

## Inbox

The default **Comments** menu is replaced with **Inbox**, which has three sections:

1. **Comments** — the normal WordPress comments screen
2. **Forms** — form submissions waiting for review (read/unread), optionally filterable by builder form slug
3. **Settings** — notification email, comment/form alert toggles, and related options

When there are pending comments or unread form submissions, an unread count badge
appears on the top-level **Inbox** item (and on the relevant submenu). Opening a
form submission marks it as read.

### Headless form endpoint

The frontend can submit contact forms to its same-origin
`POST /api/forms/submit` route. That route forwards JSON server-to-server to:

```text
POST /wp-json/kpf-inbox/v1/public/forms/submit
```

Accepted fields are `form_name`, `form_id`, `form_slug`, `name`, `email`,
`phone`, `subject`, `message`, `fields`, `context`, `captcha_token` /
`turnstile_token`, and the hidden honeypot field `website`. Classic contact
posts require a valid email plus either a message or at least one additional
field. Builder submissions may omit the top-level email when values live in
`fields`, and persist `form_slug` / definition id for inbox filtering. Optional
webhooks from the form definition fire asynchronously after a successful store.
Turnstile and reCAPTCHA modes use keys from **Forms → Settings** and verify
tokens with the provider (`kpf_forms_verify_turnstile` /
`kpf_forms_verify_recaptcha` can override). Submissions are sanitized, rate
limited, stored unread under **Inbox → Forms**, and sent through the existing
`wp_mail()` notification settings. The WordPress endpoint does not enable CORS;
browser requests should use the frontend proxy. The proxy signs each request with
the existing Faust secret so direct, unsigned writes to WordPress are rejected.

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

1. Open **Design → Components → Build a component**, or build a group of blocks in any page.
2. Save it as a WordPress pattern.
3. Choose **Synced** when changing the source should update every use.
4. Turn **Synced** off when each inserted copy should have independent text and settings.
5. Assign a **Component Group** before publishing.

Use **Design → Components → Create from upload** to start from an `.html`, `.htm`,
`.txt`, or WordPress pattern `.json` file (maximum 1 MB). Serialized Gutenberg
markup is restored exactly; ordinary HTML is converted into editable core blocks
where possible. The imported result is loaded into the editor canvas for visual
review before saving. Executable scripts are omitted for security and behavior
should be added through **Interactions → GSAP**.

Pages and posts include a **Component Library** toolbar button. It displays
saved components in their nested group hierarchy. Clicking an independent item
inserts editable blocks; clicking a synced item inserts a linked reference with
an **Edit original** action.

### Group hierarchy

**Design → Components → Manage group hierarchy** supports parent and child folders. The
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

Page, post, and assigned-front-page queries request structured Gutenberg data
through WPGraphQL Content Blocks. Faust rebuilds nested block relationships and
maps Foundation components plus common core blocks to React components. Unknown
blocks use their WordPress-rendered HTML, and the original content field remains
the fallback when structured data is unavailable. `frontend/src/styles/components.css`
mirrors the editor presentation. Disclosures use native `<details>` and
`<summary>` elements and do not require a separate JavaScript runtime.

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

## Grants & Grantees

**Grants** (Content) manage individual Foundation awards. **Grantees** nest under
the same menu and store recipient organizations (partners slider + grant
dropdown). Neither type is a public frontend route.

### Grant fields

| Field | Required | Storage |
| --- | --- | --- |
| Title | Auto | Composed: `Recipient · Mon YYYY · $amount` |
| Recipient | Yes | `_kpf_grant.grantee_id` (+ denormalized `recipient_name`) |
| Amount (USD) | Optional | `_kpf_grant.grant_amount` |
| Month + year awarded | Preferred | `_kpf_grant.awarded_month` / `awarded_year` |
| Check presentation photo | Optional | `_kpf_grant.check_photo_id` |

List table defaults to **Awarded ↓**. Recipient and Amount columns are sortable.

### Grantee fields

| Field | Required | Storage |
| --- | --- | --- |
| Business / organization name | Yes | Post title |
| Logo / profile image (JPEG, PNG, SVG) | Preferred | Featured image |
| Point of contact | Optional | `_kpf_grantee.contact_name` (admin only) |
| Website | Preferred | `_kpf_grantee.website` |
| Mission / blurb | Optional | `_kpf_grantee.blurb` |

### GraphQL

```graphql
query GrantsAndGrantees {
  grants(first: 50) {
    nodes {
      title
      grantDetails {
        granteeId
        recipientName
        grantAmount
        grantAmountLabel
        awardedMonth
        awardedYear
        awardedLabel
        checkPhotoUrl
      }
    }
  }
  grantees(first: 50) {
    nodes {
      title
      featuredImage {
        node {
          sourceUrl
        }
      }
      granteeDetails {
        contactName
        website
        blurb
        organization
        logoUrl
      }
    }
  }
}
```

### REST

```text
GET /wp-json/wp/v2/kpf_grant
GET /wp-json/wp/v2/kpf_grant/{id}
GET /wp-json/wp/v2/kpf_grantee
GET /wp-json/wp/v2/kpf_grantee/{id}
```

Editable meta: `meta._kpf_grant` / `meta._kpf_grantee`. Read-only
`grantDetails` / `granteeDetails` resolve labels and media URLs.

A one-shot migrator (`kpf_grants_split_v1`) splits legacy combined grantee posts
into canonical organizations + grant awards while preserving logos and check photos.

## Events

**Events** (Content) manage cards for the mostly-static Events page. Entries are
admin + API only (no public archive routes). Manage reusable **Hosts** (name +
logo) under **Events → Hosts**, then assign them on each event.

### Fields

| Field | Storage |
| --- | --- |
| Title | Post title |
| Host(s) + logo | `kpf_event_host` + `_kpf_host_logo` |
| Logline | `_kpf_event.logline` |
| Description | `_kpf_event.description` |
| Contact email / phone / website | `_kpf_event.contact_*` / `website` |
| Location (area / address / directions) | `_kpf_event.location` |
| Frequency + schedule | `_kpf_event.frequency` + `schedule` + `duration_days` |

Location modes:
- `area` — city/state and/or ZIP (optional place name)
- `address` — street address + city/state/ZIP
- `directions` — custom URL for driving directions (hotel, venue map, etc.)

For `area` and `address`, leave the custom URL blank to auto-build a Google Maps
directions link from the filled fields. GraphQL exposes `location.display` and
`location.mapsUrl` for cards.

Frequencies: one time, weekly, monthly, quarterly, semiannually, annually.
Schedule details are preferred; when blank, `scheduleLabel` falls back to the
frequency name (e.g. `Quarterly`).

### GraphQL

```graphql
query Events {
  foundationEvents(first: 50) {
    nodes {
      title
      featuredImage { node { sourceUrl } }
      eventDetails {
        logline
        description
        contactEmail
        contactPhone
        website
        location {
          mode
          label
          line1
          line2
          city
          state
          postalCode
          url
          display
          mapsUrl
        }
        frequency
        durationDays
        scheduleLabel
        hosts { name slug logoUrl }
      }
    }
  }
}
```

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
