import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { entryIsPublic } from '../utils/content-visibility';
import { sortProjectsByRecency } from '../utils/sort-projects';

/**
 * Build-time search index. Served as a static JSON file at /search.json and
 * lazy-fetched by the client only when the user opens the search overlay.
 * Each entry now includes a plain-text version of the article body so the
 * client can match against anything you've written, not just frontmatter.
 */

/** Max number of body characters kept per post. 4000 covers roughly 700 words
 * per post — plenty for search while keeping the JSON index small. */
const BODY_LIMIT = 4000;

/** Strip MDX/Markdown formatting down to plain text you can reasonably search.
 * Not perfect (it never is), but it handles the cases that actually matter:
 * MDX imports, code fences, headings, emphasis, links, lists, blockquotes, HR. */
function stripMarkdown(src: string): string {
	return (
		src
			/* MDX imports/exports at the top of the file */
			.replace(/^(?:import|export)\s.+$/gm, ' ')
			/* Fenced code blocks — drop the whole block */
			.replace(/```[\s\S]*?```/g, ' ')
			/* Inline code: keep the text */
			.replace(/`([^`]+)`/g, '$1')
			/* Images: keep the alt text */
			.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
			/* Links: keep the visible text */
			.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
			/* ATX headings markers */
			.replace(/^\s{0,3}#{1,6}\s+/gm, '')
			/* Setext underlines */
			.replace(/^\s{0,3}[=-]{3,}\s*$/gm, ' ')
			/* Horizontal rules */
			.replace(/^\s{0,3}-{3,}\s*$/gm, ' ')
			/* Blockquote markers */
			.replace(/^\s{0,3}>\s?/gm, '')
			/* List markers: -, *, +, or "1." */
			.replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
			/* Bold/italic/strike — keep inner text */
			.replace(/\*\*([^*]+)\*\*/g, '$1')
			.replace(/__([^_]+)__/g, '$1')
			.replace(/\*([^*\n]+)\*/g, '$1')
			.replace(/_([^_\n]+)_/g, '$1')
			.replace(/~~([^~]+)~~/g, '$1')
			/* HTML / JSX tags */
			.replace(/<[^>]+>/g, ' ')
			/* Collapse whitespace */
			.replace(/\s+/g, ' ')
			.trim()
	);
}

function truncate(s: string, n: number): string {
	return s.length <= n ? s : s.slice(0, n);
}

export const GET: APIRoute = async () => {
	const projects = sortProjectsByRecency(await getCollection('projects', entryIsPublic));
	const photos = sortProjectsByRecency(await getCollection('photos', entryIsPublic));

	const items = [
		...projects.map((p) => ({
			type: 'Project' as const,
			url: `/projects/${p.id}/`,
			title: p.data.title,
			description: p.data.description || '',
			tags: p.data.tags ?? [],
			pubDate: p.data.pubDate ? p.data.pubDate.toISOString() : null,
			pinned: p.data.pin === true,
			body: truncate(stripMarkdown(p.body ?? ''), BODY_LIMIT),
		})),
		...photos.map((p) => ({
			type: 'Photo' as const,
			url: `/photo/${p.id}/`,
			title: p.data.title,
			description: p.data.description || '',
			tags: p.data.tags ?? [],
			pubDate: p.data.pubDate ? p.data.pubDate.toISOString() : null,
			pinned: p.data.pin === true,
			body: truncate(stripMarkdown(p.body ?? ''), BODY_LIMIT),
		})),
	];

	return new Response(JSON.stringify({ items, generatedAt: new Date().toISOString() }), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};
