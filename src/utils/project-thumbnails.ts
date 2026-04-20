import type { ImageMetadata } from 'astro';

/**
 * Eagerly import project `thumbnail.*` files so `<Image src>` always gets `ImageMetadata`.
 * Use this when `project.data.thumbnail` is still a raw path string (content asset map can miss on Windows).
 */
const thumbnailByProjectId = (() => {
	const modules = import.meta.glob<{ default: ImageMetadata }>(
		'../content/projects/**/thumbnail.{svg,webp,png,jpg,jpeg,gif,avif}',
		{ eager: true, import: 'default' },
	);
	const map = new Map<string, ImageMetadata>();
	for (const [filePath, mod] of Object.entries(modules)) {
		const normalized = filePath.replace(/\\/g, '/');
		const m = normalized.match(/\/projects\/([^/]+)\/thumbnail\.[^/]+$/);
		if (m) {
			map.set(m[1], mod);
		}
	}
	return map;
})();

export function resolveProjectThumbnail(
	projectId: string,
	fromCollection: ImageMetadata | string | undefined,
): ImageMetadata | undefined {
	const fromGlob = thumbnailByProjectId.get(projectId);
	if (fromGlob) {
		return fromGlob;
	}
	if (fromCollection && typeof fromCollection === 'object') {
		return fromCollection;
	}
	return undefined;
}
