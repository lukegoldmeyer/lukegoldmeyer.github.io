import type { ImageMetadata } from 'astro';

/**
 * Eagerly import every image file that lives inside a photo post folder so both
 * `cover` and `images[]` entries resolve to real `ImageMetadata` objects even when
 * the content asset map returns a raw path string on Windows.
 */
const imagesByPath = (() => {
	const modules = import.meta.glob<{ default: ImageMetadata }>(
		'../content/photos/**/*.{svg,webp,png,jpg,jpeg,gif,avif}',
		{ eager: true, import: 'default' },
	);
	const map = new Map<string, ImageMetadata>();
	for (const [filePath, mod] of Object.entries(modules)) {
		const normalized = filePath.replace(/\\/g, '/');
		map.set(normalized, mod);
		const afterPhotos = normalized.split('/photos/')[1];
		if (afterPhotos) {
			map.set(afterPhotos, mod);
		}
	}
	return map;
})();

const coverByPostId = (() => {
	const modules = import.meta.glob<{ default: ImageMetadata }>(
		'../content/photos/**/{cover,thumbnail}.{svg,webp,png,jpg,jpeg,gif,avif}',
		{ eager: true, import: 'default' },
	);
	const map = new Map<string, ImageMetadata>();
	for (const [filePath, mod] of Object.entries(modules)) {
		const normalized = filePath.replace(/\\/g, '/');
		const m = normalized.match(/\/photos\/([^/]+)\/(?:cover|thumbnail)\.[^/]+$/);
		if (m) map.set(m[1], mod);
	}
	return map;
})();

/**
 * All images inside a given photo post folder, keyed by their filename (and by the
 * relative `<slug>/filename` path). Useful as a fallback when only the first image
 * of a post should render.
 */
export function listPhotoPostImages(postId: string): ImageMetadata[] {
	const prefix = `${postId}/`;
	const out: ImageMetadata[] = [];
	for (const [key, img] of imagesByPath.entries()) {
		if (key.startsWith(prefix)) out.push(img);
	}
	return out;
}

export function resolvePhotoCover(
	postId: string,
	fromCollection: ImageMetadata | string | undefined,
): ImageMetadata | undefined {
	const fromGlob = coverByPostId.get(postId);
	if (fromGlob) return fromGlob;
	if (fromCollection && typeof fromCollection === 'object') return fromCollection;
	const first = listPhotoPostImages(postId)[0];
	return first;
}

/**
 * Resolve one entry from a photo post's `images[]` array. Supports:
 *   - already-resolved `ImageMetadata` (happy path)
 *   - `{ src, alt }` object with ImageMetadata
 *   - raw string path (fallback when Astro returned a path rather than metadata)
 */
export function resolvePhotoImage(
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

	const normalized = raw.replace(/\\/g, '/').replace(/^\.\//, '');
	const withPost = `${postId}/${normalized}`;
	const found = imagesByPath.get(normalized) ?? imagesByPath.get(withPost);
	return found ? { img: found, alt } : undefined;
}
