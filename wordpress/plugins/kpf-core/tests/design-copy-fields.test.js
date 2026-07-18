const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
	extractCopyFields,
	updateCopyField,
} = require('../src/designs-admin/copyFields');

describe('design copy fields', () => {
	it('extracts visible text and content attributes', () => {
		const fields = extractCopyFields(
			'<main><h1>Hello &amp; welcome</h1><img alt="Team photo"><input placeholder="Email"></main>'
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

	it('ignores scripts, styles, comments, and placeholder-only values', () => {
		const fields = extractCopyFields(
			'<style>.x{color:red}</style><!-- hidden --><script>alert("x")</script><h1>{{page.title}}</h1><p>Visible</p>'
		);

		assert.deepEqual(fields.map(({ value }) => value), ['Visible']);
	});

	it('updates one field without reformatting the surrounding source', () => {
		const html = '<section class="hero">\n  <h1>Old heading</h1>\n</section>';
		const field = extractCopyFields(html)[0];
		const updated = updateCopyField(html, field, 'New & improved');

		assert.equal(
			updated,
			'<section class="hero">\n  <h1>New &amp; improved</h1>\n</section>'
		);
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
});
