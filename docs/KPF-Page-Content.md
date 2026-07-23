# The Kevin Popke Foundation — Website Content

**Redrafted and reorganized page content with build annotations**
Prepared July 23, 2026 · Companion to `KPF-Brand-Voice-Guidelines.md`

---

## How to read this document

Each page is broken into numbered sections. Every section has:

- **Copy** — the actual words, ready to place
- **`[BUILD]`** — structure, CMS fields, component notes
- **`[SEO]`** — title, meta, heading, schema notes
- **`[A11Y]`** — accessibility requirements for that section
- **`[NOTE]`** — rationale, alternatives, or flags

Anything marked **`[VERIFY]`** is a factual claim I could not confirm and that must be checked with the client before launch. Anything marked **`[BLOCKED]`** cannot ship until an open question in the guidelines doc is answered.

**Placeholder convention:** `{{like_this}}` — a value the client needs to supply.

---

## Global elements

### Navigation

```
Home · About · Events · Blog · Contact          [Donate]
```

> **`[BUILD]`** Donate as a visually distinct button, not a nav link. Sticky header on scroll. Mobile: hamburger, but keep Donate visible in the collapsed bar.
> **`[NOTE]`** Current site's "More" overflow item is a builder artifact duplicating the same four links three times in the DOM. Do not replicate.
> **`[A11Y]`** Skip-to-content link as first focusable element. Current page marked with `aria-current="page"`. Hamburger needs `aria-expanded` and `aria-controls`.

### Footer

**Column 1 — Identity**
> The Kevin Popke Foundation, Inc.
> A 501(c)(3) nonprofit organization
> EIN {{ein}}
> {{mailing_address}}
>
> **Together, we can.**

**Column 2 — Site**
> About · Events · Blog · Contact · Donate

**Column 3 — Connect**
> Facebook · Instagram
> {{contact_email}}

**Bottom bar**
> © {{current_year}} The Kevin Popke Foundation, Inc. All rights reserved. · Privacy Policy

> **`[BUILD]`** Copyright year must be dynamic. The live site has read "2022" for four years — a small thing that reads as abandonment to a prospective donor.
> **`[VERIFY]`** EIN, mailing address, and 501(c)(3) status language. Publishing the EIN is standard practice and helps donors verify deductibility.
> **`[A11Y]`** Social links need accessible names ("Kevin Popke Foundation on Facebook"), not bare icons. Current site exposes raw URLs as link text.

---
---

# 1. Homepage

> **`[SEO]`**
> **Title:** `Kevin Popke Foundation | Grants for Florida Veterans` (52 chars)
> **Meta description:** `We fund Tampa Bay and Florida organizations serving veterans — housing, work, mental health, and family support. Together, we can.` (131 chars)
> **Primary intent:** Who are you and can I trust you?
> **Schema:** `NGO` (subtype of `Organization`) with `name`, `url`, `logo`, `sameAs` (FB, IG), `areaServed` (Florida), `nonprofitStatus: Nonprofit501c3`, `foundingDate: 2016` `[VERIFY]`

---

### 1.1 Hero

**Eyebrow:** Together, we can.

**H1:** We fund the Florida organizations that show up for veterans.

**Subhead:**
> The Kevin Popke Foundation makes targeted grants to veteran-focused nonprofits in Tampa Bay and across Florida — the small organizations doing the hardest work, closest to the ground.

**Buttons:** `[Donate]` `[See where the money goes]`

> **`[NOTE]`** The tagline currently sits in the `H1` on the live site. "Together we can." tells a search engine and a first-time visitor nothing, and it's repeated four times in the hero DOM. Demoting it to an eyebrow keeps it as the visual signature while the `H1` does the work of explaining the organization.
> **`[BUILD]`** Second CTA anchors to §1.3 on this page. Hero image: a real grantee program or event photo. Avoid stock, flags, and sunsets — see the guidelines' anti-patterns.
> **`[SEO]`** One `H1` per page. Do not render the eyebrow as a heading element; use a `<p>` or `<span>` with styling.
> **`[A11Y]`** If the hero image carries meaning, describe it in alt text. If it's atmospheric, `alt=""`. Text must clear 4.5:1 against the image — use a scrim, not a hope.

