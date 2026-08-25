/**
 * Scaffold copy grounded in docs/KPF-Page-Content.md.
 * VERIFY/BLOCKED items are omitted or phrased safely.
 */

const HOME = {
  hero: {
    eyebrow: "Together, we can.",
    title: "We fund organizations showing up for vets.",
    body: "The Kevin Popke Foundation makes targeted grants to veteran-focused nonprofits in Tampa Bay and across Florida — the small organizations doing the hardest work, closest to the ground.",
    primaryCta: { donate: true, label: "Donate" },
    secondaryCta: { href: "/#programs", label: "Where your donations go" },
    /* Solid ink stage + cutouts only — Figma 1101:3435 (no beach hero.jpg). */
    media: {
      key: "",
      src: "",
      alt: "",
    },
    cutouts: [
      {
        key: "home.kevinDad",
        src: "/media/home/kevin-with-dad.png",
        alt: "",
        className: "kpf-hero__cutout kpf-hero__cutout--dad",
      },
      {
        key: "home.kevinAlumni",
        src: "/media/home/kevin-alumni.png",
        alt: "",
        className: "kpf-hero__cutout kpf-hero__cutout--alumni",
      },
      {
        key: "home.kevinRunner",
        src: "/media/home/kevin-runner.png",
        alt: "",
        className: "kpf-hero__cutout kpf-hero__cutout--runner",
      },
    ],
  },
  partners: {
    label: "Kevin Popke Foundation Grantees",
  },
  story: {
    eyebrow: "Preserving His Legacy",
    title: "Who is Kevin Popke?",
    body: [
      "Kevin Popke, or “50” to his friends, was a retired U.S. Army First Sergeant, paratrooper, and Department of Defense contractor who lost his life in a car accident caused by a distracted driver.",
      "The Kevin Popke Foundation serves in tribute of Kevin as a veteran-focused organization providing fundraising opportunities to other veteran-focused charities in the Tampa Bay Area and surrounding. Through targeted grants in Kevin’s honor, we support people like him who have served and sacrificed to protect us.",
    ],
    actions: [
      { donate: true, label: "Donate", variant: "primary" },
      { href: "/about/", label: "Kevin’s story", variant: "ink" },
      { href: "/#programs", label: "Where your donation goes", variant: "link" },
    ],
    media: {
      key: "home.kevinDoubleExposure",
      src: "/media/home/kevin-double-exposure-cutout.webp",
      alt: "Double-exposure portrait of Kevin Popke with parachutists",
    },
  },
  values: {
    title: "Together, we can.",
    body: "A nonprofit is only as strong as the community holding it up. There’s more than one way in — pick the one that fits.",
    cards: [
      {
        eyebrow: "What You Can Do",
        title: "Donate to Kevin’s Cause",
        body: "Every dollar goes out as a grant to a Florida organization we’ve vetted ourselves.",
        cta: { donate: true, label: "Donate" },
        media: { key: "home.hero", src: "/media/home/hero.jpg", alt: "" },
      },
      {
        eyebrow: "What You Can Do",
        title: "Check out our events",
        body: "Buy a ticket, bring people, have a good night out for a serious reason.",
        cta: { href: "/events/", label: "See events" },
        media: {
          key: "events.featured1",
          src: "/media/events/featured-1.webp",
          alt: "Songwriters for Vets performers on stage with an American flag",
        },
      },
      {
        eyebrow: "Who We Work With",
        title: "Songwriters for Vets",
        body: "Each year Nashville songwriters come to play the songs you know by heart.",
        cta: { href: "/events/", label: "See events" },
        media: { key: "events.library1", src: "/media/events/library-1.jpg", alt: "" },
      },
      {
        eyebrow: "What You Can Do",
        title: "Get involved at KPF",
        body: "Volunteer, sponsor an event, or bring the Foundation to your company or community.",
        cta: { href: "/contact/", label: "Contact us" },
        media: { key: "home.programs", src: "/media/home/programs.jpg", alt: "" },
      },
    ],
  },
  programs: {
    id: "programs",
    eyebrow: "Where the money goes",
    title: "Where your donations go",
    body: "Every grant goes to a Florida organization we’ve met, vetted, and watched work.",
    items: [
      {
        title: "Housing",
        body: "Transitional and permanent housing for veterans who don’t currently have any.",
      },
      {
        title: "Work",
        body: "Job training and workforce programs that turn service experience into a career.",
      },
      {
        title: "Health",
        body: "Mental health care and adaptive programs for veterans living with injury.",
      },
    ],
    media: {
      key: "home.dunes",
      src: "/media/home/dunes.png",
      alt: "",
    },
    collage: [
      { key: "home.programsCollageBeach", src: "/media/home/programs-collage-beach.jpg", alt: "" },
      { key: "home.programsCollageBbq", src: "/media/home/programs-collage-bbq.jpg", alt: "" },
    ],
  },
  blog: {
    eyebrow: "What’s New At KPF?",
    title: "Latest on our blog",
    body: "Updates from grants, events, and the people doing the work — newest first.",
    featured: {
      href: "/blog/",
      category: "Events",
      date: "July 18, 2026",
      readTime: "6 min read",
      title: "What Songwriters for Vets taught us about showing up",
      cta: "Read the story",
      media: { key: "events.library1", src: "/media/events/library-1.jpg", alt: "" },
    },
  },
  donate: {
    id: "donate",
    eyebrow: "Together, we can.",
    titleBefore: "KPF grants are awarded to ",
    titleEmphasized: "vetted",
    titleAfter: " organizations helping veterans.",
    body: "Every dollar goes out as a grant to a Florida organization we’ve vetted ourselves.",
    primaryCta: { donate: true, label: "Donate" },
    secondaryCta: { href: "/about/", label: "Learn about our work" },
    note: "A 501(c)(3) nonprofit organization",
    impactTitle: "How your donations are used",
    accordions: [
      {
        id: "housing",
        title: "Housing",
        body: "Transitional and permanent housing for veterans who don’t currently have any.",
        open: false,
      },
      {
        id: "work",
        title: "Work",
        body: "Job training and workforce programs that turn service experience into a career.",
        open: false,
      },
      {
        id: "family",
        title: "Family",
        body: "Emergency financial help and support for veterans’ families, including Special Operations families in crisis.",
        open: false,
      },
    ],
  },
};

