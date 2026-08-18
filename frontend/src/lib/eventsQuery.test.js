const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeEventNodes,
  pickFeaturedEvent,
  featuredSectionFromEvent,
} = require("./eventsQuery");

test("normalizeEventNodes maps GraphQL nodes", () => {
  const list = normalizeEventNodes([
    {
      databaseId: 12,
      title: "Songwriters for Vets",
      slug: "songwriters",
      eventDetails: {
        featured: true,
        logline: "One night.",
        description: "First paragraph.\n\nSecond paragraph.",
        scheduleLabel: "Sat, Aug 29, 2026",
        timeLabel: "7:00 PM",
        calendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE",
        ticketingLink: "https://tickets.example",
        website: "",
        location: {
          display: "Bonita Springs, FL",
          mapsUrl: "https://maps.example/dir",
        },
        hosts: [
          {
            termId: 53,
            name: "Kevin Popke Foundation",
            logoId: 774,
            logoUrl: "https://example.com/kpf.jpg",
          },
          {
            termId: 52,
            name: "Songwriters 4 Vets",
            logoId: 743,
            logoUrl: "https://example.com/s4v.jpg",
          },
        ],
      },
    },
  ]);

  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Songwriters for Vets");
  assert.equal(list[0].featured, true);
  assert.deepEqual(list[0].bodyParagraphs, [
    "First paragraph.",
    "Second paragraph.",
  ]);
  assert.equal(list[0].ticketsHref, "https://tickets.example");
  assert.equal(list[0].timeLabel, "7:00 PM");
  assert.equal(list[0].locationHref, "https://maps.example/dir");
  assert.match(list[0].calendarUrl, /calendar\.google\.com/);
  assert.equal(list[0].hosts.length, 2);
  assert.equal(list[0].hosts[0].name, "Kevin Popke Foundation");
  assert.equal(list[0].hosts[1].logoUrl, "https://example.com/s4v.jpg");
});

test("pickFeaturedEvent prefers featured flag", () => {
  const picked = pickFeaturedEvent([
    {
      databaseId: 1,
      title: "Golf",
      eventDetails: { featured: false, description: "A" },
    },
    {
      databaseId: 2,
      title: "Songwriters",
      eventDetails: { featured: true, description: "B" },
    },
  ]);
  assert.equal(picked.title, "Songwriters");
});

test("featuredSectionFromEvent builds title body meta with links", () => {
  const section = featuredSectionFromEvent(
    {
      title: "Songwriters for Vets",
      bodyParagraphs: ["Once a year.", "Buy a ticket."],
      scheduleLabel: "Sat, Aug 29, 2026",
      timeLabel: "7:00 PM",
      calendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Songwriters",
      locationLabel: "Hyatt Regency",
      locationHref: "https://maps.example",
      ticketsHref: "https://tickets.example",
      ticketsExternal: true,
    },
    {
      title: "Fallback",
      body: ["Fallback body"],
      meta: [{ icon: "calendar", label: "Fallback date" }],
      actions: [
        {
          href: "#",
          label: "Get tickets",
          variant: "primary",
          external: true,
          trailingIcon: "external",
        },
      ],
    },
  );

  assert.equal(section.title, "Songwriters for Vets");
  assert.deepEqual(section.body, ["Once a year.", "Buy a ticket."]);
  assert.equal(section.meta.length, 3);
  assert.equal(section.meta[0].icon, "calendar");
  assert.match(section.meta[0].href, /calendar\.google\.com/);
  assert.equal(section.meta[1].icon, "clock");
  assert.equal(section.meta[1].label, "7:00 PM");
  assert.equal(section.meta[2].href, "https://maps.example");
  assert.ok(!section.meta.some((chip) => chip.icon === "ticket"));
  assert.equal(section.actions[0].href, "https://tickets.example");
});
