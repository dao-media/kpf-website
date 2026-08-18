const assert = require("assert");

function eventLibraryPlaceholderCount(eventCount, columns) {
  const count = Math.max(0, Number(eventCount) || 0);
  const cols = Math.max(0, Math.floor(Number(columns) || 0));
  if (cols <= 1 || count <= 0) return 0;
  const rem = count % cols;
  return rem === 0 ? 0 : cols - rem;
}

assert.equal(eventLibraryPlaceholderCount(0, 3), 0);
assert.equal(eventLibraryPlaceholderCount(1, 3), 2);
assert.equal(eventLibraryPlaceholderCount(2, 3), 1);
assert.equal(eventLibraryPlaceholderCount(3, 3), 0);
assert.equal(eventLibraryPlaceholderCount(4, 3), 2);
assert.equal(eventLibraryPlaceholderCount(5, 3), 1);
assert.equal(eventLibraryPlaceholderCount(1, 2), 1);
assert.equal(eventLibraryPlaceholderCount(2, 2), 0);
assert.equal(eventLibraryPlaceholderCount(3, 2), 1);
assert.equal(eventLibraryPlaceholderCount(1, 1), 0);
assert.equal(eventLibraryPlaceholderCount(2, 1), 0);

console.log("EventCardPlaceholder helpers ok");
