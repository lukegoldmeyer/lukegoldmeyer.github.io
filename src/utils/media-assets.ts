import type { ImageMetadata } from 'astro';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Eagerly import every image file that lives inside a media post folder so both
 * `cover` and `images[]` entries resolve to real `ImageMetadata` objects even when
 * the content asset map returns a raw path string on Windows.
 */
const imagesByPath = (() => {
	const modules = import.meta.glob<{ default: ImageMetadata }>(
		'../content/media/**/*.{svg,webp,png,jpg,jpeg,gif,avif}',
		{ eager: true, import: 'default' },
	);
	const map = new Map<string, ImageMetadata>();
	for (const [filePath, mod] of Object.entries(modules)) {
		const normalized = filePath.replace(/\\/g, '/');
		map.set(normalized, mod);
		const afterMedia = normalized.split('/media/')[1];
		if (afterMedia) {
			map.set(afterMedia, mod);
		}
	}
	return map;
})();

const coverByPostId = (() => {
	const modules = import.meta.glob<{ default: ImageMetadata }>(
		'../content/media/**/{cover,thumbnail}.{svg,webp,png,jpg,jpeg,gif,avif}',
		{ eager: true, import: 'default' },
	);
	const map = new Map<string, ImageMetadata>();
	for (const [filePath, mod] of Object.entries(modules)) {
		const normalized = filePath.replace(/\\/g, '/');
		const m = normalized.match(/\/media\/([^/]+)\/(?:cover|thumbnail)\.[^/]+$/);
		if (m) map.set(m[1], mod);
	}
	return map;
})();

/** GitHub warns above 50 MB and rejects files over 100 MB; keep clips small. */
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Self-hosted clips, keyed by `<slug>/<filename>`. Values are the built asset URLs. */
const videosByPath = (() => {
	const modules = import.meta.glob<string>('../content/media/**/*.{mp4,webm,mov,m4v}', {
		eager: true,
		query: '?url',
		import: 'default',
	});
	const map = new Map<string, string>();
	for (const [filePath, url] of Object.entries(modules)) {
		const normalized = filePath.replace(/\\/g, '/');
		/* Glob keys are relative to this file; after bundling `import.meta.url` moves, so anchor on the project root. */
		const bytes = statSync(resolve(process.cwd(), 'src/utils', normalized)).size;
		if (bytes > MAX_VIDEO_BYTES) {
			throw new Error(
				`${normalized} is ${(bytes / 1024 / 1024).toFixed(1)} MB. GitHub allows 50 MB per file in practice: ` +
					'compress it, or upload it to YouTube/Vimeo and use `embed:` instead.',
			);
		}
		const afterMedia = normalized.split('/media/')[1];
		if (afterMedia) map.set(afterMedia, url);
	}
	return map;
})();

const normalizeRel = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '');

/**
 * All images inside a given media post folder. Used as a last-resort cover when
 * the post lists no images explicitly.
 */
export function listMediaPostImages(postId: string): ImageMetadata[] {
	const prefix = `${postId}/`;
	const out: ImageMetadata[] = [];
	for (const [key, img] of imagesByPath.entries()) {
		if (key.startsWith(prefix)) out.push(img);
	}
	return out;
}

/**
 * Resolve one entry from a media post's `images[]` array. Supports:
 *   - already-resolved `ImageMetadata` (happy path)
 *   - `{ src, alt }` object with ImageMetadata
 *   - raw string path (fallback when Astro returned a path rather than metadata)
 */
export function resolveMediaImage(
	postId: string,
	entry: unknown,
): { img: ImageMetadata; alt?: string } | undefined {
	const unwrap = (val: unknown): ImageMetadata | string | undefined => {
		if (!val) return undefined;
		if (typeof val === 'string') return val;
		if (typeof val === 'object' && val !== null && 'src' in val) {
			return (val as { src: ImageMetadata | string }).src;
		}
		return undefined;
	};

	const alt =
		entry && typeof entry === 'object' && 'alt' in (entry as Record<string, unknown>)
			? ((entry as { alt?: string }).alt ?? undefined)
			: undefined;

	const raw = unwrap(entry);
	if (!raw) return undefined;
	if (typeof raw === 'object') return { img: raw, alt };

	const normalized = normalizeRel(raw);
	const found = imagesByPath.get(normalized) ?? imagesByPath.get(`${postId}/${normalized}`);
	return found ? { img: found, alt } : undefined;
}

/**
 * Cover for listing tiles, in priority order: the `cover` field, a `cover.*` /
 * `thumbnail.*` file in the folder, the first `images[]` entry, the first video
 * poster, then any image in the folder.
 */
export function resolveMediaCover(post: {
	id: string;
	data: { cover?: ImageMetadata | string; images?: unknown[]; videos?: { poster?: ImageMetadata }[] };
}): ImageMetadata | undefined {
	const { cover, images = [], videos = [] } = post.data;
	if (cover) {
		const resolved = resolveMediaImage(post.id, cover);
		if (resolved) return resolved.img;
	}
	return (
		coverByPostId.get(post.id) ??
		(images.length ? resolveMediaImage(post.id, images[0])?.img : undefined) ??
		videos.find((v) => v.poster)?.poster ??
		listMediaPostImages(post.id)[0]
	);
}

export type ResolvedVideo =
	| { type: 'file'; url: string; poster?: ImageMetadata; caption?: string }
	| { type: 'embed'; url: string; caption?: string };

/** Turn a YouTube or Vimeo link into its privacy-friendly embed URL. */
function toEmbedUrl(link: string): string | undefined {
	let u: URL;
	try {
		u = new URL(link);
	} catch {
		return undefined;
	}
	const host = u.hostname.replace(/^www\.|^m\./, '');
	if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
	if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
		const id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/)?.[1];
		if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
	}
	if (host === 'vimeo.com') {
		const id = u.pathname.match(/^\/(\d+)/)?.[1];
		if (id) return `https://player.vimeo.com/video/${id}?dnt=1`;
	}
	if (host === 'player.vimeo.com') return link;
	return undefined;
}

/** Resolve a post's `videos[]` into playable file URLs or embed URLs. Throws on a bad entry. */
export function resolveMediaVideos(post: {
	id: string;
	data: { videos?: { src?: string; embed?: string; poster?: ImageMetadata; caption?: string }[] };
}): ResolvedVideo[] {
	return (post.data.videos ?? []).map((v) => {
		if (v.embed) {
			const url = toEmbedUrl(v.embed);
			if (!url) throw new Error(`${post.id}: "${v.embed}" is not a YouTube or Vimeo link.`);
			return { type: 'embed', url, caption: v.caption };
		}
		const key = `${post.id}/${normalizeRel(v.src ?? '')}`;
		const url = videosByPath.get(key);
		if (!url) throw new Error(`${post.id}: video file "${v.src}" not found in src/content/media/${post.id}/.`);
		return { type: 'file', url, poster: v.poster, caption: v.caption };
	});
}

export { kindLabels } from './media-kinds';
