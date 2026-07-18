# Kevin Popke Foundation

Headless WordPress (Faust.js + Next.js) for the Kevin Popke Foundation site.

## Stack

- **Frontend:** Faust.js / Next.js in `frontend/`
- **Backend:** Local WordPress via `@wordpress/env` (Docker)
- **Custom plugin:** `wordpress/plugins/kpf-core` (includes reusable components, Scrapbook, and the custom SEO suite)
- **Icons:** Lucide via `lucide-react` ([dao-media/LucideIcons](https://github.com/dao-media/LucideIcons))

## Prerequisites

- Node.js 20.9+
- Docker Desktop running

## Quick start

```bash
# Start WordPress (http://localhost:8888)
npm run wp:start

# In another terminal, start the Faust frontend (http://localhost:3000)
npm --prefix frontend run dev
```

Or from the repo root after WordPress is up:

```bash
npm run generate   # refresh GraphQL possibleTypes from WP
npm --prefix frontend run dev
```

## Lucide icons (frontend)

Icons come from Lucide (`lucide-react`), matching the icon set in
[dao-media/LucideIcons](https://github.com/dao-media/LucideIcons). Browse names at
[lucide.dev/icons](https://lucide.dev/icons/).

### Preferred: named import

```jsx
import { Heart, ArrowRight, Mail } from 'lucide-react';

export function Example() {
  return (
    <button type="button">
      <Heart size={20} aria-hidden="true" />
      Donate
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}
```

### Dynamic name (CMS / config)

```jsx
import Icon from '@/components/Icon';

<Icon name="Heart" size={20} label="Favorite" />
<Icon name="ArrowRight" size={16} />
```

Props (`size`, `strokeWidth`, `color`, `className`) pass through to Lucide. Use
`label` when the icon is meaningful alone; otherwise it is marked decorative.

Tree-shaking works best with named imports (`import { Heart } from 'lucide-react'`).
Avoid `import * as Icons from 'lucide-react'` in hot paths.
## WordPress admin

| | |
|---|---|
| URL | http://localhost:8888/wp-admin |
| Username | `admin` |
| Password | `1234` |

Credentials are applied automatically by `scripts/wp-bootstrap.sh` whenever `wp-env` starts.

## SEO suite

Top-level **SEO** menu in wp-admin covers site defaults, content types, social sharing, structured data, sitemaps, redirects, and automatic placeholders. Its help text is written for non-technical editors. Per-page/post overrides live in the **Search & sharing** editor panel.

- Dynamic tags use Yoast-style `%%token%%` syntax (click-to-copy in admin + editor)
- Resolved metadata is exposed to Faust via WPGraphQL (`kpfSeo`, `kpfSeoHome`)
- Frontend serves `/robots.txt`, `/sitemap.xml`, and redirect middleware
- Plugin docs: [`wordpress/plugins/kpf-core/README.md`](wordpress/plugins/kpf-core/README.md)

## Reusable component library

Top-level **Components** menu in wp-admin provides a WYSIWYG library for buttons,
show/hide disclosures, cards, notices, and call-to-action sections.

- Save a component as **Synced** to update every use from one source.
- Save it as **Not synced** to give each inserted copy independent text and settings.
- Organize saved components with nested **Component Groups**.
- Insert saved items from the **Component Library** toolbar button in page and post editors.
- WPGraphQL Content Blocks exposes Gutenberg content as structured block data.
- Faust maps Foundation blocks, paragraphs, headings, quotes, galleries, and images
  to React components; unsupported blocks retain WordPress-rendered HTML as a fallback.

Starter groups and components are created automatically. Full editor instructions
and the developer contract are in
[`wordpress/plugins/kpf-core/README.md`](wordpress/plugins/kpf-core/README.md).

## Scrapbook collection

Top-level **Scrapbook** menu in wp-admin manages both single photos and multi-photo stories. Each item supports:

- Ordered Media Library images with per-story captions and accessibility descriptions
- Exact, month, year, decade, or unknown historical dates
- Place, photographer, source, and historical notes
- Featured status and manual display order
- Automatic Decade grouping
- REST and typed WPGraphQL access

This release is API-only: it does not add visible Scrapbook pages to Faust yet.
See [`wordpress/plugins/kpf-core/README.md`](wordpress/plugins/kpf-core/README.md)
for the schema and query examples.

Rebuild WordPress admin assets after UI changes:

```bash
npm run build:seo
```

Run SEO smoke tests:

```bash
npm run test:seo
npm run test:scrapbook
npm run test:components
npm run test:blocks-graphql
npm run test:inbox
```

## Useful commands

| Command | What it does |
|---|---|
| `npm run wp:start` | Start local WordPress |
| `npm run wp:stop` | Stop local WordPress |
| `npm run wp:destroy` | Tear down containers/volumes |
| `npm run wp:cli -- <args>` | Run WP-CLI inside the env |
| `npm run generate` | Regenerate Faust `possibleTypes.json` |
| `npm run build:seo` | Build KPF SEO admin/editor assets |
| `npm run test:seo` | Run SEO smoke tests in wp-env |
| `npm run test:scrapbook` | Run Scrapbook model, REST, GraphQL, and SEO integration checks |
| `npm run test:components` | Run reusable block, hierarchy, pattern, and accessibility checks |
| `npm run test:blocks-graphql` | Verify Gutenberg blocks and nested relationships over WPGraphQL |
| `npm run test:inbox` | Run Inbox menu, forms, and unread badge checks |

## Notes

- Frontend env lives in `frontend/.env.local` (not committed). Copy from `frontend/.env.local.example` if needed; bootstrap syncs the Faust secret from WordPress.
- Public pages now render WordPress content and reusable component styles; broader site content and layout remain intentionally minimal.
