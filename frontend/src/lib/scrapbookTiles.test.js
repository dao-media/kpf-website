const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  GALLERY_BATCH_NARROW,
  GALLERY_BATCH_WIDE,
  GALLERY_INITIAL,
  KPF_SCRAPBOOK_TILES_QUERY,
  galleryPagingForViewport,
  nextGalleryBatch,
  remainingPhotoCount,
  waitForMosaicImages,
} = require("./scrapbookTiles");

describe("gallery paging", () => {
  it("uses 12 then +9 off portrait phones, +6 on mobile portrait", () => {
    assert.equal(GALLERY_INITIAL, 12);
    assert.equal(GALLERY_BATCH_WIDE, 9);
    assert.equal(GALLERY_BATCH_NARROW, 6);
  });

  it("treats mobile landscape as wide paging", () => {
    const original = global.window;
    global.window = {
      innerWidth: 844,
      innerHeight: 390,
      matchMedia: (query) => ({
        matches: query.includes("orientation: portrait") ? false : false,
      }),
    };
    try {
      assert.deepEqual(galleryPagingForViewport(), {
        initial: GALLERY_INITIAL,
        batch: GALLERY_BATCH_WIDE,
      });
    } finally {
      global.window = original;
    }
  });

  it("treats mobile portrait as +6", () => {
    const original = global.window;
    global.window = {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: (query) => ({
        matches: query === "(max-width: 47.99rem) and (orientation: portrait)",
      }),
    };
    try {
      assert.deepEqual(galleryPagingForViewport(), {
        initial: GALLERY_INITIAL,
        batch: GALLERY_BATCH_NARROW,
      });
    } finally {
      global.window = original;
    }
  });

  it("caps the next click at remaining photos", () => {
    assert.equal(nextGalleryBatch(41, 9), 9);
    assert.equal(nextGalleryBatch(2, 9), 2);
    assert.equal(nextGalleryBatch(0, 9), 0);
  });

  it("subtracts visible tiles from the known total", () => {
    assert.equal(
      remainingPhotoCount({ visible: 12, loaded: 24, total: 50 }),
      38,
    );
    assert.equal(
      remainingPhotoCount({ visible: 50, loaded: 50, total: 50 }),
      0,
    );
  });

  it("falls back to the local buffer, then stops when remote is exhausted", () => {
    assert.equal(
      remainingPhotoCount({ visible: 12, loaded: 24 }),
      12,
    );
    assert.equal(
      remainingPhotoCount({
        visible: 24,
        loaded: 24,
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
  });
});

describe("About mosaic control", () => {
  it("uses the kpf-link See more control in a 32px-padded container", () => {
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
    assert.match(src, /copy\.gallery\.seeMore/);
    assert.match(src, /className="kpf-gallery__more kpf-u-invert"/);
    assert.match(src, /className="kpf-link"/);
    assert.doesNotMatch(src, /kpf-gallery__more-btn/);
    assert.doesNotMatch(src, /ChevronDown/);
    assert.doesNotMatch(src, /LoaderCircle/);
    assert.doesNotMatch(src, /morePhotosLabel/);
    assert.match(css, /\.kpf-gallery__more \{\n\tpadding-top: 2rem; \/\* 32px \*\/\n\}/);
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
