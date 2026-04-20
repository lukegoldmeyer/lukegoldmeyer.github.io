import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Each project: `src/content/projects/<slug>/index.md(x)` with assets beside it.
 * Base is anchored to this file so the glob always targets `src/content/projects` even if
 * project root / cwd resolution differs between machines or dev vs build.
 */
const projectsContentBase = new URL('./content/projects/', import.meta.url).href;
const photosContentBase = new URL('./content/photos/', import.meta.url).href;

const projects = defineCollection({
	loader: glob({
		base: projectsContentBase,
		pattern: ['**/index.md', '**/index.mdx', '**/index.markdown'],
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().optional().default(''),
			pubDate: z.coerce.date().optional(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()).default([]),
			/** Path relative to this file, e.g. `./thumbnail.jpg` */
			thumbnail: image().optional(),
			/** Match dvdrod "Work in progress" second card */
			wip: z.boolean().optional().default(false),
			/** Pin this project to the right-hand "Pinned" column on /projects */
			pin: z.boolean().optional().default(false),
		}),
});

/**
 * Each photo post: `src/content/photos/<slug>/index.md(x)` with image files beside it.
 * `images` is an explicit ordered list of image files (relative paths, e.g. `./a.jpg`).
 * When there are 2+ images they render in a 2-wide masonry grid in the order listed.
 */
const photos = defineCollection({
	loader: glob({
		base: photosContentBase,
		pattern: ['**/index.md', '**/index.mdx', '**/index.markdown'],
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().optional().default(''),
			pubDate: z.coerce.date().optional(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()).default([]),
			/** Cover image for the /photo index tile. Usually the first/hero shot. */
			cover: image().optional(),
			/**
			 * Ordered list of photos for this post. Render order = array order.
			 * Each entry can be a bare relative path or an object with optional alt text.
			 */
			images: z
				.array(
					z.union([
						image(),
						z.object({
							src: image(),
							alt: z.string().optional(),
						}),
					]),
				)
				.default([]),
			location: z.string().optional(),
			pin: z.boolean().optional().default(false),
		}),
});

export const collections = { projects, photos };