const ABOUT = {
  hero: {
    eyebrow: "About",
    title: "About the Kevin Popke Foundation",
    body: "We don't run the programs. We find the people already doing the hardest work for Florida's veterans — and we make sure their next year is funded.",
    primaryCta: { href: "#mission", label: "Our mission" },
    secondaryCta: { href: "#history", label: "Who Kevin was" },
    /* Pinned — restore framed photo + tampa-bay cutout layout later */
    frame: {
      key: "about.heroFrame",
      src: "/media/about/hero-frame.png",
      alt: "Kevin Popke with his wife in a wooden frame",
    },
    backgroundPinned: {
      key: "about.tampaBay",
      src: "/media/about/tampa-bay.png",
      alt: "",
    },
    background: {
      key: "about.heroBeach",
      src: "/media/about/2_transparent.webp",
      alt: "Volunteers and veterans gathered on the beach around a beach wheelchair",
    },
  },
  history: {
    id: "history",
    eyebrow: "Our history",
    title: "Who Kevin was",
    intro: "The Foundation carries a name — and a stack of moments that made it necessary.",
    card: {
      eyebrow: "Kevin's Story",
      title: "Show up for other people.",
      body: [
        "Kevin served his entire adult life. He retired as a U.S. Army First Sergeant after more than twenty years, remembered by the soldiers who served under him as a leader and a mentor.",
        "A distracted driver killed him in 2016.",
        "The Foundation was established to continue what he did with his time: show up for other people, particularly the ones who had served.",
      ],
    },
    layers: [
      {
        key: "about.historyFront",
        src: "/media/about/history-front.png",
        alt: "Donald “Kevin” Popke",
        className: "kpf-history__layer--front",
      },
      {
        key: "about.history1",
        src: "/media/about/history-1.png",
        alt: "Donald “Kevin” Popke with his wife",
        className: "kpf-history__layer--1",
      },
      {
        key: "about.history2",
        src: "/media/about/history-2.png",
        alt: "Donald “Kevin” Popke running",
        className: "kpf-history__layer--2",
      },
      {
        key: "about.historyBack",
        src: "/media/about/history-back.png",
        alt: "",
        className: "kpf-history__layer--back",
      },
    ],
  },
  mission: {
    id: "mission",
    eyebrow: "Our mission",
    title: "In tribute to Kevin Popke, we fund the work already underway",
    body: [
      "The Foundation makes targeted grants to veteran-focused charities across Tampa Bay and the rest of Florida. We don't build programs from scratch — we look for the ones that already deliver, and we help them keep going.",
      "Before a dollar moves, we do the homework. And when we can, we put boots on the ground to watch the inspiring work happening firsthand.",
    ],
    criteria: [
      {
        id: "leadership",
        title: "Leadership in the work",
        body: "Founders and directors who are personally in it — hands on the wheelchair, not just the org chart.",
        open: true,
      },
      {
        id: "dollars",
        title: "Dollars that reach veterans",
        body: "Money that lands with the people it's for, not administration and overhead.",
      },
      {
        id: "built-to-last",
        title: "Built to last",
        body: "Organizations that will still be standing — and still serving — five years from now.",
      },
      {
        id: "close-enough",
        title: "Close enough to see",
        body: "Local enough that we can show up in person and confirm the work is real.",
      },
    ],
  },
  grantees: {
    eyebrow: "Making an impact",
    // `{total}` → %%grants_total%% / {{grants.total}} / kpfGrantsTotal.label
    title: "More than {total} in grants — and counting",
    body: "Our grants have met veterans in very different moments: without housing, living with serious injuries, or a Special Operations family hit by sudden crisis. Same standard behind every one — proven work, real reach, people we've often watched firsthand.",
    items: [
      {
        id: "freedom-riding",
        name: "Freedom Riding Academy",
        body: "Advanced motorcycle skills training for service members, veterans, and first responders.",
        date: "Aug 2025",
        amount: "$10,000",
        logoUrl: "/media/partners/Freedom_Riding_Academy.jpg",
        photoUrl: "/media/grantees/freedom-riding.png",
        href: "https://freedomridingacademy.org",
      },
      {
        id: "warriors-place",
        name: "My Warrior’s Place",
        body: "A peaceful retreat promoting healing and community for veterans and Gold Star families.",
        date: "Aug 2025",
        amount: "$10,000",
        logoUrl: "/media/partners/My_Warriors_Place.jpg",
        photoUrl: "/media/grantees/warriors-place.jpg",
        href: "https://mywarriorsplace.org",
      },
      {
        id: "dunes",
        name: "Other Side of the Dunes",
        body: "Golfing in honor of service members to build community for vets and first responders.",
        date: "Aug 2025",
        amount: "$10,000",
        logoUrl: "/media/partners/Other_Side_of_the_Dunes.jpg",
        photoUrl: "/media/grantees/dunes.jpg",
        href: "https://othersideofthedunes.org",
      },
      {
        id: "stano",
        name: "The STANO Foundation",
        body: "Supporting veterans and first responders through community programs across Florida.",
        date: "Aug 2025",
        amount: "$10,000",
        logoUrl: "/media/partners/The_Stano_Foundation.png",
        photoUrl: "/media/grantees/stano.jpg",
        href: "",
      },
      {
        id: "wwar",
        name: "Wounded Warriors Abilities Ranch",
        body: "Equine and outdoor programs that help wounded veterans rebuild strength and connection.",
        date: "Aug 2025",
        amount: "$10,000",
        logoUrl: "/media/partners/Wounded_Warriors_Abilities_Ranch.webp",
        photoUrl: "/media/grantees/wwar.jpg",
        href: "",
      },
    ],
  },
  gallery: {
    eyebrow: "The work",
    title: "KPF volunteers enable our ongoing support for our nation’s protectors",
    body: "Photos from grantee programs, events, and the communities we fund — the work on the ground, not stock.",
    seeMore: "See more",
    featured: {
      key: "about.galleryFeatured",
      src: "/media/about/Beach_wheelchair.png",
      alt: "Volunteer helping a veteran in a beach wheelchair near the shore",
    },
    items: [
      {
        key: "about.gallery1",
        src: "/media/home/kevin-alumni.png",
        alt: "Kevin Popke in flight gear",
      },
      {
        key: "about.gallery2",
        src: "/media/home/kevin-runner.png",
        alt: "Kevin Popke running",
      },
      {
        key: "about.gallery3",
        src: "/media/home/kevin-with-dad.png",
        alt: "Kevin Popke with family",
      },
      {
        key: "about.gallery4",
        src: "/media/home/programs-collage-bbq.jpg",
        alt: "Foundation volunteers at a cookout",
      },
    ],
  },
  cta: {
    title: "There's more than one way to make a difference.",
    body: "Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.",
    actions: [
      { donate: true, label: "Donate", variant: "primary" },
      { href: "/contact/", label: "Get in touch", variant: "outline" },
    ],
    media: {
      key: "cta.flag",
      src: "/media/brand/kpf-flag.mp4",
      alt: "",
    },
  },
};

