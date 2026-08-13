/**
 * Scaffold copy grounded in docs/KPF-Page-Content.md.
 * VERIFY/BLOCKED items are omitted or phrased safely.
 */

const HOME = {
  hero: {
    eyebrow: "Together, we can.",
    title: "We fund organizations showing up for vets.",
    body: "The Kevin Popke Foundation makes targeted grants to veteran-focused nonprofits in Tampa Bay and across Florida — the small organizations doing the hardest work, closest to the ground.",
    primaryCta: { href: "/#donate", label: "Donate" },
    secondaryCta: { href: "/#programs", label: "Where your donations go" },
    /* Solid ink stage + cutouts only — Figma 616:1060 (no beach hero.jpg). */
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
      { href: "/#donate", label: "Donate $50 for ‘50’", variant: "primary" },
      { href: "/about/", label: "Kevin’s story", variant: "ink" },
      { href: "/#programs", label: "Where your donation goes", variant: "link" },
    ],
    media: {
      key: "home.kevinDoubleExposure",
      src: "/media/home/kevin-double-exposure.png",
      alt: "Double-exposure portrait of Kevin Popke with a parachutist silhouette",
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
        cta: { href: "/#donate", label: "Donate" },
        media: { key: "home.hero", src: "/media/home/hero.jpg", alt: "" },
      },
      {
        eyebrow: "What You Can Do",
        title: "Check out our events",
        body: "Buy a ticket, bring people, have a good night out for a serious reason.",
        cta: { href: "/events/", label: "See events" },
        media: { key: "events.featured", src: "/media/events/featured.jpg", alt: "" },
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
    primaryCta: { href: "/#donate", label: "Donate via PayPal" },
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
    body: "A Florida foundation that funds the organizations doing the hardest work for veterans — built to continue the way one man spent his life.",
    primaryCta: { href: "#mission", label: "Our mission" },
    secondaryCta: { href: "#history", label: "Who Kevin was" },
    frame: {
      key: "about.heroFrame",
      src: "/media/about/hero-frame.png",
      alt: "Kevin Popke with his wife in a wooden frame",
    },
    background: {
      key: "about.tampaBay",
      src: "/media/about/tampa-bay.png",
      alt: "",
    },
  },
  history: {
    id: "history",
    eyebrow: "Our history",
    title: "Who Kevin was",
    intro: "The Foundation carries a name — and a stack of moments that made it necessary.",
    card: {
      eyebrow: "Donald “Kevin” Popke · “50”",
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
      "The Kevin Popke Foundation supports veteran-focused charities in the Tampa Bay area and other Florida communities through targeted grants.",
      "We look for orgs already doing great work and give them money to keep doing it.",
      "Before a grant goes out, we do the homework. Leadership that lives the commitment. Dollars that reach veterans. Organizations that will still be here in 5 years.",
      "And when we can, we go see it.",
    ],
    criteria: [
      {
        id: "leadership",
        title: "Leadership in the work",
        body: "We look for organizations with leadership that lives the commitment rather than administering it — people who are personally in the work.",
        open: true,
      },
      {
        id: "dollar-reach",
        title: "Dollar reach",
        body: "We look at how much of each dollar reaches a veteran — low overhead, high impact, money that shows up where it’s needed.",
      },
      {
        id: "longevity",
        title: "Longevity",
        body: "We look at whether the organization will still be here in five years — stability matters when veterans need ongoing support.",
      },
      {
        id: "local",
        title: "Local enough to visit",
        body: "That’s why we grant locally. Tampa Bay and Florida are close enough that we can meet the people running these programs, watch the work, and stay in touch afterward.",
      },
    ],
  },
  grantees: {
    eyebrow: "Making an impact",
    title: "Meet our grantees",
    body: "Our grants have supported veterans facing very different situations: veterans without housing, veterans living with serious injuries, and Special Operations families hit with a sudden financial crisis.",
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
    featured: {
      key: "about.galleryFeatured",
      src: "/media/home/kevin.jpg",
      alt: "Donald “Kevin” Popke",
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
    title: "Together, we can.",
    body: "There’s more than one way to be part of this.",
    actions: [
      { href: "/#donate", label: "Donate", variant: "primary" },
      { href: "/contact/", label: "Get in touch", variant: "secondary" },
    ],
  },
};

const CONTACT = {
  hero: {
    eyebrow: "Contact",
    title: "Get in touch",
    body: "A nonprofit is only as strong as the community holding it up. Whatever you have in mind, start here.",
  },
  ways: {
    eyebrow: "Community",
    title: "Ways to help",
    cards: [
      {
        title: "Volunteer",
        body: "Events need hands, and so does the work between them. Tell us what you’re good at.",
      },
      {
        title: "Sponsor an event",
        body: "Put your business behind a night that funds grants for Florida veterans.",
      },
      {
        title: "Partner with us",
        body: "Corporate matching, a fundraiser of your own, or an idea we haven’t thought of yet.",
      },
      {
        title: "Spread the word",
        body: "Share what we do with people who’d want to know. It costs nothing and it works.",
      },
    ],
  },
  form: {
    eyebrow: "Message",
    title: "Send us a message",
    body: "We’ll get back within a few days.",
  },
  aside: {
    eyebrow: "Direct",
    title: "Or reach us directly",
    org: "The Kevin Popke Foundation, Inc.",
    note: "A 501(c)(3) nonprofit organization",
    donate: { href: "/#donate", label: "Donate" },
  },
};

const EVENTS = {
  hero: {
    eyebrow: "What funds our mission",
    title: "Events",
    body: "Our events raise the money we grant. They’re also a good time.",
    primaryCta: { href: "#featured", label: "Songwriters for Vets" },
    secondaryCta: { href: "/contact/?inquiry=partnership", label: "Partner with us" },
    media: {
      key: "events.hero",
      src: "/media/events/hero.jpg",
      alt: "",
    },
  },
  context: {
    eyebrow: "Partnership",
    title: "Sponsor, partner, or host something with us",
    body: [
      "Our events happen because businesses and individuals decide to put their name behind them. Sponsorship puts your business in front of a room that cares who’s in it — and it funds grants directly.",
      "There’s also room for other ideas. If you want to run a fundraiser for the Foundation, host a collection, put together a corporate giving match, or partner on an event of your own, we’d like to hear it.",
    ],
    cta: { href: "/contact/?inquiry=partnership", label: "Start a conversation" },
  },
  featured: {
    id: "featured",
    eyebrow: "Our largest source of support",
    title: "Songwriters for Vets",
    body: [
      "Once a year, Nashville songwriters take a stage in Florida and play the songs they wrote — the ones you already know by heart — and tell you how each one came to exist. There’s an auction, an open bar, and a room full of people who came for the same reason.",
      "Songwriters for Vets is the single largest source of the grant money this Foundation puts to work each year. Buying a ticket is one of the most direct ways to support Florida veterans.",
    ],
    media: {
      key: "events.featured",
      src: "/media/events/featured.jpg",
      alt: "",
    },
    actions: [
      {
        href: "https://songwriters4vets.com",
        label: "Get tickets",
        variant: "primary",
        external: true,
      },
      {
        href: "/contact/?inquiry=partnership",
        label: "Become a sponsor",
        variant: "secondary",
      },
    ],
  },
  library: {
    eyebrow: "Upcoming",
    title: "Upcoming events",
    emptyTitle: "Nothing on the calendar right now",
    emptyBody:
      "We announce events a few months out. The best way to hear first is to follow along — or reach out if you’d like to help put one together.",
    media: {
      key: "events.library1",
      src: "/media/events/library-1.jpg",
      alt: "",
    },
  },
  cta: {
    title: "Ready to help put on the next one?",
    body: "Tell us what you have in mind — sponsorship, a fundraiser, or a partnership of your own.",
    actions: [
      { href: "/contact/?inquiry=partnership", label: "Start a conversation", variant: "primary" },
      { href: "/#donate", label: "Donate", variant: "secondary" },
    ],
  },
};

module.exports = {
  ABOUT,
  CONTACT,
  EVENTS,
  HOME,
};