---

### 1.2 Mission (short)

**H2:** What we do

> The Kevin Popke Foundation supports veteran-focused charities in Tampa Bay and other Florida communities through targeted grants. We don't run programs. We find the people who do, we vet them ourselves, and we fund them.

> **`[NOTE]`** "We don't run programs" is the single most useful sentence on the page. It answers the question every informed donor asks about a grantmaker before anything else, and it does it in four words.
> **`[BUILD]`** Keep this to one paragraph. Resist the urge to expand — the About page is for depth.

---

### 1.3 Where the money goes

**H2:** Where the money goes

> Every grant goes to a Florida organization we've met, vetted, and watched work.

**Four cards:**

| Card | Heading | Copy |
|---|---|---|
| 1 | **Housing** | Transitional and permanent housing for veterans who don't currently have any. |
| 2 | **Work** | Job training and workforce programs that turn service experience into a career. |
| 3 | **Health** | Mental health care and adaptive programs for veterans living with injury. |
| 4 | **Family** | Emergency financial help and support for veterans' families, including Special Operations families in crisis. |

**Closing line + link:**
> In recent years our grants have supported {{named_grantee}}, {{named_grantee}}, and {{named_grantee}}. → **See our grantees**

> **`[BLOCKED]`** The closing line requires the confirmed grantee list (Open Question #2). This is the highest-value content on the site and it's currently empty. Candidates observed on the Songwriters for Vets beneficiaries page — Liberty Manor, Wounded Warriors Abilities Ranch, Other Side of the Dunes, Operation 300, Operation Healing Forces, Task Force Dagger, STANO Foundation, Special Operations Warrior Foundation — but I could not confirm which are KPF grantees versus SFV's other beneficiaries. **Do not publish any of these names without written confirmation.**
> **`[BUILD]`** If the grantee list can't be confirmed before launch, ship the four cards and omit the closing line entirely rather than substituting vague language. An empty space is better than a hollow claim.
> **`[A11Y]`** Card icons decorative (`alt=""`). Heading level `H3` inside each card. If cards are clickable, the whole card is one link with the heading as its accessible name — not a separate "Learn more" link per card.

---

### 1.4 Kevin

**H2:** Who Kevin was

> Donald "Kevin" Popke — "50" to his friends — retired as a U.S. Army First Sergeant after more than two decades leading soldiers. He kept serving afterward as a Department of Defense contractor. A distracted driver killed him in 2016.
>
> The Foundation is what the people who knew him built next.

**Link:** Read more about Kevin and the Foundation →

> **`[NOTE]`** Two paragraphs, 57 words, no adjectives doing emotional work. The restraint is the point — this is the register the guidelines call for. Resist any edit that adds "tragically," "beloved," or "senselessly."
> **`[BUILD]`** Pair with a photograph of Kevin if the family approves. `[VERIFY]` — photo permission.
> **`[A11Y]`** If a photo of Kevin is used, alt text should identify him: "Donald 'Kevin' Popke in uniform." Never "photo of a man."

---

### 1.5 Songwriters for Vets

**H2:** Our largest source of support

> Most of what we grant each year comes from **Songwriters for Vets** — a night of Nashville songwriters performing their #1 hits and telling the stories behind them. It's a good show for a serious reason.

**Detail line:** {{next_event_date}} · {{venue}}, {{city}}
**Button:** `[Learn about Songwriters for Vets]` → /events

> **`[BLOCKED]`** Phrasing here depends on Open Question #1. **Do not write "our annual event"** — Songwriters for Vets appears to be a separate organization that directs proceeds to the Foundation, and its 2026 Atlanta event is listed as benefiting a different nonprofit entirely. "Our largest source of support" is accurate under either arrangement and is the safe default until the relationship is confirmed in writing.
> **`[BUILD]`** Pull `{{next_event_date}}` and `{{venue}}` from the featured-event fields on the Events page so this never goes stale in two places. Hide the detail line automatically when no future event is set.
> **`[VERIFY]`** Naples 2026 is publicly listed for Saturday, August 29, 2026 at the Hyatt Regency Coconut Point, Bonita Springs. Confirm with the client before publishing, and confirm KPF is the beneficiary of that specific event.

---

### 1.6 Ways in

**H2:** Together, we can.

> A nonprofit is only as strong as the community holding it up. There's more than one way in — pick the one that fits.

**Three cards:**

| Heading | Copy | CTA |
|---|---|---|
| **Give** | Every dollar goes out as a grant to a Florida organization we've vetted ourselves. | Donate |
| **Come to the show** | Buy a ticket, bring people, have a good night out for a serious reason. | See events |
| **Get involved** | Volunteer, sponsor an event, or bring the Foundation to your company or community group. | Contact us |

> **`[NOTE]`** The "a nonprofit is only as strong as the community holding it up" line is adapted from the current contact page — the warmest, most on-voice sentence on the existing site. Promoting it to the homepage is deliberate.
> **`[BUILD]`** These three CTAs are the page's conversion layer. Keep them above the footer and give them real visual weight.
> **`[A11Y]`** CTA link text must be distinguishable out of context — "Donate," "See events," "Contact us" all pass. Never three identical "Learn more" links on one page.

---

### 1.7 Gallery

**H2:** Moments

> **`[BUILD]`** Curated set of 12–20 captioned images from events and grantee programs. Lazy-load below the fold. Lightbox optional; if used, it must be keyboard-operable and focus-trapped with a working Escape key.
> **`[NOTE]`** The current homepage renders roughly 20 empty image slots with a "Show More" control, no captions and no alt text. Replace with a smaller curated set — a captioned photo of a real grant at work is worth more than twenty unlabeled ones.
> **`[A11Y]`** Every image needs meaningful alt text. Captions visible, not hover-only.

---
---

# 2. About

> **`[SEO]`**
> **Title:** `About the Kevin Popke Foundation | Our Mission & History` (56 chars)
> **Meta description:** `Founded in memory of Army 1SG Donald "Kevin" Popke, the Foundation grants to veteran organizations across Tampa Bay and Florida.` (128 chars)
> **Primary intent:** Who is Kevin, and can I trust how this money is handled?
> **Schema:** `AboutPage` + `BreadcrumbList`. Consider `Person` markup for Kevin.
> **`[NOTE]`** The current About page is titled "Our Programs" and contains only two short paragraphs. The client draft's much richer material — mission, history, team — currently lives nowhere on the live site. This page consolidates all of it.

---

### 2.1 Page header

**H1:** About the Kevin Popke Foundation

**Standfirst:**
> A Florida foundation that funds the organizations doing the hardest work for veterans — built to continue the way one man spent his life.

---

### 2.2 Mission

**H2:** Our mission

> The Kevin Popke Foundation supports veteran-focused charities in the Tampa Bay area and other Florida communities through targeted grants.
>
> We don't run programs ourselves. We look for organizations already doing the work — housing, job training, mental health care, family support, and the everyday business of keeping veterans connected to each other — and we give them money to keep doing it.
>
> The grants are targeted on purpose. A small organization with committed leadership and low overhead can do more with a well-timed grant than a large one can do with the same money. Our job is to find those organizations and fund them.

> **`[NOTE]`** Compressed from the client draft's three paragraphs. The original ran ~230 words and closed on "honor his memory"; this runs ~110 and closes on the actual strategic rationale, which is more persuasive and doesn't front-load the legacy framing three sections before the section that's actually about Kevin.

---

### 2.3 Kevin's story

**H2:** Who Kevin was

> The Foundation carries the name of Donald "Kevin" Popke — "50" to his friends.
>
> Kevin served his entire adult life. He retired as a U.S. Army First Sergeant after more than twenty years, remembered by the soldiers who served under him as a leader and a mentor. He kept going afterward as a Department of Defense contractor, doing national security work with the same seriousness he brought to everything.
>
> A distracted driver killed him in 2016.
>
> The Foundation was established to continue what he did with his time: show up for other people, particularly the ones who had served. That's the whole idea. Everything else — the grants, the vetting, the event, the volunteers — is machinery built around it.

> **`[NOTE]`** The one-sentence paragraph is doing deliberate work. Isolating it gives the fact the weight it deserves without a single adjective. This is the most important paragraph on the site and the one most likely to be "improved" during review — protect it.
> **`[BUILD]`** Photograph of Kevin, if approved. Consider a pull-quote from a soldier who served under him if one can be sourced. `[VERIFY]`
> **`[A11Y]`** Do not set this section in a script or display face at body sizes. It's the emotional core and needs to be the most legible text on the page.

---

### 2.4 How we choose

**H2:** How we choose who to fund

> Before a grant goes out, we do the homework.
>
> We look for organizations with leadership that lives the commitment rather than administering it — people who are personally in the work. We look at how much of each dollar reaches a veteran. We look at whether the organization will still be here in five years. And where we can, we go see it.
>
> That's why we grant locally. Tampa Bay and Florida are close enough that we can meet the people running these programs, watch the work, and stay in touch afterward.

> **`[NOTE]`** **This section does not exist anywhere on the current site, and it should.** The Songwriters for Vets beneficiaries page describes the Foundation performing due diligence to identify veteran groups whose leadership genuinely lives their commitment to veterans and families — a real differentiator being described by a third party while the Foundation's own site stays silent about it. This is the strongest available answer to "why should I give to a grantmaker instead of directly to a charity?"
> **`[VERIFY]`** Confirm the actual criteria with the board. The version above is a reasonable reconstruction from third-party description; it should be replaced with the real process.

---

### 2.5 What we've funded

**H2:** What we've funded

> Our grants have supported veterans facing very different situations: veterans without housing, veterans living with paralysis and other serious injuries, and Special Operations families hit with a sudden financial crisis.

**Grantee grid:** {{grantee_name}} · {{city}} · {{one_line_description}} · {{link}}

> **`[BLOCKED]`** Requires the confirmed grantee list (Open Question #2).
> **`[BUILD]`** Build as a repeatable CMS collection — logo, name, city, one-line description, external link, grant year. Even three entries transform this page's credibility. Order alphabetically or by most recent grant year.
> **`[A11Y]`** Grantee logos need alt text with the organization name. External links should indicate they open a new tab if they do.
> **`[SEO]`** Outbound links to grantee sites are a trust signal, not a leak. Don't `nofollow` them.

---

### 2.6 Our team

**H2:** The people who do this

> The Foundation runs on volunteers — a core group of regulars and a wider circle who show up when there's work to do. They bring different skills and the same conviction, and they turn it into something concrete: an event that raises the year's grant money, a program visit, a hundred small logistics nobody sees.
>
> Think you'd be a good fit? Get in touch. We'll tell you what we need.

**Button:** `[Contact us]`

> **`[VERIFY]`** Open Question #4 — whether to name board members. Named leadership with photos would substantially raise trust. If the family prefers privacy, the collective framing above works, but it's a missed opportunity worth raising with the client.
> **`[BUILD]`** If names are approved, build as a CMS collection: photo, name, role, one-line bio.

---

### 2.7 Closing CTA

**H2:** Together, we can.

> There's more than one way to be part of this.

**Buttons:** `[Donate]` `[See upcoming events]` `[Get in touch]`

---
---

# 3. Events

> **`[SEO]`**
> **Title:** `Events | Kevin Popke Foundation` (31 chars)
> **Meta description:** `Songwriters for Vets and other events supporting Florida veterans. Partnership and sponsorship opportunities available.` (118 chars)
> **Primary intent:** What's coming up, and how do I get involved or sponsor?
> **Schema:** `Event` on the featured block and each CMS item — `name`, `startDate`, `location`, `organizer`, `offers` where ticketing applies.
> **`[NOTE]`** Current page shows a bare "No Events planned at this time" with nothing else. Even in an empty period, this page should sell the flagship event and capture partnership inquiries.

---

### 3.1 Page header

**H1:** Events

**Standfirst:**
> Our events raise the money we grant. They're also a good time.

---

### 3.2 Featured — Songwriters for Vets

> **`[BUILD]`** Full-width featured block, visually distinct from the CMS loop below. Content managed through dedicated fields (not the events collection) so it persists between event cycles.

**Eyebrow:** Our largest source of support

**H2:** Songwriters for Vets

> Once a year, Nashville songwriters take a stage in Florida and play the songs they wrote — the ones you already know by heart — and tell you how each one came to exist. There's an auction, an open bar, and a room full of people who came for the same reason.
>
> Songwriters for Vets is the single largest source of the grant money this Foundation puts to work each year. `[VERIFY]` Buying a ticket is one of the most direct ways to support Florida veterans.

**Event details:**
> **{{event_date}}**
> {{venue}}, {{city}}
> Tickets from {{lowest_price}} · Sponsorships from {{lowest_sponsorship}}

**Buttons:** `[Get tickets]` (external → songwriters4vets.com) `[Become a sponsor]` (→ /contact or external)

> **`[BLOCKED]`** Open Question #1. The copy above is written to be accurate whether SFV is a partner organization or a Foundation-run event — it never claims ownership. **Do not edit it to say "our event," "we host," or "our annual gala" without written confirmation of the legal relationship and permission to use the SFV name and marks.**
> **`[VERIFY]`** Publicly listed details for Naples 2026: Saturday, August 29, 2026, 7:00–10:30 PM, Hyatt Regency Coconut Point, Bonita Springs, FL. General admission listed at $125; sponsorship tiers from $2,500. Featured artists listed as Patrick Davis, Eric Paslay, Tim Nichols, and Tyler Reeve. Confirm all of this with the client and with SFV before publishing, and confirm that KPF is the beneficiary of this specific event.
> **`[BUILD]`** Ticketing lives on the SFV site. Link out rather than rebuilding checkout. External links get `rel="noopener"` and a visible new-tab indicator.
> **`[A11Y]`** Event date must be in text, not baked into an image. Use a `<time datetime="">` element.

---

### 3.3 Partnership & fundraising

**H2:** Sponsor, partner, or host something with us

> Our events happen because businesses and individuals decide to put their name behind them. Sponsorship puts your business in front of a room that cares who's in it — and it funds grants directly.
>
> There's also room for other ideas. If you want to run a fundraiser for the Foundation, host a collection, put together a corporate giving match, or partner on an event of your own, we'd like to hear it. Tell us what you have in mind and we'll tell you how we can help.

**Button:** `[Start a conversation]` → /contact?inquiry=partnership

> **`[NOTE]`** Two distinct audiences in one section: sponsors buying a package, and people with an idea who don't know if it's welcome. The second paragraph exists for the second group — the "there's also room for other ideas" framing lowers the barrier for exactly the people most likely to bring a good one.
> **`[BUILD]`** The CTA should pre-select "Partnership or sponsorship" in the contact form's inquiry-type field via query parameter. Small thing, meaningfully better conversion.
> **`[VERIFY]`** If a sponsorship deck exists, link or embed it here.

---

### 3.4 Upcoming events (CMS loop)

**H2:** Upcoming events

> **`[BUILD]`** Repeating collection, sorted by date ascending, filtered to future dates only.
>
> **Fields:** title · date & time · end time (optional) · location name · address · featured image · short description (~30 words) · full description (rich text) · ticket URL (optional) · price from (optional) · event type (taxonomy) · past/upcoming (auto from date)
>
> Card displays: image, date, title, location, short description, CTA.

**Empty state:**
> **H3:** Nothing on the calendar right now
>
> We announce events a few months out. The best way to hear first is to follow along on Facebook or Instagram — or reach out if you'd like to help put one together.
>
> `[Follow on Facebook]` `[Follow on Instagram]` `[Get in touch]`

> **`[NOTE]`** The current empty state — "No Events planned at this time / Check back later" — is a dead end that asks the visitor to remember to return. The version above converts an empty page into a follow or a conversation.
> **`[A11Y]`** Cards: one link wrapping the card with the event title as accessible name. Dates in `<time>` elements. Don't rely on card color to convey event type.

---

### 3.5 Past events

**H2:** Past events

> **`[BUILD]`** Optional, collapsed by default or paginated. Same collection, filtered to past dates, sorted descending. Photos from past events are strong social proof for anyone deciding whether to buy a ticket to the next one.
> **`[A11Y]`** If collapsed, use a native `<details>` element or a button with `aria-expanded`.

---
---

# 4. Contact

> **`[SEO]`**
> **Title:** `Contact | Kevin Popke Foundation` (32 chars)
> **Meta description:** `Get in touch about volunteering, sponsorship, partnership, or grant inquiries. The Kevin Popke Foundation serves veterans across Florida.` (137 chars)
> **Primary intent:** I want to do something — who do I talk to?
> **Schema:** `ContactPage` + `Organization` with `contactPoint`.

---

### 4.1 Page header

**H1:** Get in touch

**Standfirst:**
> A nonprofit is only as strong as the community holding it up. Whatever you have in mind, start here.

---

### 4.2 Ways to help

**H2:** Ways to help

**Four cards:**

| Heading | Copy |
|---|---|
| **Volunteer** | Events need hands, and so does the work between them. Tell us what you're good at. |
| **Sponsor an event** | Put your business behind a night that funds grants for Florida veterans. |
| **Partner with us** | Corporate matching, a fundraiser of your own, or an idea we haven't thought of yet. |
| **Spread the word** | Share what we do with people who'd want to know. It costs nothing and it works. |

> **`[NOTE]`** Adapted from the current contact page's strongest paragraph. Breaking it into four named actions makes each one feel achievable rather than leaving the reader to invent their own way in.

---

### 4.3 Contact form

**H2:** Send us a message

**Fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | text | Yes | |
| Email | email | Yes | |
| Phone | tel | No | |
| What's this about? | select | Yes | Volunteering · Sponsorship or partnership · Donation question · Grant inquiry · Press or media · Something else |
| Message | textarea | Yes | |
| How did you hear about us? | select | No | Songwriters for Vets · Social media · A friend · Search · Other |

**Submit:** `[Send message]`

**Confirmation:**
> Thanks — we've got it. Someone will get back to you within a few days. If it's urgent, {{contact_email}} reaches us fastest.

> **`[BUILD]`** The inquiry-type field should accept a `?inquiry=` query parameter for pre-selection from CTAs elsewhere on the site. Route submissions to different inboxes by type if the client has the capacity to handle that; otherwise one inbox with the type in the subject line.
> **`[BUILD]`** Add a "Grant inquiry" option even if the Foundation doesn't accept unsolicited applications — the routing lets you send a clear, kind auto-response instead of leaving applicants guessing. `[VERIFY]` whether unsolicited grant applications are accepted; if not, say so plainly on the page.
> **`[A11Y]`** Visible persistent `<label>` on every field — never placeholder-only. Required fields marked in text, not with a red asterisk alone. Errors announced via `aria-live`, listed at the top of the form, and each tied to its field with `aria-describedby`. Confirmation message must move focus and be announced. Do not use a `<div>` with a click handler as the submit control.
> **`[NOTE]`** Current form asks only Name, Email, and "Where did you hear about us?" with no message field — a visitor who wants to volunteer has nowhere to say so.
> **`[BUILD]`** Keep reCAPTCHA or equivalent, but prefer a solution that doesn't create an accessibility barrier. Honeypot + rate limiting handles most of this without a visual puzzle.

---

### 4.4 Direct contact

**H2:** Or reach us directly

> **The Kevin Popke Foundation, Inc.**
> {{mailing_address}}
> {{contact_email}}
> {{phone}} *(if published)*
>
> Facebook · Instagram

> **`[VERIFY]`** All contact details. The current page shows the organization name with no address, email, or phone at all — which for a nonprofit soliciting donations reads as evasive whether or not it is.
> **`[A11Y]`** Email and phone as real `mailto:` / `tel:` links. Address in a `<address>` element.

---

### 4.5 Donate

**H2:** Prefer to just give?

> Every dollar we raise goes out as a grant to a Florida organization we've vetted ourselves.

**Button:** `[Donate]`

> **`[BUILD]`** Suggested amounts with outcomes attached where possible, plus a recurring option. The current bare $20 PayPal default with no context is leaving money on the table.
> **`[VERIFY]`** Tax-deductibility language — confirm 501(c)(3) status and preferred wording before publishing anything about deductions.

---
---

# 5. Blog templates

> **`[NOTE]`** Out of scope for the redraft, but here's the structural guidance so the templates get built to fit the content strategy rather than the other way around.

### 5.1 Blog archive

**H1:** News
**Standfirst:** Grants, events, and the organizations we fund.

> **`[BUILD]`** Card grid: featured image, category, title, date, ~25-word excerpt. Filter by category. Pagination over infinite scroll — better for SEO and for keyboard users.
> **Suggested categories:** Grants · Events · Grantee spotlights · Foundation news
> **`[SEO]`** Title: `News | Kevin Popke Foundation`. Paginated pages need `rel="next"`/`rel="prev"` or self-canonicals. Archive should be in the sitemap; individual tag pages generally shouldn't be.
> **`[A11Y]`** Excerpt links need the post title as accessible name, never "Read more."

### 5.2 Blog post

> **`[BUILD]`** Fields: title · slug · publish date · author · category · featured image + alt text · excerpt (for cards and meta description fallback) · body (rich text) · related posts.
> **`[SEO]`** `BlogPosting` schema with `headline`, `datePublished`, `dateModified`, `author`, `image`. `H1` = post title, one per page. Meta description from the excerpt field, capped at 160 characters.
> **`[A11Y]`** Rich text editor must enforce heading hierarchy — content editors will otherwise pick heading levels by how big they look. Consider restricting the editor to `H2`/`H3` only.

**Highest-value post types for this organization, in order:**
1. **Grantee spotlights** — the strongest untapped asset. One email to each grantee likely produces a year of content, and it makes the "specific" voice attribute real.
2. **Grant announcements** — "We granted to X this year, here's what it funds." Directly serves the accountability pillar.
3. **Event recaps** — photos, totals raised, thanks to sponsors. Sells next year's tickets.
4. **Anniversary and memorial posts** — short, no CTA, once a year.

---
---

# Pre-launch checklist

**Blocked on client**
- [ ] Songwriters for Vets relationship confirmed in writing — legal structure, proceeds, name/mark permission *(blocks §1.5, §3.2)*
- [ ] Grantee list confirmed with years *(blocks §1.3 closing line, §2.5)*
- [ ] EIN, mailing address, contact email, phone
- [ ] Photo permissions — Kevin, events, grantee programs
- [ ] Grant criteria confirmed or corrected *(§2.4)*
- [ ] Board/team naming decision *(§2.6)*
- [ ] Naples 2026 event details verified with SFV *(§3.2)*
- [ ] Whether unsolicited grant applications are accepted *(§4.3)*

**Build**
- [ ] Dynamic copyright year
- [ ] One `H1` per page, no skipped heading levels
- [ ] All images have alt text; decoratives are `alt=""`
- [ ] Form labels visible and persistent; errors announced
- [ ] Contrast verified at 4.5:1 body / 3:1 large — check the existing teal `#008390`, which fails on white at body sizes
- [ ] Keyboard path tested end to end, including nav, form, lightbox
- [ ] 301s from old URLs: `/about-us` → `/about`, `/contact-us` → `/contact`
- [ ] `sitemap.xml` and `robots.txt` published
- [ ] Schema validated in Rich Results Test
- [ ] Open Graph and Twitter card images per page — current site uses one stock photo site-wide
- [ ] Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Analytics and form-submission tracking live before launch, not after