const CONTACT = {
  hero: {
    eyebrow: "Let’s Connect",
    title: "Contact us",
    body: "Questions about a grant, an event, or how to help? We read every message.",
    primaryCta: { href: "#message", label: "Send a message", variant: "primary" },
    secondaryCta: { donate: true, label: "Donate", variant: "secondary" },
    media: {
      key: "contact.hero",
      src: "/media/contact/hero-bridge.webp",
      alt: "Sunshine Skyway Bridge spanning Tampa Bay under a clear sky",
    },
  },
  form: {
    id: "message",
    title: "We’d love to hear from you",
    body: [
      "Whether you’re asking about a grant, an upcoming event, a partnership idea, or how to support the foundation — this form is the right place to start.",
      "A real person on our small team reads every message and will follow up as soon as we can.",
    ],
  },
  cta: {
    title: "There's more than one way to make a difference.",
    body: "Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.",
    actions: [
      { donate: true, label: "Donate", variant: "primary" },
      { href: "/", label: "Back home", variant: "outline" },
    ],
    media: {
      key: "cta.flag",
      src: "/media/brand/kpf-flag.mp4",
      alt: "",
    },
  },
};

const BLOG = {
  hero: {
    eyebrow: "Updates, News & More",
    title: "Welcome to the KPF blog",
    body: "We have the privilege of supporting veterans because of the dedication and passion of our volunteers. Be sure to check out our stories, updates, and other news.",
    primaryCta: { href: "#archive", label: "Latest stories", variant: "primary" },
    secondaryCta: { href: "#topics", label: "Browse topics", variant: "outline" },
  },
  archive: {
    id: "archive",
    eyebrow: "Our Blog Archive",
    title: "All stories",
    body: "Updates from grants, events, and the people doing the work — newest first.",
    featuredCta: "Read the story",
    rowCta: "Read story",
    empty: "No stories published yet. Check back soon.",
  },
};

