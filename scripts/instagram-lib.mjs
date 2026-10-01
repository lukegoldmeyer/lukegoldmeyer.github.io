/**
 * Shared helpers for Instagram cross-posting.
 *
 *   instagram-prepare.mjs  runs after `astro build`: writes Instagram-ready JPEGs to dist/ig/<slug>/<n>.jpg
 *   instagram-publish.mjs  runs in GitHub Actions after a push: posts them once the deploy is live
 *
 * A media post opts in with `instagram: { publish: true }` in its frontmatter (or the
 * "Also post to Instagram" toggle in /admin). Published posts are recorded in
 * src/data/instagram.json so nothing is ever posted twice.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

export const ROOT = resolve(import.meta.dirname, '..');
export const MEDIA_DIR = join(ROOT, 'src/content/media');
export const STATE_FILE = join(ROOT, 'src/data/instagram.json');

/** Instagram's limits: 10 carousel items, aspect ratio 4:5 to 1.91:1, 1440px max width. */
export const IG_MAX_ITEMS = 10;
export const IG_MIN_RATIO = 4 / 5;
export const IG_MAX_RATIO = 1.91;
export const IG_WIDTH = 1440;

export function readState() {
	return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
}

function readFrontmatter(file) {
	const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
	return m ? (yaml.load(m[1]) ?? {}) : {};
}

function relPath(entry) {
	const src = typeof entry === 'string' ? entry : entry?.src;
	return typeof src === 'string' && src ? src.replace(/^\.\//, '') : undefined;
}

function defaultCaption(data) {
	const hashtags = (data.tags ?? [])
		.map((t) => '#' + String(t).replace(/[^\p{L}\p{N}_]/gu, ''))
		.filter((t) => t.length > 1)
		.join(' ');
	return [data.title, data.description, hashtags].filter(Boolean).join('\n\n');
}

/** Every media post that has opted in to Instagram and isn't hidden. */
export function listInstagramPosts() {
	if (!existsSync(MEDIA_DIR)) return [];
	const posts = [];
	for (const slug of readdirSync(MEDIA_DIR)) {
		const dir = join(MEDIA_DIR, slug);
		const file = ['index.mdx', 'index.md'].map((f) => join(dir, f)).find(existsSync);
		if (!file) continue;
		const data = readFrontmatter(file);
		if (data.hidden === true || data.instagram?.publish !== true) continue;

		const listed = (data.images ?? []).map(relPath).filter(Boolean);
		const files = (listed.length ? listed : [relPath(data.cover)].filter(Boolean))
			.slice(0, IG_MAX_ITEMS)
			.map((f) => join(dir, f));
		const missing = files.filter((f) => !existsSync(f));
		if (missing.length) throw new Error(`${slug}: Instagram image not found: ${missing.join(', ')}`);

		posts.push({
			slug,
			files,
			fit: data.instagram.fit === 'crop' ? 'crop' : 'pad',
			caption: (data.instagram.caption || defaultCaption(data)).slice(0, 2200),
		});
	}
	return posts;
}

/** Public path of the n-th (0-based) prepared JPEG for a post. */
export const igImagePath = (slug, i) => `/ig/${slug}/${i + 1}.jpg`;
