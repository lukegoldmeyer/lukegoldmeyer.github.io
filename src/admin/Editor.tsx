/** The post editor: form on the left, live preview on the right, Publish commits it. */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COLLECTIONS, SITE_URL } from './config';
import {
	type Asset,
	type MediaKind,
	type MediaPost,
	type Post,
	type ProjectPost,
	newId,
	postDir,
	referencedAssets,
	safeFileName,
	serialize,
	slugify,
	validate,
} from './content';
import { Field, InstagramPanel, PhotoGrid, Section, Segmented, SingleImage, TagInput, Toggle, VideoList } from './fields';
import { MarkdownEditor } from './MarkdownEditor';
import type { CommitProgress, GitHub } from './github';
import { checkVideo, prepareImage } from './images';
import { Preview } from './Preview';

export interface EditorProps {
	gh: GitHub;
	initial: Post;
	existingSlugs: string[];
	tagSuggestions: string[];
	instagramPosted: boolean;
	onSaved: (post: Post, commitSha: string) => void;
	onDeleted: () => void;
	onDirtyChange?: (dirty: boolean) => void;
	toast: (msg: string, kind?: 'error' | 'ok') => void;
}

type Status =
	| { state: 'idle' }
	| { state: 'saving'; progress: CommitProgress }
	| { state: 'saved'; sha: string; deploy?: { status: string; conclusion: string | null; url: string } };

const fileAsset = (name: string, blob: Blob, alt?: string): Asset => ({
	id: newId(),
	name,
	url: URL.createObjectURL(blob),
	file: blob,
	alt,
});

function defaultIgCaption(p: MediaPost) {
	const hashtags = p.tags
		.map((t) => '#' + t.replace(/[^\p{L}\p{N}_]/gu, ''))
		.filter((t) => t.length > 1)
		.join(' ');
	return [p.title, p.description, hashtags].filter(Boolean).join('\n\n');
}