const EVENTS = {
  hero: {
    eyebrow: "What funds our mission",
    title: "Kevin Popke Foundation events",
    body: "Our events raise money to support our mission, and we have a good time while doing it.",
    primaryCta: {
      href: "#featured",
      label: "Featured event",
      variant: "primary",
      trailingIcon: "arrow",
    },
    secondaryCta: { href: "#partner", label: "Partner with us" },
    media: {
      key: "events.hero",
      src: "/media/events/hero.webp",
      alt: "Performer smiling on stage with a microphone and guitar",
    },
  },
  context: {
    eyebrow: "Partner with us",
    title: "Sponsor, partner, or host something with us",
    body: [
      "Our events happen because businesses and individuals decide to put their name behind them. Sponsorship puts your business in front of a room that cares who's in it, and it funds grants directly.",
      "There's also room for other ideas. If you want to run a fundraiser, host a collection, or partner on an event of your own, we'd like to hear it.",
    ],
    cta: { donate: true, label: "Donate" },
    paths: [
      {
        id: "sponsor",
        title: "Sponsor a night",
        body: "Put your name behind a room that cares who's in it. Packages start where you are and fund grants directly.",
        open: true,
      },
      {
        id: "host",
        title: "Host a fundraiser",
        body: "Run a collection, a dinner, or a night of your own. We'll help you point every dollar toward Florida veterans.",
        open: false,
      },
      {
        id: "match",
        title: "Corporate match",
        body: "Double the impact of employee giving with a corporate match tied to an event or a year-round partnership.",
        open: false,
      },
    ],
  },
  featured: {
    id: "featured",
    eyebrow: "Featured",
    title: "Songwriters for Vets",
    body: [
      "Once a year, Nashville songwriters take a stage in Florida and play the songs they wrote, many you already know by heart, and share the fascinating stories behind each tune. There's an auction, an open bar, and a community proudly supporting our protectors.",
      "Buying a ticket is one of the most direct ways to support Florida veterans.",
    ],
    collage: [
      {
        key: "events.featured1",
        src: "/media/events/featured-1.webp",
        alt: "Songwriters for Vets performers on stage with an American flag",
      },
      {
        key: "events.featured2",
        src: "/media/events/featured-2.webp",
        alt: "",
      },
      {
        key: "events.featured3",
        src: "/media/events/featured-3.webp",
        alt: "",
      },
      {
        key: "events.featured4",
        src: "/media/events/featured-4.webp",
        alt: "Songwriters for Vets group with a Song Vets 50 sign",
      },
    ],
    meta: [
      {
        icon: "calendar",
        label: "August 29",
        href: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Songwriters%204%20Vets%20%C3%97%20KPF&dates=20260829T190000%2F20260829T220000&ctz=America%2FNew_York&details=&location=Hyatt%20Regency%20Resort%20%E2%80%94%20Coconut%20Point&trp=false",
        external: true,
      },
      {
        icon: "clock",
        label: "7:00 PM",
        href: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Songwriters%204%20Vets%20%C3%97%20KPF&dates=20260829T190000%2F20260829T220000&ctz=America%2FNew_York&details=&location=Hyatt%20Regency%20Resort%20%E2%80%94%20Coconut%20Point&trp=false",
        external: true,
      },
      {
        icon: "map",
        label: "Hyatt Regency Resort — Coconut Point",
        href: "https://www.google.com/travel/search?ts=CAEaSQopEicyJTB4ODhkYjE3OTYxM2RmN2E3NToweGM4M2NkNDM3NWY4YjM3MTgSHBIUCgcI6g8QCBgeEgcI6g8QCBgfGAEyBAgAEAAqBwoFOgNVU0Q&qs=CAEyFENnc0ltTzZzX1BXR3RaN0lBUkFCOAJCCQkYN4tfN9Q8yEIJCRg3i1831DzI&utm_campaign=sharing&utm_medium=link_btn&utm_source=htls",
        external: true,
      },
    ],
    actions: [
      {
        href: "https://www.songwriters4vets.com/event-details/songwriters-4-vets-naples-2026",
        label: "Get tickets",
        variant: "primary",
        external: true,
        trailingIcon: "external",
      },
      {
        href: "/contact/?inquiry=partnership",
        label: "Become a sponsor",
        variant: "outline",
      },
    ],
  },
  library: {
    eyebrow: "On the calendar",
    title: "Upcoming events",
    body: "Benefit nights and partner fundraisers that put money straight into grants for Florida veterans. Will we see you there?",
    emptyTitle: "Nothing on the calendar right now",
    emptyBody:
      "We announce events a few months out. The best way to hear first is to follow along, or reach out if you'd like to help put one together.",
    cardMark: {
      key: "events.cardMark",
      src: "/media/brand/50-badge.png",
      alt: "",
    },
    items: [
      {
        id: "songwriters-naples",
        title: "Songwriters for Vets - Naples",
        body: "Nashville songwriters perform their #1 hits and tell the stories behind them. Auction, open bar, proceeds supporting Florida veterans.",
        dateLabel: "August 29",
        timeLabel: "7:00 PM",
        locationLabel: "Hyatt Regency Resort — Coconut Point",
        locationHref:
          "https://www.google.com/travel/search?ts=CAEaSQopEicyJTB4ODhkYjE3OTYxM2RmN2E3NToweGM4M2NkNDM3NWY4YjM3MTgSHBIUCgcI6g8QCBgeEgcI6g8QCBgfGAEyBAgAEAAqBwoFOgNVU0Q&qs=CAEyFENnc0ltTzZzX1BXR3RaN0lBUkFCOAJCCQkYN4tfN9Q8yEIJCRg3i1831DzI&utm_campaign=sharing&utm_medium=link_btn&utm_source=htls",
        calendarHref:
          "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Songwriters%204%20Vets%20%C3%97%20KPF&dates=20260829T190000%2F20260829T220000&ctz=America%2FNew_York&details=&location=Hyatt%20Regency%20Resort%20%E2%80%94%20Coconut%20Point&trp=false",
        ticketsLabel: "Get tickets",
        ticketsHref: "https://songwriters4vets.com",
        ticketsExternal: true,
      },
      {
        id: "golf-classic",
        title: "Community Golf Classic",
        body: "A partner-hosted scramble raising funds for veteran housing and emergency assistance grants across Southwest Florida.",
        dateLabel: "Jan 2025",
        ticketsLabel: "Get tickets",
        ticketsHref: "/contact/?inquiry=partnership",
        ticketsExternal: false,
      },
      {
        id: "holiday-giving",
        title: "Holiday Giving Night",
        body: "An end-of-year gathering with music, auction items, and a direct path to fund the next round of KPF grants.",
        dateLabel: "Dec 2024",
        ticketsLabel: "Get tickets",
        ticketsHref: "/contact/?inquiry=partnership",
        ticketsExternal: false,
      },
    ],
  },
  cta: {
    title: "There's more than one way to make a difference.",
    body: "Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.",
    actions: [
      { donate: true, label: "Donate", variant: "primary" },
      { href: "/contact/", label: "Get in touch", variant: "outline" },
    ],
    media: {
      key: "cta.flag",
      src: "/media/brand/kpf-flag.mp4",
      alt: "",
    },
  },
};

module.exports = {
  ABOUT,
  BLOG,
  CONTACT,
  EVENTS,
  HOME,
};
