const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  GALLERY_BATCH_NARROW,
  GALLERY_BATCH_WIDE,
  GALLERY_INITIAL_NARROW,
  GALLERY_INITIAL_WIDE,
  KPF_SCRAPBOOK_TILES_QUERY,
  galleryPagingForViewport,
  morePhotosLabel,
  nextGalleryBatch,
  remainingPhotoCount,
  waitForMosaicImages,
} = require("./scrapbookTiles");

describe("gallery paging", () => {
  it("uses 9 then +6 off phones, 6 then +3 on phones", () => {
    assert.equal(GALLERY_INITIAL_WIDE, 9);
    assert.equal(GALLERY_BATCH_WIDE, 6);
    assert.equal(GALLERY_INITIAL_NARROW, 6);
    assert.equal(GALLERY_BATCH_NARROW, 3);
  });

  it("defaults to desktop/tablet paging without a window", () => {
    assert.deepEqual(galleryPagingForViewport(), {
      initial: GALLERY_INITIAL_WIDE,
      batch: GALLERY_BATCH_WIDE,
    });
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
    assert.match(KPF_SCRAPBOOK_TILES_QUERY, /kpfScrapbookTiles\(first: 18, offset: 0\)/);
  });
});

describe("About mosaic control", () => {
  it("uses the counted more-photos button instead of kpf-link See more", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.join(__dirname, "../components/AboutPageScaffold.js"),
      "utf8",
    );
    assert.match(src, /kpf-gallery__more-btn/);
    assert.match(src, /ChevronDown/);
    assert.match(src, /LoaderCircle/);
    assert.match(src, /morePhotosLabel/);
    assert.doesNotMatch(src, /copy\.gallery\.seeMore/);
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
