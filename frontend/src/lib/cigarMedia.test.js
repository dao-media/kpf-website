const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_CIGAR_SRC,
  DEFAULT_CIGAR_SRCSET,
  DEFAULT_CIGAR_SIZES,
} = require("../lib/cigarMedia");

describe("cigarMedia", () => {
  it("ships a 360w candidate so the footer does not download the 718px source", () => {
    assert.equal(DEFAULT_CIGAR_SRC, "/media/cigar/Cigar-360.webp");
    assert.match(DEFAULT_CIGAR_SRCSET, /Cigar-360\.webp 360w/);
    assert.match(DEFAULT_CIGAR_SRCSET, /Cigar-540\.webp 540w/);
    assert.match(DEFAULT_CIGAR_SRCSET, /Cigar\.webp 718w/);
    assert.match(DEFAULT_CIGAR_SIZES, /12\.5rem/);
    assert.match(DEFAULT_CIGAR_SIZES, /22rem/);
  });
});
