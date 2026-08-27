const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  GALLERY_BATCH_NARROW,
  GALLERY_BATCH_WIDE,
  GALLERY_COLUMNS_WIDE_QUERY,
  GALLERY_ENTER_STAGGER_MS,
  GALLERY_INITIAL_NARROW,
  GALLERY_INITIAL_WIDE,
  GALLERY_MOBILE_QUERY,
  KPF_SCRAPBOOK_TILES_QUERY,
  appendToShortestColumn,
  galleryColumnCount,
  galleryPagingForViewport,
  morePhotosLabel,
  mosaicVisibleCount,
  nextGalleryBatch,
  packMosaicColumns,
  remainingPhotoCount,
  waitForMosaicImages,
} = require("./scrapbookTiles");

describe("gallery paging", () => {
  it("uses 9 then +6 off phones, 6 then +3 on mobile land and port", () => {
    assert.equal(GALLERY_INITIAL_WIDE, 9);
    assert.equal(GALLERY_BATCH_WIDE, 6);
    assert.equal(GALLERY_INITIAL_NARROW, 6);
    assert.equal(GALLERY_BATCH_NARROW, 3);
  });

  it("treats mobile landscape as narrow paging", () => {
    const original = global.window;
    global.window = {
      innerWidth: 844,
      innerHeight: 390,
      matchMedia: (query) => ({
        matches: query === GALLERY_MOBILE_QUERY,
      }),
    };
    try {
      assert.deepEqual(galleryPagingForViewport(), {
        initial: GALLERY_INITIAL_NARROW,
        batch: GALLERY_BATCH_NARROW,
      });
    } finally {
      global.window = original;
    }
  });

  it("treats mobile portrait as narrow paging", () => {
    const original = global.window;
    global.window = {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: (query) => ({
        matches: query === GALLERY_MOBILE_QUERY,
      }),
    };
    try {
      assert.deepEqual(galleryPagingForViewport(), {
        initial: GALLERY_INITIAL_NARROW,
        batch: GALLERY_BATCH_NARROW,
      });
    } finally {
      global.window = original;
    }
  });

  it("treats tablet and desktop as wide paging", () => {
    const original = global.window;
    global.window = {
      innerWidth: 1024,
      innerHeight: 768,
      matchMedia: () => ({ matches: false }),
    };
    try {
      assert.deepEqual(galleryPagingForViewport(), {
        initial: GALLERY_INITIAL_WIDE,
        batch: GALLERY_BATCH_WIDE,
      });
    } finally {
      global.window = original;
    }
  });

  it("labels remaining photos, including the singular", () => {
    assert.equal(morePhotosLabel(41), "41 more photos");
    assert.equal(morePhotosLabel(1), "1 more photo");
    assert.equal(morePhotosLabel(0), "0 more photos");
  });

  it("caps the next click at remaining photos", () => {
    assert.equal(nextGalleryBatch(41, 6), 6);
    assert.equal(nextGalleryBatch(2, 6), 2);
    assert.equal(nextGalleryBatch(0, 6), 0);
  });

  it("subtracts visible tiles from the known total", () => {
    assert.equal(
      remainingPhotoCount({ visible: 9, loaded: 18, total: 50 }),
      41,
    );
    assert.equal(
      remainingPhotoCount({ visible: 50, loaded: 50, total: 50 }),
      0,
    );
  });

  it("falls back to the local buffer, then stops when remote is exhausted", () => {
    assert.equal(
      remainingPhotoCount({ visible: 9, loaded: 18 }),
      9,
    );
    assert.equal(
      remainingPhotoCount({
        visible: 18,
        loaded: 18,
        remoteExhausted: true,
      }),
      0,
    );
  });
});

describe("About scrapbook query", () => {
  it("asks for the remaining-count field next to the first tile page", () => {
    assert.match(KPF_SCRAPBOOK_TILES_QUERY, /kpfScrapbookTilesCount/);
    assert.match(KPF_SCRAPBOOK_TILES_QUERY, /kpfScrapbookTiles\(first: 24, offset: 0\)/);
    assert.match(KPF_SCRAPBOOK_TILES_QUERY, /\bwidth\b/);
    assert.match(KPF_SCRAPBOOK_TILES_QUERY, /\bheight\b/);
  });
});

describe("mosaic shortest-column pack", () => {
  it("drops each tile into the shortest column, left-most on a tie", () => {
    const tall = { id: "tall", width: 100, height: 200 };
    const shortA = { id: "a", width: 100, height: 50 };
    const shortB = { id: "b", width: 100, height: 50 };
    const packed = packMosaicColumns([tall, shortA, shortB], 2);
    assert.deepEqual(
      packed.map((col) => col.map((tile) => tile.id)),
      [["tall"], ["a", "b"]],
    );
    const next = appendToShortestColumn(packed, { id: "c", width: 100, height: 40 });
    assert.equal(next[1][2].id, "c");
    assert.equal(mosaicVisibleCount(next), 4);
  });

  it("uses 2 columns below 30rem and 3 from mobile-L up", () => {
    assert.equal(GALLERY_ENTER_STAGGER_MS, 200);
    assert.equal(
      galleryColumnCount(() => ({ matches: false })),
      2,
    );
    assert.equal(
      galleryColumnCount((query) => ({
        matches: query === GALLERY_COLUMNS_WIDE_QUERY,
      })),
      3,
    );
  });
});

describe("About mosaic control", () => {
  it("uses the counted more-photos button, spinner swap, and 32px pad", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.join(__dirname, "../components/AboutPageScaffold.js"),
      "utf8",
    );
    const css = fs.readFileSync(
      path.join(__dirname, "../styles/pages.css"),
      "utf8",
    );
    assert.match(src, /morePhotosLabel/);
    assert.match(src, /aria-label=\{morePhotosLabel/);
    assert.match(src, /kpf-btn--outline kpf-gallery__more-btn/);
    assert.match(src, /ChevronDown/);
    assert.match(src, /kpf-gallery__more-status/);
    assert.match(src, /kpf-gallery__more-spinner/);
    assert.match(src, /appendToShortestColumn/);
    assert.match(src, /kpf-gallery__column/);
    assert.match(src, /is-enter-in/);
    assert.match(src, /GALLERY_ENTER_STAGGER_MS/);
    assert.doesNotMatch(src, /copy\.gallery\.seeMore/);
    assert.doesNotMatch(src, /LoaderCircle/);
    assert.match(css, /padding-top: 32px;/);
    assert.match(css, /\.kpf-gallery__more \{[\s\S]*?justify-content: center;/);
    assert.match(css, /--kpf-btn-radius: 50%;/);
    assert.match(css, /\.kpf-gallery__more-btn \{/);
    assert.match(css, /\.kpf-gallery__more-spinner \{/);
    assert.match(css, /@keyframes kpf-gallery-enter-y/);
    assert.match(css, /translateY\(64px\)/);
    assert.match(css, /animation-duration: 400ms, 500ms;/);
    assert.match(css, /ease-out, ease-out/);
    assert.match(css, /\.kpf-gallery__column \{/);
  });
});

describe("waitForMosaicImages", () => {
  it("resolves immediately when every img is already complete", async () => {
    const root = {
      querySelectorAll: () => [{ complete: true }],
    };
    await waitForMosaicImages(root, { timeoutMs: 50 });
  });
});
