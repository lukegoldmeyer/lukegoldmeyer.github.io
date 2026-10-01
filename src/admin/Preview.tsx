/**
 * Live preview. Mirrors the markup of src/pages/media/[...slug].astro and
 * src/pages/projects/[...slug].astro so the site's own CSS styles it exactly.
 * Keep the two in sync when changing either post page.
 */
import { Marked } from 'marked';
import { useMemo } from 'preact/hooks';
import { rawUrl } from './config';
import { type Asset, type MediaPost, type Post, type ProjectPost, postDir } from './content';

const KIND_LABELS = { photo: 'Photo', design: 'Design', video: 'Video' };

function formatDate(d: string, month: 'long' | 'short' = 'long') {
	if (!d) return '';
	const date = new Date(`${d}T00:00:00Z`);
	return isNaN(+date) ? d : date.toLocaleDateString('en-GB', { year: 'numeric', month, day: 'numeric', timeZone: 'UTC' });
}

/** Markdown → HTML, with `./file.jpg` links pointed at the post's files. MDX-only syntax is skipped. */
function renderBody(post: Post): string {
	const local = new Map<string, string>();
	const assets =
		post.collection === 'media' ? [...post.images, ...(post.cover ? [post.cover] : [])] : [...post.bodyAssets, ...(post.thumbnail ? [post.thumbnail] : [])];
	for (const a of assets) local.set(a.name, a.url);
	const resolve = (href: string) => {
		if (/^(https?:|data:|blob:|\/)/.test(href)) return href;
		const name = href.replace(/^\.\//, '');
		return local.get(name) ?? (post.slug ? rawUrl(`${postDir(post.collection, post.slug)}/${name}`) : href);
	};
	const marked = new Marked({
		gfm: true,
		walkTokens(token) {
			if (token.type === 'image') token.href = resolve(token.href);
		},
	});
	const source = post.body
		.replace(/^(?:import|export)\s.+$/gm, '')
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
	return marked.parse(source, { async: false }) as string;
}

function Img({ asset, alt }: { asset: Asset; alt: string }) {
	return <img src={asset.url} alt={alt} loading="lazy" />;
}

function MediaPreview({ post }: { post: MediaPost }) {
	const gallery = post.images;
	const single =
		gallery.length === 1 ? gallery[0] : gallery.length === 0 && post.videos.length === 0 ? post.cover : null;
	const html = useMemo(() => renderBody(post), [post.body, post.images, post.cover, post.slug]);
	return (
		<article class="photo-article">
			<header class="photo-article-head">
				<div class="article-heading article-heading--centered">
					<p class="article-meta">
						<span>{KIND_LABELS[post.kind]}</span>
						{post.pubDate ? <span class="meta-dot">·</span> : null}
						{post.pubDate ? <span>{formatDate(post.pubDate)}</span> : null}
						{post.location ? <span class="meta-dot">·</span> : null}
						{post.location ? <span>{post.location}</span> : null}
					</p>
					<h1>{post.title || 'Untitled'}</h1>
				</div>
				{post.description ? <p class="lead">{post.description}</p> : null}
			</header>
			<div class={`media-body${post.kind === 'video' ? ' media-body--videos-first' : ''}`}>
				{post.videos.length > 0 ? (
					<div class="media-videos">
						{post.videos.map((v) => (
							<figure class="media-video" key={v.id}>
								{v.mode === 'file' ? (
									v.file ? (
										<video src={v.file.url} poster={v.poster?.url} controls playsInline preload="metadata" />
									) : (
										<div class="media-embed admin-placeholder">Choose a video file</div>
									)
								) : embedUrl(v.embed) ? (
									<div class="media-embed">
										<iframe src={embedUrl(v.embed)} title={v.caption || post.title} loading="lazy" allowFullScreen />
									</div>
								) : (
									<div class="media-embed admin-placeholder">Paste a YouTube or Vimeo link</div>
								)}
								{v.caption ? <figcaption>{v.caption}</figcaption> : null}
							</figure>
						))}
					</div>
				) : null}
				<div class="media-images">
					{single ? (
						<figure class="photo-single">
							<Img asset={single} alt={single.alt ?? post.title} />
						</figure>
					) : null}
					{gallery.length >= 2 ? (
						<div class="photo-masonry" role="list">
							{gallery.map((g, i) => (
								<figure class="photo-masonry-item" role="listitem" key={g.id}>
									<Img asset={g} alt={g.alt ?? `${post.title} — ${i + 1}`} />
								</figure>
							))}
						</div>
					) : null}
				</div>
			</div>
			{html.trim() ? <div class="prose photo-prose" dangerouslySetInnerHTML={{ __html: html }} /> : null}
		</article>
	);
}

function ProjectPreview({ post }: { post: ProjectPost }) {
	const html = useMemo(() => renderBody(post), [post.body, post.bodyAssets, post.thumbnail, post.slug]);
	return (
		<article class="article-wrap">
			<div class="article-main">
				{post.thumbnail ? (
					<div class="article-hero-thumb">
						<Img asset={post.thumbnail} alt={`${post.title} — cover`} />
					</div>
				) : null}
				<div class="article-heading">
					<p class="article-meta">{post.pubDate ? formatDate(post.pubDate) : 'Project'}</p>
					<h1>{post.title || 'Untitled'}</h1>
				</div>
				{post.description ? <p class="lead">{post.description}</p> : null}
				<div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
			</div>
		</article>
	);
}

/** Same rules as toEmbedUrl in src/utils/media-assets.ts. */
export function embedUrl(link: string): string | undefined {
	let u: URL;
	try {
		u = new URL(link.trim());
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
	if (host === 'player.vimeo.com') return u.href;
	return undefined;
}

export function Preview({ post }: { post: Post }) {
	return (
		<div class="admin-preview-page">
			{post.collection === 'media' ? <MediaPreview post={post} /> : <ProjectPreview post={post} />}
			{post.hidden ? <p class="admin-preview-note">Hidden: left out of listings and search.</p> : null}
		</div>
	);
}

export { formatDate, KIND_LABELS };