export function Editor(props: EditorProps) {
	const { gh, toast } = props;
	const [post, setPost] = useState<Post>(props.initial);
	const [slugTouched, setSlugTouched] = useState(!props.initial.isNew);
	const [savedText, setSavedText] = useState(props.initial.isNew ? '' : serialize(props.initial));
	/** Files the post referenced when last loaded/saved; removing one deletes it from the repo. */
	const [savedRefs, setSavedRefs] = useState(() => new Set(referencedAssets(props.initial).map((a) => a.name)));
	const [status, setStatus] = useState<Status>({ state: 'idle' });
	const [busy, setBusy] = useState(0);
	const [keepOriginals, setKeepOriginals] = useState(() => {
		try {
			return localStorage.getItem('admin:keepOriginals') === '1';
		} catch {
			return false;
		}
	});
	const [tab, setTab] = useState<'edit' | 'preview'>('edit');
	const errors = validate(post, props.existingSlugs);
	const meta = COLLECTIONS[post.collection];

	const text = serialize(post);
	const pendingFiles = referencedAssets(post).filter((a) => a.file).length;
	const dirty = text !== savedText || pendingFiles > 0;

	/* Warn before leaving with unpublished changes. */
	useEffect(() => props.onDirtyChange?.(dirty), [dirty]);
	useEffect(() => {
		const onUnload = (e: BeforeUnloadEvent) => {
			if (dirty) e.preventDefault();
		};
		window.addEventListener('beforeunload', onUnload);
		return () => window.removeEventListener('beforeunload', onUnload);
	}, [dirty]);

	/* After publishing, follow the GitHub Pages deploy until it's live. */
	const pollRef = useRef(0);
	useEffect(() => {
		if (status.state !== 'saved' || status.deploy?.status === 'completed') return;
		const id = ++pollRef.current;
		const t = setTimeout(async () => {
			const deploy = await gh.deployStatus(status.sha).catch(() => undefined);
			if (id === pollRef.current) setStatus({ ...status, deploy: deploy ?? status.deploy });
		}, 8000);
		return () => clearTimeout(t);
	}, [status]);

	const update = (patch: Partial<MediaPost> | Partial<ProjectPost>) => setPost((p) => ({ ...p, ...patch }) as Post);

	const setTitle = (title: string) =>
		setPost((p) => ({ ...p, title, ...(p.isNew && !slugTouched ? { slug: slugify(title) } : {}) }) as Post);

	/** Names already used in this post's folder (existing files + everything pending). */
	const takenNames = () => new Set([...post.originalFiles, ...referencedAssets(post).map((a) => a.name)]);

	async function addImages(files: File[]): Promise<Asset[]> {
		setBusy((b) => b + 1);
		const taken = takenNames();
		const out: Asset[] = [];
		for (const f of files) {
			try {
				const prepared = await prepareImage(f, keepOriginals);
				const name = safeFileName(f.name, taken, prepared.ext);
				taken.add(name);
				out.push(fileAsset(name, prepared.blob));
			} catch (err) {
				toast((err as Error).message, 'error');
			}
		}
		setBusy((b) => b - 1);
		return out;
	}

	async function addVideoFile(id: string, f: File) {
		try {
			checkVideo(f);
		} catch (err) {
			toast((err as Error).message, 'error');
			return;
		}
		const name = safeFileName(f.name, takenNames());
		setPost((p) =>
			p.collection === 'media'
				? { ...p, videos: p.videos.map((v) => (v.id === id ? { ...v, file: fileAsset(name, f) } : v)) }
				: p,
		);
	}

	async function publish() {
		if (errors.length) {
			toast(errors[0], 'error');
			return;
		}
		const dir = postDir(post.collection, post.slug);
		const refs = referencedAssets(post);
		const changes: Record<string, { content: Blob | string } | null> = { [`${dir}/index.mdx`]: { content: text } };
		for (const a of refs) if (a.file) changes[`${dir}/${a.name}`] = { content: a.file };
		/* Delete files this editor stopped using (never files it didn't know about, or ones the body still mentions). */
		const stillUsed = new Set(refs.map((a) => a.name));
		for (const name of savedRefs) {
			if (!stillUsed.has(name) && !post.body.includes(name) && post.originalFiles.includes(name)) {
				changes[`${dir}/${name}`] = null;
			}
		}
		const verb = post.isNew ? 'Add' : 'Update';
		try {
			const sha = await gh.commit(`${verb} ${meta.singular}: ${post.title.trim()}`, changes, (progress) =>
				setStatus({ state: 'saving', progress }),
			);
			const saved = {
				...post,
				isNew: false,
				originalFiles: [
					...post.originalFiles.filter((n) => changes[`${dir}/${n}`] !== null),
					...refs.filter((a) => a.file).map((a) => a.name),
				],
			} as Post;
			/* Keep showing local previews, but they no longer need uploading. */
			const strip = (a: Asset | null | undefined) => (a ? { ...a, file: undefined } : a);
			const clean =
				saved.collection === 'media'
					? {
							...saved,
							images: saved.images.map((a) => strip(a)!),
							cover: strip(saved.cover) ?? null,
							videos: saved.videos.map((v) => ({ ...v, file: strip(v.file) ?? undefined, poster: strip(v.poster) ?? undefined })),
							bodyAssets: saved.bodyAssets.map((a) => strip(a)!),
						}
					: { ...saved, thumbnail: strip(saved.thumbnail) ?? null, bodyAssets: saved.bodyAssets.map((a) => strip(a)!) };
			/* Same object identity for the cover so the ★ stays on the right photo. */
			if (clean.collection === 'media' && clean.cover) {
				clean.cover = clean.images.find((i) => i.name === clean.cover!.name) ?? clean.cover;
			}
			setPost(clean as Post);
			setSlugTouched(true);
			setSavedText(serialize(clean as Post));
			setSavedRefs(new Set(referencedAssets(clean as Post).map((a) => a.name)));
			setStatus({ state: 'saved', sha });
			props.onSaved(clean as Post, sha);
			toast(post.isNew ? 'Published. Live in about 2 minutes.' : 'Saved. Live in about 2 minutes.', 'ok');
		} catch (err) {
			setStatus({ state: 'idle' });
			toast(`Couldn’t publish: ${(err as Error).message}`, 'error');
		}
	}

	async function remove() {
		if (!confirm(`Delete “${post.title || post.slug}” and all of its files? This can’t be undone here (it stays in git history).`))
			return;
		const dir = postDir(post.collection, post.slug);
		const changes: Record<string, null> = { [`${dir}/index.mdx`]: null };
		for (const name of post.originalFiles) changes[`${dir}/${name}`] = null;
		try {
			setStatus({ state: 'saving', progress: { done: 0, total: 0, label: 'Deleting' } });
			await gh.commit(`Delete ${meta.singular}: ${post.title.trim() || post.slug}`, changes);
			toast('Deleted.', 'ok');
			props.onDeleted();
		} catch (err) {
			setStatus({ state: 'idle' });
			toast(`Couldn’t delete: ${(err as Error).message}`, 'error');
		}
	}

	const liveUrl = `${SITE_URL}${meta.urlBase}/${post.slug}/`;
	const saving = status.state === 'saving';
	const deployLabel =
		status.state === 'saved'
			? status.deploy?.status === 'completed'
				? status.deploy.conclusion === 'success'
					? 'Live ✓'
					: 'Deploy failed'
				: 'Deploying…'
			: null;

	const igCaption = useMemo(() => (post.collection === 'media' ? defaultIgCaption(post) : ''), [post]);

	return (
		<div class="adm-editor">
			<div class="adm-editor-bar">
				<a href="#/" class="adm-back">
					← {meta.label}
				</a>
				<div class="adm-editor-status">
					{saving ? (
						<span>
							{status.progress.label}
							{status.progress.total > 1 ? ` (${status.progress.done + 1}/${status.progress.total})` : ''}…
						</span>
					) : busy ? (
						<span>Processing photos…</span>
					) : dirty ? (
						<span class="adm-dot">Unpublished changes</span>
					) : deployLabel ? (
						status.state === 'saved' && status.deploy ? (
							<a href={status.deploy.url} target="_blank" rel="noreferrer">
								{deployLabel}
							</a>
						) : (
							<span>{deployLabel}</span>
						)
					) : post.isNew ? null : (
						<span>Up to date</span>
					)}
				</div>
				<div class="adm-row">
					<div class="adm-tabs" role="tablist">
						<button type="button" role="tab" aria-selected={tab === 'edit'} onClick={() => setTab('edit')}>
							Edit
						</button>
						<button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}>
							Preview
						</button>
					</div>
					{!post.isNew ? (
						<a class="adm-btn" href={liveUrl} target="_blank" rel="noreferrer">
							View live
						</a>
					) : null}
					<button type="button" class="adm-btn adm-btn--primary" disabled={saving || busy > 0 || (!dirty && !post.isNew)} onClick={publish}>
						{post.isNew ? 'Publish' : 'Save'}
					</button>
				</div>
			</div>

			<div class={`adm-editor-cols is-${tab}`}>
				<form class="adm-form" onSubmit={(e) => e.preventDefault()}>
					<Field label="Title" for="f-title">
						<input
							id="f-title"
							class="adm-input adm-input--title"
							value={post.title}
							placeholder={post.collection === 'media' ? 'Shots from the Oregon Coast' : 'Custom PC Build'}
							onInput={(e) => setTitle(e.currentTarget.value)}
						/>
					</Field>
					{post.isNew ? (
						<Field label="URL" for="f-slug" hint={`${meta.urlBase}/${post.slug || '…'}/ (can’t be changed after publishing)`}>
							<input
								id="f-slug"
								class="adm-input"
								value={post.slug}
								onInput={(e) => {
									setSlugTouched(true);
									update({ slug: slugify(e.currentTarget.value, 80) });
								}}
							/>
						</Field>
					) : null}

					{post.collection === 'media' ? (
						<Field label="Type">
							<Segmented<MediaKind>
								label="Type"
								value={post.kind}
								options={[
									{ value: 'photo', label: 'Photo' },
									{ value: 'design', label: 'Design' },
									{ value: 'video', label: 'Video' },
								]}
								onChange={(kind) => update({ kind })}
							/>
						</Field>
					) : null}

					<Field label="Description" for="f-desc" hint="One or two sentences. Shown on cards and under the title.">
						<textarea
							id="f-desc"
							class="adm-input adm-textarea"
							rows={2}
							value={post.description}
							onInput={(e) => update({ description: e.currentTarget.value })}
						/>
					</Field>

					<div class="adm-grid2">
						<Field label="Published" for="f-date">
							<input id="f-date" type="date" class="adm-input" value={post.pubDate} onInput={(e) => update({ pubDate: e.currentTarget.value })} />
						</Field>
						<Field label="Updated" for="f-updated" hint="Optional. Bumps the post up in “Recent”.">
							<input
								id="f-updated"
								type="date"
								class="adm-input"
								value={post.updatedDate}
								onInput={(e) => update({ updatedDate: e.currentTarget.value })}
							/>
						</Field>
					</div>

					{post.collection === 'media' ? (
						<Field label="Location" for="f-loc">
							<input
								id="f-loc"
								class="adm-input"
								value={post.location}
								placeholder="Yachats, OR"
								onInput={(e) => update({ location: e.currentTarget.value })}
							/>
						</Field>
					) : null}

					<Field
						label="Tags"
						for="f-tags"
						hint={post.collection === 'projects' ? 'Group projects into Topics on /projects.' : 'Also become hashtags on Instagram.'}
					>
						<TagInput id="f-tags" tags={post.tags} suggestions={props.tagSuggestions} onChange={(tags) => update({ tags })} />
					</Field>

					{post.collection === 'media' ? (
						<>
							<Section
								title="Photos"
								aside={
									<label class="adm-check" title="Off: photos over 4000px are downscaled before upload (the site never shows them bigger).">
										<input
											type="checkbox"
											checked={keepOriginals}
											onChange={(e) => {
												setKeepOriginals(e.currentTarget.checked);
												try {
													localStorage.setItem('admin:keepOriginals', e.currentTarget.checked ? '1' : '0');
												} catch {}
											}}
										/>
										Keep full-size originals
									</label>
								}
							>
								<PhotoGrid
									images={post.images}
									cover={post.cover}
									onChange={(images) => update({ images })}
									onCover={(cover) => update({ cover })}
									onAdd={async (files) => {
										const added = await addImages(files);
										setPost((p) => (p.collection === 'media' ? { ...p, images: [...p.images, ...added] } : p));
									}}
								/>
							</Section>

							<Section title="Videos">
								<VideoList
									videos={post.videos}
									onChange={(videos) => update({ videos })}
									onPickFile={addVideoFile}
									onPickPoster={async (id, f) => {
										const [poster] = await addImages([f]);
										if (poster)
											setPost((p) =>
												p.collection === 'media' ? { ...p, videos: p.videos.map((v) => (v.id === id ? { ...v, poster } : v)) } : p,
											);
									}}
								/>
							</Section>
						</>
					) : (
						<Section title="Thumbnail">
							<SingleImage
								label="Thumbnail"
								asset={post.thumbnail}
								onChange={(thumbnail) => update({ thumbnail })}
								onPick={async (f) => {
									const [thumbnail] = await addImages([f]);
									if (thumbnail) update({ thumbnail });
								}}
							/>
						</Section>
					)}

					<Section title={post.collection === 'media' ? 'Notes' : 'Write-up'}>
						<MarkdownEditor
							value={post.body}
							rows={post.collection === 'projects' ? 22 : 10}
							onChange={(body) => update({ body })}
							onAddImage={async (f) => {
								const [asset] = await addImages([f]);
								if (!asset) return undefined;
								setPost((p) => ({ ...p, bodyAssets: [...p.bodyAssets, asset] }) as Post);
								return asset.name;
							}}
						/>
					</Section>

					<Section title="Visibility">
						{post.collection === 'projects' ? (
							<Toggle checked={post.wip} onChange={(wip) => update({ wip })} label="Work in progress" hint="Shows a WIP badge on the home page." />
						) : null}
						<Toggle
							checked={post.pin}
							onChange={(pin) => update({ pin })}
							label={post.collection === 'media' ? 'Featured' : 'Pinned'}
							hint={post.collection === 'media' ? 'Shows under Featured on /media.' : 'Shows in the Pinned column on /projects.'}
						/>
						<Toggle
							checked={post.hidden}
							onChange={(hidden) => update({ hidden })}
							label="Hidden (draft)"
							hint="Left out of listings and search. The direct link still works."
						/>
					</Section>

					{post.collection === 'media' ? (
						<Section title="Instagram">
							<InstagramPanel
								post={post}
								defaultCaption={igCaption}
								alreadyPosted={props.instagramPosted}
								onChange={(instagram) => update({ instagram })}
							/>
						</Section>
					) : null}

					{errors.length && (post.title || !post.isNew) ? (
						<ul class="adm-errors">
							{errors.map((e) => (
								<li>{e}</li>
							))}
						</ul>
					) : null}

					{!post.isNew ? (
						<div class="adm-danger-zone">
							<button type="button" class="adm-btn adm-danger" onClick={remove} disabled={saving}>
								Delete this {meta.singular}
							</button>
						</div>
					) : null}
				</form>

				<div class="adm-preview" aria-label="Preview">
					<Preview post={post} />
				</div>
			</div>
		</div>
	);
}
