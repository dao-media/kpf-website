#!/usr/bin/env node
/**
 * Build a compact Lucide catalog (categories + per-icon tags/categories)
 * from the official lucide-icons/lucide metadata (sparse clone cache or path).
 *
 * Usage:
 *   node scripts/build-lucide-catalog.mjs [/path/to/lucide/repo]
 *
 * Default metadata source: /tmp/lucide-meta (from sparse clone) or
 * downloads a fresh sparse clone there.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/icons-admin/lucideCatalog.json');
const DEFAULT_META = '/tmp/lucide-meta';

function toPascalCase(kebab) {
	return String(kebab || '')
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

function ensureMeta(metaRoot) {
	const iconsDir = path.join(metaRoot, 'icons');
	const catsDir = path.join(metaRoot, 'categories');
	if (fs.existsSync(iconsDir) && fs.existsSync(catsDir)) {
		return metaRoot;
	}

	fs.mkdirSync(metaRoot, { recursive: true });
	const r = spawnSync(
		'git',
		[
			'clone',
			'--depth',
			'1',
			'--filter=blob:none',
			'--sparse',
			'https://github.com/lucide-icons/lucide.git',
			metaRoot,
		],
		{ stdio: 'inherit' }
	);
	if (r.status !== 0) {
		throw new Error('Failed to clone lucide metadata');
	}
	const s = spawnSync('git', ['sparse-checkout', 'set', 'icons', 'categories'], {
		cwd: metaRoot,
		stdio: 'inherit',
	});
	if (s.status !== 0) {
		throw new Error('Failed to sparse-checkout lucide icons/categories');
	}
	return metaRoot;
}

function main() {
	const metaRoot = ensureMeta(process.argv[2] || DEFAULT_META);
	const iconsDir = path.join(metaRoot, 'icons');
	const catsDir = path.join(metaRoot, 'categories');

	const categories = fs
		.readdirSync(catsDir)
		.filter((f) => f.endsWith('.json'))
		.map((file) => {
			const id = file.replace(/\.json$/, '');
			const data = JSON.parse(fs.readFileSync(path.join(catsDir, file), 'utf8'));
			return {
				id,
				title: data.title || id,
				icon: data.icon || id,
			};
		})
		.sort((a, b) => a.title.localeCompare(b.title));

	const byPascal = {};
	const byCategory = Object.fromEntries(categories.map((c) => [c.id, []]));

	for (const file of fs.readdirSync(iconsDir)) {
		if (!file.endsWith('.json')) continue;
		const kebab = file.replace(/\.json$/, '');
		const data = JSON.parse(fs.readFileSync(path.join(iconsDir, file), 'utf8'));
		const pascal = toPascalCase(kebab);
		const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
		const cats = Array.isArray(data.categories) ? data.categories.map(String) : [];
		byPascal[pascal] = { kebab, tags, categories: cats };
		for (const cat of cats) {
			if (!byCategory[cat]) byCategory[cat] = [];
			byCategory[cat].push(pascal);
		}
	}

	for (const id of Object.keys(byCategory)) {
		byCategory[id].sort((a, b) => a.localeCompare(b));
	}

	const payload = {
		generatedAt: new Date().toISOString(),
		source: 'https://github.com/lucide-icons/lucide (icons + categories metadata)',
		categories,
		icons: byPascal,
		byCategory,
	};

	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
	console.log(
		`Wrote ${OUT} (${categories.length} categories, ${Object.keys(byPascal).length} icons)`
	);
}

main();
