/**
 * Reading and writing post files. A post is `<collection>/<slug>/index.mdx`: YAML
 * frontmatter + Markdown/MDX body, with its images and clips in the same folder.
 * Field names match src/content.config.ts. Frontmatter keys the editor doesn't know
 * about are kept as-is on save.
 */
import yaml from 'js-yaml';
import { COLLECTIONS, type CollectionName, rawUrl } from './config';
import { mdxProblems } from './markdown';

/** A file belonging to a post: already in the repo (`url` only) or new (`file` set). */
export interface Asset {
	id: string;
	/** Path relative to the post folder, e.g. `house.jpg`. */
	name: string;
	/** Something an <img>/<video> can load: raw GitHub URL or a blob: URL. */
	url: string;
	/** Present when the file still needs uploading. */
	file?: Blob;
	alt?: string;
}

export type MediaKind = 'photo' | 'design' | 'video';
export type IgFit = 'pad' | 'crop';

export interface VideoItem {
	id: string;
	mode: 'file' | 'embed';
	file?: Asset;
	embed: string;
	poster?: Asset;
	caption: string;
}

interface Common {
	slug: string;
	isNew: boolean;
	title: string;
	description: string;
	pubDate: string;
	updatedDate: string;
	tags: string[];
	pin: boolean;
	hidden: boolean;
	body: string;
	/** Original frontmatter, so unknown keys survive a save. */
	extra: Record<string, unknown>;
	/** Files that were in the folder when the post was opened. */
	originalFiles: string[];
}

export interface MediaPost extends Common {
	collection: 'media';
	kind: MediaKind;
	location: string;
	images: Asset[];
	cover: Asset | null;
	videos: VideoItem[];
	instagram: { publish: boolean; caption: string; fit: IgFit };
	/** Images uploaded for use inside the body (`![](./file.jpg)`). */
	bodyAssets: Asset[];
}

export interface ProjectPost extends Common {
	collection: 'projects';
	thumbnail: Asset | null;
	wip: boolean;
	/** Images uploaded for use inside the body (`![](./file.jpg)`). */
	bodyAssets: Asset[];
}

export type Post = MediaPost | ProjectPost;

