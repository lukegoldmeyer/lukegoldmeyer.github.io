import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { mediaKinds } from './utils/media-kinds';

/**
 * Each project: `src/content/projects/<slug>/index.md(x)` with assets beside it.
 * Base is anchored to this file so the glob always targets `src/content/projects` even if
 * project root / cwd resolution differs between machines or dev vs build.
 */
const projectsContentBase = new URL('./content/projects/', import.meta.url).href;
const mediaContentBase = new URL('./content/media/', import.meta.url).href;

/**
 * The /admin CMS can write blank optional fields as `''` or `null`; treat those as unset
 * so a half-filled form never breaks the build.
 */
const blank = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((v) => (v === '' || v === null ? undefined : v), schema);

const projects = defineCollection({
	loader: glob({
		base: projectsContentBase,
		pattern: ['**/index.md', '**/index.mdx', '**/index.markdown'],
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: blank(z.string().optional().default('')),
			pubDate: blank(z.coerce.date().optional()),
			updatedDate: blank(z.coerce.date().optional()),
			tags: blank(z.array(z.string()).default([])),
			/** Path relative to this file, e.g. `./thumbnail.jpg` */
			thumbnail: blank(image().optional()),
			/** Match dvdrod "Work in progress" second card */
			wip: blank(z.boolean().optional().default(false)),
			/** Pin this project to the right-hand "Pinned" column on /projects */
			pin: blank(z.boolean().optional().default(false)),
			/** If true, omit from listings and search; the post URL still works. */
			hidden: blank(z.boolean().optional().default(false)),
		}),
});

/**
 * Each media post: `src/content/media/<slug>/index.md(x)` with its files beside it.
 * `kind` decides which filter it lives under on /media (Photo, Design, Video).
 * `images` is an explicit ordered list of image files (relative paths, e.g. `./a.jpg`).
 * When there are 2+ images they render in a 2-wide masonry grid in the order listed.
 */
const media = defineCollection({
	loader: glob({
		base: mediaContentBase,
		pattern: ['**/index.md', '**/index.mdx', '**/index.markdown'],
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			kind: blank(z.enum(mediaKinds).default('photo')),
			description: blank(z.string().optional().default('')),
			pubDate: blank(z.coerce.date().optional()),
			updatedDate: blank(z.coerce.date().optional()),
			tags: blank(z.array(z.string()).default([])),
			/** Cover image for listing tiles. Usually the first/hero shot. */
			cover: blank(image().optional()),
			/**
			 * Ordered list of images for this post. Render order = array order.
			 * Each entry can be a bare relative path or an object with optional alt text.
			 */
			images: blank(
				z
					.array(
						z.union([
							image(),
							z.object({
								src: image(),
								alt: blank(z.string().optional()),
							}),
						]),
					)
					.default([]),
			),
			/**
			 * Ordered list of videos. Each one is either a short clip stored beside the post
			 * (`src: ./clip.mp4`, max 25 MB per file on Cloudflare Pages) or a YouTube/Vimeo
			 * link (`embed: https://youtu.be/...`) for anything longer.
			 */
			videos: blank(
				z
					.array(
						z
							.object({
								src: blank(z.string().optional()),
								embed: blank(z.string().url().optional()),
								poster: blank(image().optional()),
								caption: blank(z.string().optional()),
							})
							.refine((v) => !!v.src !== !!v.embed, {
								message: 'Each video needs exactly one of `src` (a file) or `embed` (a link).',
							}),
					)
					.default([]),
			),
			location: blank(z.string().optional()),
			pin: blank(z.boolean().optional().default(false)),
			/** If true, omit from listings and search; the post URL still works. */
			hidden: blank(z.boolean().optional().default(false)),
			/** Cross-post to Instagram after the site deploys (see scripts/instagram-publish.mjs). */
			instagram: blank(
				z
					.object({
						publish: blank(z.boolean().default(false)),
						/** Defaults to title + description + tags as hashtags. */
						caption: blank(z.string().optional()),
						/** Instagram only accepts 4:5 to 1.91:1. `pad` adds borders, `crop` trims. */
						fit: blank(z.enum(['pad', 'crop']).default('pad')),
					})
					.optional(),
			),
		}),
});

export const collections = { projects, media };
