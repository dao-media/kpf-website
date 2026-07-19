const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
	extractCopyFields,
	updateCopyField,
} = require('../src/designs-admin/copyFields');

describe('design copy fields', () => {
	it('extracts visible frontend copy and content attributes', () => {
		const fields = extractCopyFields(
			'<main><h1>Hello &amp; welcome</h1><img alt="Team photo"><input placeholder="Email"><div>Not copy</div></main>'
		);

		assert.deepEqual(
			fields.map(({ kind, name, value }) => ({ kind, name, value })),
			[
				{ kind: 'text', name: '', value: 'Hello & welcome' },
				{ kind: 'attribute', name: 'alt', value: 'Team photo' },
				{ kind: 'attribute', name: 'placeholder', value: 'Email' },
			]
		);
	});

	it('ignores scripts, styles, comments, chrome text, and placeholder-only values', () => {
		const fields = extractCopyFields(
			'<style>.x{color:red}</style><!-- hidden --><script>alert("x")</script><h1>{{page.title}}</h1><p>Visible</p><div>.x { color: red; }</div><nav><span>Skip</span></nav>'
		);

		assert.deepEqual(
			fields.map(({ value }) => value),
			['Visible']
		);
	});

	it('keeps nested inline copy inside headings and paragraphs', () => {
		const fields = extractCopyFields('<p>Hello <strong>world</strong></p>');
		assert.deepEqual(
			fields.map(({ value }) => value),
			['Hello ', 'world']
		);
	});

	it('preserves trailing spaces while editing text', () => {
		const html = '<h1>Hello</h1>';
		const field = extractCopyFields(html)[0];
		const withSpace = updateCopyField(html, field, 'Hello ');
		assert.equal(withSpace, '<h1>Hello </h1>');
		assert.equal(extractCopyFields(withSpace)[0].value, 'Hello ');

		const next = extractCopyFields(withSpace)[0];
		const withWord = updateCopyField(withSpace, next, 'Hello world');
		assert.equal(withWord, '<h1>Hello world</h1>');
		assert.equal(extractCopyFields(withWord)[0].value, 'Hello world');
	});

	it('keeps special characters as UTF-8 and only escapes markup', () => {
		const html = '<h1>Hi</h1>';
		const field = extractCopyFields(html)[0];
		const updated = updateCopyField(html, field, "Kevin's — “quote” & more");

		assert.equal(updated, `<h1>Kevin's — “quote” &amp; more</h1>`);
		assert.equal(extractCopyFields(updated)[0].value, "Kevin's — “quote” & more");
	});

	it('uses stable field ids when text length changes', () => {
		const html = '<h1>Hi</h1><p>Body</p>';
		const before = extractCopyFields(html);
		const updated = updateCopyField(html, before[0], 'Hello there');
		const after = extractCopyFields(updated);

		assert.equal(before[0].id, after[0].id);
		assert.equal(before[1].id, after[1].id);
		assert.equal(after[0].value, 'Hello there');
	});

	it('updates one field without reformatting the surrounding source', () => {
		const html = '<section class="hero">\n  <h1>Old heading</h1>\n</section>';
		const field = extractCopyFields(html)[0];
		const updated = updateCopyField(html, field, 'New & improved');

		assert.equal(
			updated,
			'<section class="hero">\n  <h1>New &amp; improved</h1>\n</section>'
		);
		assert.equal(extractCopyFields(updated)[0].value, 'New & improved');
	});

	it('escapes attribute edits using the original quote style', () => {
		const html = "<img title=\"title\" alt='A photo'>";
		const fields = extractCopyFields(html);

		assert.equal(
			updateCopyField(html, fields[0], 'New title'),
			"<img title=\"New title\" alt='A photo'>"
		);
		assert.equal(
			updateCopyField(html, fields[1], "Dane's photo"),
			"<img title=\"title\" alt='Dane&#039;s photo'>"
		);
	});

	it('includes button and link copy used as CTAs', () => {
		const fields = extractCopyFields(
			'<a href="#signup" class="btn">Get started</a><button type="button">Request a demo</button>'
		);

		assert.deepEqual(
			fields.map(({ tag, value }) => ({ tag, value })),
			[
				{ tag: 'a', value: 'Get started' },
				{ tag: 'button', value: 'Request a demo' },
			]
		);
	});
});