let idCounter = 0;
export const newId = () => `a${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export const today = () => new Date().toISOString().slice(0, 10);

export function slugify(s: string, max = 60): string {
	return s
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, max)
		.replace(/-+$/g, '');
}

/** `My Photo (1).JPG` → `my-photo-1.jpg`, unique among `taken`. */
export function safeFileName(original: string, taken: Iterable<string>, forceExt?: string): string {
	const dot = original.lastIndexOf('.');
	const ext = (forceExt ?? (dot > 0 ? original.slice(dot + 1) : 'bin')).toLowerCase().replace('jpeg', 'jpg');
	const base = slugify(dot > 0 ? original.slice(0, dot) : original, 50) || 'file';
	const used = new Set([...taken].map((t) => t.toLowerCase()));
	let name = `${base}.${ext}`;
	for (let n = 2; used.has(name); n++) name = `${base}-${n}.${ext}`;
	return name;
}

export const postDir = (collection: CollectionName, slug: string) => `${COLLECTIONS[collection].dir}/${slug}`;

/* ---------- parsing ---------- */

function splitDoc(text: string): { data: Record<string, unknown>; body: string } {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
	if (!m) return { data: {}, body: text };
	/* JSON schema keeps `2026-04-14` as a string instead of turning it into a Date. */
	const data = (yaml.load(m[1], { schema: yaml.JSON_SCHEMA }) ?? {}) as Record<string, unknown>;
	return { data, body: m[2].replace(/^\s*\n/, '') };
}

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const relName = (v: unknown) => str(v).replace(/^\.\//, '');

function assetFrom(collection: CollectionName, slug: string, value: unknown, alt?: unknown): Asset | null {
	const name = relName(value);
	if (!name) return null;
	return { id: newId(), name, url: rawUrl(`${postDir(collection, slug)}/${name}`), alt: str(alt) || undefined };
}

function common(data: Record<string, unknown>, body: string, slug: string, files: string[]) {
	return {
		slug,
		isNew: false,
		title: str(data.title),
		description: str(data.description),
		pubDate: str(data.pubDate),
		updatedDate: str(data.updatedDate),
		tags: Array.isArray(data.tags) ? data.tags.map(str) : [],
		pin: data.pin === true,
		hidden: data.hidden === true,
		body,
		extra: data,
		originalFiles: files,
	};
}

export function parseMedia(slug: string, text: string, files: string[]): MediaPost {
	const { data, body } = splitDoc(text);
	const images = (Array.isArray(data.images) ? data.images : [])
		.map((e) =>
			typeof e === 'object' && e !== null
				? assetFrom('media', slug, (e as { src?: unknown }).src, (e as { alt?: unknown }).alt)
				: assetFrom('media', slug, e),
		)
		.filter((a): a is Asset => !!a);
	const coverName = relName(data.cover);
	const cover = coverName ? (images.find((i) => i.name === coverName) ?? assetFrom('media', slug, coverName)) : null;
	const videos: VideoItem[] = (Array.isArray(data.videos) ? data.videos : []).map((v: Record<string, unknown>) => ({
		id: newId(),
		mode: v?.embed ? 'embed' : 'file',
		file: v?.src ? (assetFrom('media', slug, v.src) ?? undefined) : undefined,
		embed: str(v?.embed),
		poster: v?.poster ? (assetFrom('media', slug, v.poster) ?? undefined) : undefined,
		caption: str(v?.caption),
	}));
	const ig = (data.instagram ?? {}) as Record<string, unknown>;
	const kind = ['photo', 'design', 'video'].includes(str(data.kind)) ? (str(data.kind) as MediaKind) : 'photo';
	return {
		collection: 'media',
		...common(data, body, slug, files),
		kind,
		location: str(data.location),
		images,
		cover,
		videos,
		instagram: { publish: ig.publish === true, caption: str(ig.caption), fit: ig.fit === 'crop' ? 'crop' : 'pad' },
		bodyAssets: [],
	};
}

export function parseProject(slug: string, text: string, files: string[]): ProjectPost {
	const { data, body } = splitDoc(text);
	return {
		collection: 'projects',
		...common(data, body, slug, files),
		thumbnail: assetFrom('projects', slug, data.thumbnail),
		wip: data.wip === true,
		bodyAssets: [],
	};
}

export function emptyMedia(): MediaPost {
	return {
		collection: 'media',
		slug: '',
		isNew: true,
		title: '',
		description: '',
		pubDate: today(),
		updatedDate: '',
		tags: [],
		pin: false,
		hidden: false,
		body: '',
		extra: {},
		originalFiles: [],
		kind: 'photo',
		location: '',
		images: [],
		cover: null,
		videos: [],
		instagram: { publish: false, caption: '', fit: 'pad' },
		bodyAssets: [],
	};
}

export function emptyProject(): ProjectPost {
	return {
		collection: 'projects',
		slug: '',
		isNew: true,
		title: '',
		description: '',
		pubDate: today(),
		updatedDate: '',
		tags: [],
		pin: false,
		hidden: false,
		body: '',
		extra: {},
		originalFiles: [],
		thumbnail: null,
		wip: false,
		bodyAssets: [],
	};
}

/* ---------- serializing ---------- */

const KNOWN_KEYS = [
	'title',
	'kind',
	'description',
	'location',
	'pubDate',
	'updatedDate',
	'tags',
	'thumbnail',
	'cover',
	'images',
	'videos',
	'wip',
	'pin',
	'hidden',
	'instagram',
];

const rel = (a: Asset | null | undefined) => (a ? `./${a.name}` : undefined);

/** Frontmatter object for a post, empty fields left out, known keys in a stable order. */
function frontmatter(post: Post): Record<string, unknown> {
	const fields: Record<string, unknown> = {
		title: post.title.trim(),
		description: post.description.trim() || undefined,
		pubDate: post.pubDate || undefined,
		updatedDate: post.updatedDate || undefined,
		tags: post.tags.length ? post.tags : undefined,
		pin: post.pin || undefined,
		hidden: post.hidden || undefined,
	};
	if (post.collection === 'media') {
		Object.assign(fields, {
			kind: post.kind,
			location: post.location.trim() || undefined,
			cover: rel(post.cover),
			images: post.images.length
				? post.images.map((i) => (i.alt?.trim() ? { src: rel(i), alt: i.alt.trim() } : rel(i)))
				: undefined,
			videos: post.videos.length
				? post.videos.map((v) =>
						Object.fromEntries(
							Object.entries({
								src: v.mode === 'file' ? rel(v.file) : undefined,
								embed: v.mode === 'embed' ? v.embed.trim() : undefined,
								poster: v.mode === 'file' ? rel(v.poster) : undefined,
								caption: v.caption.trim() || undefined,
							}).filter(([, x]) => x !== undefined),
						),
					)
				: undefined,
			instagram:
				post.instagram.publish || post.instagram.caption.trim() || post.instagram.fit !== 'pad'
					? {
							publish: post.instagram.publish,
							...(post.instagram.caption.trim() ? { caption: post.instagram.caption.trim() } : {}),
							fit: post.instagram.fit,
						}
					: undefined,
		});
	} else {
		Object.assign(fields, { thumbnail: rel(post.thumbnail), wip: post.wip || undefined });
	}
	const out: Record<string, unknown> = {};
	for (const key of KNOWN_KEYS) if (fields[key] !== undefined) out[key] = fields[key];
	for (const [key, value] of Object.entries(post.extra)) {
		if (!KNOWN_KEYS.includes(key) && value !== undefined) out[key] = value;
	}
	return out;
}

export function serialize(post: Post): string {
	const fm = yaml.dump(frontmatter(post), { schema: yaml.JSON_SCHEMA, lineWidth: -1, quotingType: "'" });
	const body = post.body.replace(/\s+$/, '');
	return `---\n${fm}---\n${body ? `\n${body}\n` : ''}`;
}

/** Every asset the post currently references. */
export function referencedAssets(post: Post): Asset[] {
	if (post.collection === 'media') {
		return [
			...post.images,
			...(post.cover ? [post.cover] : []),
			...post.videos.flatMap((v) => [v.mode === 'file' ? v.file : undefined, v.mode === 'file' ? v.poster : undefined]),
			...post.bodyAssets,
		].filter((a): a is Asset => !!a);
	}
	return [...(post.thumbnail ? [post.thumbnail] : []), ...post.bodyAssets];
}

/** Problems that would make the site build fail, or the post confusing. */
export function validate(post: Post, existingSlugs: string[]): string[] {
	const errors: string[] = [];
	if (!post.title.trim()) errors.push('Add a title.');
	if (post.isNew) {
		if (!post.slug) errors.push('Add a URL slug.');
		else if (existingSlugs.includes(post.slug)) errors.push(`A post at “${post.slug}” already exists. Change the URL slug.`);
	}
	if (post.collection === 'media') {
		post.videos.forEach((v, i) => {
			if (v.mode === 'file' && !v.file) errors.push(`Video ${i + 1}: choose a file or switch to a link.`);
			if (v.mode === 'embed' && !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\//.test(v.embed.trim()))
				errors.push(`Video ${i + 1}: paste a YouTube or Vimeo link.`);
		});
		if (post.instagram.publish && !post.images.length && !post.cover)
			errors.push('Instagram needs at least one image.');
	}
	errors.push(...mdxProblems(post.body));
	return errors;
}
