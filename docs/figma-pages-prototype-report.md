# KPF Figma Pages & Prototype Report

**File:** [Kevin Popke Foundation](https://www.figma.com/design/Iz5XryrkvcSuW2wIIOFM0I/Kevin-Popke-Foundation)  
**File key:** `Iz5XryrkvcSuW2wIIOFM0I`  
**Design system:** Option 3 — Documentary Ember  
**Report date:** 2026-08-06  
**Canvas focus:** `Pages` (primary), with `Design System`, `Mockups`, and `Notes` also in the file

This document records the page frames, breakpoint structure, section orientations, media treatments, and prototype wiring set up across the Figma file.

---

## 1. File structure

| Figma page | Role |
|---|---|
| **Pages** | Production site frames for all routes × breakpoints |
| **Design System** | Components, variants, tokens (buttons, nav, sidebar, mobile menu, fields, etc.) |
| **Mockups** | Earlier homepage exploration options (Option 1–3) and brand concepts |
| **Notes** | Working notes |

Breakpoints used everywhere on **Pages**:

| Breakpoint | Width | Typical nav |
|---|---|---|
| **Desktop** | 1440 | Full link row + Donate |
| **Tablet** | 768 | Brand + Donate + hamburger (`Mobile Nav Menu`) |
| **Mobile** | 390 | Brand + Donate + hamburger (`Mobile Nav Menu`) |

---

## 2. Page inventory (node IDs)

| Route | Desktop | Tablet | Mobile |
|---|---|---|---|
| **Homepage** | `414:532` | `416:672` | `418:202` |
| **About** | `798:656` | `803:674` | `804:674` |
| **Events** | `890:1210` | `892:1663` | `893:2011` |
| **Blog** (archive) | `939:2123` | `939:2396` | `939:2612` |
| **Blog Post** | `939:2828` | `944:2825` | `944:3054` |
| **Contact** | `956:2439` | `956:2802` | `956:3045` |

Open the Pages canvas, then jump via node id in the URL (`?node-id=956-3045` style).

---

## 3. Per-page section structure

Sections are top-to-bottom auto-layout stacks on each page frame. Names below are the live layer names.

### 3.1 Homepage

| Order | Desktop | Tablet / Mobile |
|---|---|---|
| 1 | Hero (`Desktop - 1` / `iPhone 16 - 1`) | Same pattern |
| 2 | Partners | Partners |
| 3 | His Story | His Story |
| 4 | Values | Values |
| 5 | Programs | Programs |
| 6 | Archive (desktop) | — |
| 7 | Donate (accordions) | Donate |
| 8 | Footer | Footer |
| — | — | `Mobile Nav Menu` (absolute, page-level) |

**Orientation notes**
- Hero is full-bleed photo with isolated cutouts / brand-forward composition.
- Programs uses cream section fill; dunes cutout lives on the dedicated dunes layer (not the section fill).
- Donate section uses accordion `CHANGE_TO` open/closed variants.

### 3.2 About

| Order | Section |
|---|---|
| 1 | Hero / `01 Hero` |
| 2 | History — stacked image slider + story card |
| 3 | Mission |
| 4 | What we've funded (grantees) |
| 5 | Gallery — organization photos |
| 6 | Closing CTA |
| 7 | Footer |
| — | `Mobile Nav Menu` on tablet/mobile |

**Hero orientation**
- Left: tilted framed photo (`Frame 13` / `Hero photo`) — `Frame_1` cutout, `FIT`.
- Right: ABOUT eyebrow, title, body, CTAs (`Our mission` / `Who Kevin was`).
- Background: soft-edged Tampa Bay aerial cutouts (`Tampa Bay_1/2/3` by breakpoint), not a dark full-bleed scrim.
- Desktop hero ~560px tall; content is light-on-cream / ink text (not the Events dark photo hero).

**History stack orientation** (`800:666` History split on desktop)
- Dark tartan tile + radial ember wash on the media/card host.
- Fan of four cutouts, shared bottom baseline, scales ~100% → 88% → 77% → 68%, trail to the left:
  1. **FRONT** — Kevin in tactical vest  
  2. **Layer 1 (88%)** — `kevin-wife` couple cutout  
  3. **Layer 2 (77%)** — triathlon / race bib  
  4. **BACK (68%)** — faded companion cutout  
- Story card on the right (desktop) / below (tablet & mobile) with pagination dots.

### 3.3 Events

| Order | Section |
|---|---|
| 1 | `01 Hero` |
| 2 | `02 Context — Partnership` |
| 3 | `03 Featured — Songwriters for Vets` |
| 4 | `04 Event library` |
| 5 | Closing CTA |
| 6 | Footer |
| — | `Mobile Nav Menu` on tablet/mobile |

**Hero orientation**
- Dark photo hero (Songwriters imagery) + solid + radial gradient overlays.
- Desktop treatment was copied to tablet (`892:1664`) and mobile (`893:2012`) so all three match.
- Copy: “What funds our mission” / “Kevin Popke Foundation events” + dual CTAs.
- Mobile CTAs stack vertically so they fit the 390 width.

### 3.4 Blog (archive)

| Order | Desktop / Tablet | Mobile |
|---|---|---|
| 1 | Hero | Hero |
| 2 | — | Featured story |
| 3 | Archive (rows / cards) | Archive |
| 4 | Closing CTA | Closing CTA |
| 5 | Footer | Footer |

Blog rows / featured cards prototype to **Blog Post** at the same breakpoint.

### 3.5 Blog Post

| Order | Section |
|---|---|
| 1 | Hero |
| 2 | Article body |
| 3 | Comments |
| 4 | Related stories |
| 5 | Closing CTA |
| 6 | Footer |

Related rows navigate back to the Blog archive. Blog Post tablet/mobile menus are left **Open** in the file for inspection; other pages stay **Closed**.

### 3.6 Contact

| Order | Section |
|---|---|
| 1 | Hero (`Let’s Connect` / `Contact us`) |
| 2 | `02 Context — Partnership` (form + sidebar copy) |
| 3 | Closing CTA |
| 4 | Footer |

**Contact specifics**
- Cloned from About, then retargeted: About-style framed hero photo hidden; hero uses bridge/photo + gradient treatment aligned to desktop.
- Form fields: First / Last, Phone / Email, message; Start Over + Send message.
- Tablet form: 2-column fields. Mobile: single column.
- Sidebar copy: “We’d love to hear from you” + grants/events/partnership body.
- Mobile + tablet include `Mobile Nav Menu` aligned to the nav `Menu slot`.

---

## 4. Navigation & prototype wiring

### 4.1 Destinations by breakpoint

Prototype `NAVIGATE` actions always stay **within the same breakpoint** (desktop↔desktop, tablet↔tablet, mobile↔mobile).

| Label | Desktop | Tablet | Mobile |
|---|---|---|---|
| Home | `414:532` | `416:672` | `418:202` |
| About | `798:656` | `803:674` | `804:674` |
| Events | `890:1210` | `892:1663` | `893:2011` |
| Blog | `939:2123` | `939:2396` | `939:2612` |
| Contact | `956:2439` | `956:2802` | `956:3045` |
| Blog Post | `939:2828` | `944:2825` | `944:3054` |

Transition used for page changes: **Dissolve**, ~0.3s, ease-out.

### 4.2 What is wired

**Desktop**
- Brand → Home  
- Nav links → matching pages (skip same-page)  
- Primary buttons / CTAs by label (Donate, Learn about, See events, Get in touch, Partner, etc.)  
- Blog cards / featured → Blog Post  
- Footer explore/connect links  

**Tablet & mobile**
- Same label routing as desktop, targeting tablet/mobile frame IDs  
- `Mobile Nav Menu` hamburger: `CHANGE_TO` Open / Closed  
- Open panel **Sidebar** items: `ON_CLICK` → `NAVIGATE` to that breakpoint’s page (hover `CHANGE_TO` preserved)  
- Same-page sidebar labels are intentionally **not** given `NAVIGATE` (Figma rejects same-frame destinations)

### 4.3 Mobile Nav Menu mechanics

| Item | Detail |
|---|---|
| Component | `Mobile Nav Menu` (`950:566`) — variants `State=Closed` / `State=Open` |
| Placement | Absolute child of the **page frame** (not trapped inside hero/nav clip) |
| Hit target | Closed 44×44 over empty `Menu slot` in the nav |
| Constraints | `MIN` / `MIN` so `x,y` stay true top-left inside the frame (avoid `MAX`, which pushed icons outside) |
| Wiring method | Per-instance: open → attach Sidebar navigations → close (Blog Post left Open) |
| Why per-instance | Shared component cannot hold both tablet and mobile destination IDs |

Approximate closed positions (menu top-left inside frame):

| Page | Mobile (x,y) | Tablet (x,y) |
|---|---|---|
| Homepage | 323, 32 | 698, 32 |
| About / Events / Blog / Contact | 316, 32 | ~674–682, 32 |

### 4.4 Reaction volume (sample)

Rough counts of `NAVIGATE` / `CHANGE_TO` actions present on each frame (includes component hovers/presses):

| Frame | NAVIGATE | CHANGE_TO | Menu |
|---|---|---|---|
| Homepage Desktop | 18 | 62 | — |
| Homepage Mobile | 14 | 51 | Closed |
| About Desktop | 14 | 54 | — |
| About Mobile | 14 | 41 | Closed |
| Events Desktop | 16 | 50 | — |
| Events Mobile | 16 | 39 | Closed |
| Blog Desktop | 20 | 50 | — |
| Blog Mobile | 20 | 39 | Closed |
| Blog Post Mobile | 24 | 46 | **Open** |
| Contact Desktop | 17 | 54 | — |
| Contact Mobile | 17 | 45 | Closed |

---

## 5. Media & fill conventions

### 5.1 Safe vs unsafe photo assets (`Photos/Final`)

| Use | Examples |
|---|---|
| **Opaque / full-bleed OK** | Events 1–3, Songwriters 1–4, kevin-army / helicopter / portrait, KPF porkbutts |
| **Cutouts (intentional only)** | `Frame_1`, `kevin-wife`, Tampa Bay_1/2/3, `Othersideofthedunes`, `*isolated*` |
| **Do not blanket-sweep** | Never replace every IMAGE fill site-wide — only empty solid media placeholders |

### 5.2 Known intentional fill placements

| Location | Asset / treatment |
|---|---|
| About hero bg | Tampa Bay cutouts (per breakpoint) |
| About hero frame | `Frame_1`, FIT |
| About history Layer 1 | `kevin-wife` (not `Frame_1`) |
| About history FRONT / L2 / BACK | Existing Kevin cutouts with FIT/CROP + opacity ladder |
| Events heroes (all bp) | Songwriters photo + gradient stack matching desktop |
| Programs section | Solid cream; dunes image on dunes layer only |
| Contact hero | Bridge/photo + radial (About frame photo hidden) |
| Galleries / blog thumbs | Opaque event/songwriter/portrait fills where placeholders existed |

### 5.3 Crop / transform caveat

Restoring an image by assigning `{ type: 'IMAGE', scaleMode, imageHash }` **resets** `imageTransform`. Any hand-cropped `CROP` fills must be restored with the full paint object (scaleMode + transform), not hash alone.

---

## 6. Design system components in play

From the **Design System** page (non-exhaustive):

- Button (+ hover/press variants)  
- Nav Link  
- Text Field / form controls  
- Card, Accordion, Content Block  
- Blog post row  
- Sidebar (Parent / Inactive / Hover) — used inside Mobile Nav Menu  
- Mobile Nav Menu (Closed / Open)  
- Chip / Partner Chip  

Page frames consume these as instances; prototype hover/press `CHANGE_TO` on components is preserved when adding page `NAVIGATE` clicks.

---

## 7. Label → route map (CTA language)

Used when wiring buttons without hard-coded IDs:

| Label patterns | Destination |
|---|---|
| Donate (often) | Home (donate section / home) |
| Kevin’s story / Learn about / Who Kevin was / Our mission | About |
| See events / See featured event / Partner with us (events context) | Events or Contact by context |
| Get in touch / Partner / Send a message / Contact | Contact |
| Blog cards / Featured / Related | Blog Post or Blog archive |
| Back home | Home |

---

## 8. Working rules established during build

1. **One `setCurrentPageAsync` per `use_figma` call.**  
2. **`NAVIGATE` only to a different top-level frame** — skip same-page.  
3. **Preserve HOVER/PRESS `CHANGE_TO`** when adding `ON_CLICK` navigate.  
4. **Mobile menu:** absolute on page frame; wire nested Sidebar links while Open; close afterward (except Blog Post).  
5. **Menu constraints:** use `MIN`/`MIN` + explicit slot coordinates — `MAX` pinned menus outside the 390 frame.  
6. **Do not blanket-replace IMAGE fills** — target empty solids only; restore cutouts deliberately.  
7. **Breakpoint fidelity:** tablet/mobile heroes and menus must match their breakpoint destination set, not desktop IDs.

---

## 9. Present-mode checklist

1. Start at **Homepage / Mobile** → open hamburger → About / Events / Blog / Contact each land on the matching mobile frame.  
2. From **Contact / Mobile**, hamburger sits in the nav (not off-canvas); links return to other mobile pages.  
3. **Events** tablet + mobile heroes match desktop photo/gradient.  
4. **About** History stack shows four Kevin cutouts (wife on Layer 1, not the wooden `Frame_1`).  
5. **Blog** cards → Blog Post; related on Blog Post → archive.  
6. Desktop full nav + Donate still route correctly.  
7. Homepage Donate accordions still toggle Open ↔ Closed.

---

## 10. Related local repo notes

Figma itself is cloud-hosted (this report is the durable in-repo record). Local companion assets that support the same workstream include:

- `Mockups/August 4, 2026/` — exported About/Homepage wireframe references  
- `Photos/Final/` — source photography (opaque vs cutout rules above)  
- `.cursor/rules/figma-design-system.mdc` — agent rules for Figma ↔ code  

Frontend/plugin work that landed alongside site build (forms, grantees, backups, tokens, stacked slider runtime, etc.) lives under `frontend/` and `wordpress/plugins/kpf-core/` and is versioned separately in git history.

---

*End of report.*
