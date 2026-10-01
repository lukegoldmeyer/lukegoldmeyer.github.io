import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { resolveMediaCover } from '../../utils/media-assets';
import { resolveProjectThumbnail } from '../../utils/project-thumbnails';

/**
 * Small cover thumbnails for the /admin post list, keyed by `<collection>/<slug>`, so
 * the list doesn't download full-size originals. Includes hidden posts.
 */
export const GET: APIRoute = async () => {
	const out: Record<string, string> = {};
	const thumb = async (img: Parameters<typeof getImage>[0]['src']) =>
		(await getImage({ src: img, width: 160, height: 120, fit: 'cover', format: 'webp' })).src;

	for (const post of await getCollection('media')) {
		const cover = resolveMediaCover(post);
		if (cover) out[`media/${post.id}`] = await thumb(cover);
	}
	for (const project of await getCollection('projects')) {
		const t = resolveProjectThumbnail(project.id, project.data.thumbnail);
		if (t) out[`projects/${project.id}`] = await thumb(t);
	}
	return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
};
