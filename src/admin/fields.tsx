/** Form controls for the editor. */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Asset, IgFit, MediaPost, VideoItem } from './content';
import { newId } from './content';
import { IMAGE_ACCEPT, VIDEO_ACCEPT, imageSize } from './images';
import { embedUrl } from './Preview';

export function Field(props: { label: string; hint?: ComponentChildren; children: ComponentChildren; for?: string }) {
	return (
		<div class="adm-field">
			<label class="adm-label" for={props.for}>
				{props.label}
			</label>
			{props.children}
			{props.hint ? <p class="adm-hint">{props.hint}</p> : null}
		</div>
	);
}

export function Section(props: { title: string; aside?: ComponentChildren; children: ComponentChildren }) {
	return (
		<section class="adm-section">
			<header class="adm-section-head">
				<h2>{props.title}</h2>
				{props.aside}
			</header>
			{props.children}
		</section>
	);
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
	return (
		<label class="adm-toggle">
			<input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.currentTarget.checked)} />
			<span class="adm-toggle-track" aria-hidden="true" />
			<span class="adm-toggle-text">
				<span>{props.label}</span>
				{props.hint ? <small>{props.hint}</small> : null}
			</span>
		</label>
	);
}

export function Segmented<T extends string>(props: {
	value: T;
	options: { value: T; label: string }[];
	onChange: (v: T) => void;
	label: string;
}) {
	return (
		<div class="adm-seg" role="radiogroup" aria-label={props.label}>
			{props.options.map((o) => (
				<button
					type="button"
					role="radio"
					aria-checked={props.value === o.value}
					class={props.value === o.value ? 'is-on' : ''}
					onClick={() => props.onChange(o.value)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

export function TagInput(props: { tags: string[]; onChange: (t: string[]) => void; suggestions: string[]; id?: string }) {
	const [draft, setDraft] = useState('');
	const add = (raw: string) => {
		const t = raw.trim().replace(/,$/, '').trim();
		if (t && !props.tags.some((x) => x.toLowerCase() === t.toLowerCase())) props.onChange([...props.tags, t]);
		setDraft('');
	};
	const listId = `${props.id ?? 'tags'}-list`;
	return (
		<div class="adm-tags">
			{props.tags.map((t) => (
				<span class="tag adm-tag" key={t}>
					{t}
					<button type="button" aria-label={`Remove ${t}`} onClick={() => props.onChange(props.tags.filter((x) => x !== t))}>
						×
					</button>
				</span>
			))}
			<input
				id={props.id}
				class="adm-tags-input"
				value={draft}
				list={listId}
				placeholder={props.tags.length ? '' : 'Add a tag, press Enter'}
				onInput={(e) => {
					const v = e.currentTarget.value;
					if (v.endsWith(',')) add(v);
					else setDraft(v);
				}}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						add(draft);
					} else if (e.key === 'Backspace' && !draft && props.tags.length) {
						props.onChange(props.tags.slice(0, -1));
					}
				}}
				onBlur={() => draft && add(draft)}
			/>
			<datalist id={listId}>
				{props.suggestions
					.filter((s) => !props.tags.includes(s))
					.map((s) => (
						<option value={s} />
					))}
			</datalist>
		</div>
	);
}

/** Accept files dropped anywhere on `children`. */
function DropZone(props: {
	accept: string;
	multiple?: boolean;
	onFiles: (files: File[]) => void;
	children: ComponentChildren;
	class?: string;
}) {
	const [over, setOver] = useState(false);
	const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
	return (
		<div
			class={`adm-drop ${over ? 'is-over' : ''} ${props.class ?? ''}`}
			onDragOver={(e) => {
				if (!hasFiles(e)) return;
				e.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				if (!hasFiles(e)) return;
				e.preventDefault();
				setOver(false);
				const files = [...(e.dataTransfer?.files ?? [])];
				if (files.length) props.onFiles(props.multiple ? files : files.slice(0, 1));
			}}
		>
			{props.children}
		</div>
	);
}

function PickButton(props: { accept: string; multiple?: boolean; onFiles: (f: File[]) => void; children: ComponentChildren; class?: string }) {
	const ref = useRef<HTMLInputElement>(null);
	return (
		<>
			<button type="button" class={props.class ?? 'adm-btn'} onClick={() => ref.current?.click()}>
				{props.children}
			</button>
			<input
				ref={ref}
				type="file"
				hidden
				accept={props.accept}
				multiple={props.multiple}
				onChange={(e) => {
					const files = [...(e.currentTarget.files ?? [])];
					e.currentTarget.value = '';
					if (files.length) props.onFiles(files);
				}}
			/>
		</>
	);
}

function move<T>(list: T[], from: number, to: number): T[] {
	const next = [...list];
	const [item] = next.splice(from, 1);
	next.splice(to, 0, item);
	return next;
}

/** Photo grid: add many, drag (or ←/→) to reorder, star the cover, alt text inline. */
export function PhotoGrid(props: {
	images: Asset[];
	cover: Asset | null;
	onChange: (images: Asset[]) => void;
	onCover: (a: Asset | null) => void;
	onAdd: (files: File[]) => void;
}) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const { images, cover } = props;
	const coverId = cover?.id ?? null;
	return (
		<DropZone accept={IMAGE_ACCEPT} multiple onFiles={props.onAdd}>
			{images.length === 0 ? (
				<div class="adm-empty-drop">
					<p>Drop photos here</p>
					<PickButton accept={IMAGE_ACCEPT} multiple onFiles={props.onAdd} class="adm-btn adm-btn--primary">
						Choose photos
					</PickButton>
				</div>
			) : (
				<>
					<ol class="adm-photos">
						{images.map((img, i) => (
							<li
								key={img.id}
								class={`adm-photo ${dragIndex === i ? 'is-dragging' : ''}`}
								draggable
								onDragStart={(e) => {
									setDragIndex(i);
									e.dataTransfer?.setData('text/plain', String(i));
								}}
								onDragEnd={() => setDragIndex(null)}
								onDragOver={(e) => {
									if (dragIndex === null || dragIndex === i) return;
									e.preventDefault();
									props.onChange(move(images, dragIndex, i));
									setDragIndex(i);
								}}
							>
								<div class="adm-photo-media">
									<img src={img.url} alt="" loading="lazy" draggable={false} />
									<span class="adm-photo-num">{i + 1}</span>
									<button
										type="button"
										class={`adm-photo-star ${coverId === img.id ? 'is-on' : ''}`}
										title={coverId === img.id ? 'Cover image' : 'Make cover image'}
										aria-pressed={coverId === img.id}
										onClick={() => props.onCover(coverId === img.id ? null : img)}
									>
										★
									</button>
								</div>
								<input
									class="adm-photo-alt"
									placeholder="Alt text (describe the photo)"
									value={img.alt ?? ''}
									onInput={(e) =>
										props.onChange(images.map((x) => (x.id === img.id ? { ...x, alt: e.currentTarget.value } : x)))
									}
								/>
								<div class="adm-photo-actions">
									<button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => props.onChange(move(images, i, i - 1))}>
										←
									</button>
									<button
										type="button"
										aria-label="Move later"
										disabled={i === images.length - 1}
										onClick={() => props.onChange(move(images, i, i + 1))}
									>
										→
									</button>
									<button
										type="button"
										class="adm-danger-text"
										onClick={() => {
											props.onChange(images.filter((x) => x.id !== img.id));
											if (coverId === img.id) props.onCover(null);
										}}
									>
										Remove
									</button>
								</div>
							</li>
						))}
					</ol>
					<div class="adm-row">
						<PickButton accept={IMAGE_ACCEPT} multiple onFiles={props.onAdd}>
							+ Add photos
						</PickButton>
						<span class="adm-hint">Drag to reorder · ★ sets the cover (default: first photo)</span>
					</div>
				</>
			)}
		</DropZone>
	);
}

/** One optional image (project thumbnail, video poster). */
export function SingleImage(props: { asset: Asset | null | undefined; onChange: (a: Asset | null) => void; onPick: (f: File) => void; label: string }) {
	return (
		<DropZone accept={IMAGE_ACCEPT} onFiles={(f) => props.onPick(f[0])} class="adm-single">
			{props.asset ? (
				<div class="adm-single-filled">
					<img src={props.asset.url} alt="" />
					<div class="adm-row">
						<PickButton accept={IMAGE_ACCEPT} onFiles={(f) => props.onPick(f[0])}>
							Replace
						</PickButton>
						<button type="button" class="adm-btn adm-danger-text" onClick={() => props.onChange(null)}>
							Remove
						</button>
					</div>
				</div>
			) : (
				<div class="adm-empty-drop adm-empty-drop--small">
					<p>Drop an image</p>
					<PickButton accept={IMAGE_ACCEPT} onFiles={(f) => props.onPick(f[0])}>
						{`Choose ${props.label.toLowerCase()}`}
					</PickButton>
				</div>
			)}
		</DropZone>
	);
}

export function VideoList(props: {
	videos: VideoItem[];
	onChange: (v: VideoItem[]) => void;
	onPickFile: (id: string, f: File) => void;
	onPickPoster: (id: string, f: File) => void;
}) {
	const update = (id: string, patch: Partial<VideoItem>) =>
		props.onChange(props.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)));
	return (
		<div class="adm-videos">
			{props.videos.map((v, i) => (
				<div class="adm-video" key={v.id}>
					<div class="adm-row adm-row--between">
						<Segmented
							label={`Video ${i + 1} source`}
							value={v.mode}
							options={[
								{ value: 'file', label: 'Clip file' },
								{ value: 'embed', label: 'YouTube / Vimeo' },
							]}
							onChange={(mode) => update(v.id, { mode })}
						/>
						<div class="adm-row">
							<button type="button" class="adm-btn" disabled={i === 0} onClick={() => props.onChange(move(props.videos, i, i - 1))} aria-label="Move up">
								↑
							</button>
							<button type="button" class="adm-btn adm-danger-text" onClick={() => props.onChange(props.videos.filter((x) => x.id !== v.id))}>
								Remove
							</button>
						</div>
					</div>
					{v.mode === 'file' ? (
						<div class="adm-video-file">
							<DropZone accept={VIDEO_ACCEPT} onFiles={(f) => props.onPickFile(v.id, f[0])}>
								{v.file ? (
									<div class="adm-single-filled">
										<video src={v.file.url} poster={v.poster?.url} controls preload="metadata" />
										<PickButton accept={VIDEO_ACCEPT} onFiles={(f) => props.onPickFile(v.id, f[0])}>
											Replace clip
										</PickButton>
									</div>
								) : (
									<div class="adm-empty-drop adm-empty-drop--small">
										<p>Drop a clip (under 50 MB)</p>
										<PickButton accept={VIDEO_ACCEPT} onFiles={(f) => props.onPickFile(v.id, f[0])}>
											Choose clip
										</PickButton>
									</div>
								)}
							</DropZone>
							<Field label="Poster image" hint="Still frame shown before it plays. Also used as the cover if the post has no photos.">
								<SingleImage
									label="Poster"
									asset={v.poster}
									onChange={(a) => update(v.id, { poster: a ?? undefined })}
									onPick={(f) => props.onPickPoster(v.id, f)}
								/>
							</Field>
						</div>
					) : (
						<Field label="Link" hint={v.embed && !embedUrl(v.embed) ? 'That doesn’t look like a YouTube or Vimeo link.' : undefined}>
							<input
								class="adm-input"
								type="url"
								placeholder="https://youtu.be/…"
								value={v.embed}
								onInput={(e) => update(v.id, { embed: e.currentTarget.value })}
							/>
						</Field>
					)}
					<Field label="Caption">
						<input class="adm-input" value={v.caption} onInput={(e) => update(v.id, { caption: e.currentTarget.value })} />
					</Field>
				</div>
			))}
			<button
				type="button"
				class="adm-btn"
				onClick={() => props.onChange([...props.videos, { id: newId(), mode: 'file', embed: '', caption: '' }])}
			>
				+ Add video
			</button>
		</div>
	);
}

const IG_MIN = 4 / 5;
const IG_MAX = 1.91;

/** Instagram settings plus a preview of the first slide as Instagram will receive it. */
export function InstagramPanel(props: {
	post: MediaPost;
	defaultCaption: string;
	alreadyPosted: boolean;
	onChange: (ig: MediaPost['instagram']) => void;
}) {
	const { instagram } = props.post;
	const slides = props.post.images.length ? props.post.images.slice(0, 10) : props.post.cover ? [props.post.cover] : [];
	const first = slides[0];
	const [ratio, setRatio] = useState(1);
	useEffect(() => {
		if (!first) return;
		let live = true;
		imageSize(first.url)
			.then(({ width, height }) => live && setRatio(Math.min(IG_MAX, Math.max(IG_MIN, width / height))))
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [first?.url]);
	const set = (patch: Partial<MediaPost['instagram']>) => props.onChange({ ...instagram, ...patch });

	if (props.alreadyPosted) {
		return <p class="adm-hint">✓ Already posted to Instagram. Edits here won’t repost it.</p>;
	}
	return (
		<div class="adm-ig">
			<Toggle
				checked={instagram.publish}
				onChange={(publish) => set({ publish })}
				label="Also post to Instagram"
				hint="Posts once, a few minutes after the site deploys. First 10 photos."
			/>
			{instagram.publish ? (
				<div class="adm-ig-body">
					{first ? (
						<div class="adm-ig-preview">
							<div class="adm-ig-frame" style={{ aspectRatio: String(ratio) }}>
								<img src={first.url} alt="" style={{ objectFit: instagram.fit === 'crop' ? 'cover' : 'contain' }} />
							</div>
							<p class="adm-hint">
								{slides.length > 1 ? `Carousel · ${slides.length} slides, all this shape` : 'Single photo'}
							</p>
						</div>
					) : (
						<p class="adm-hint">Add a photo to post to Instagram.</p>
					)}
					<div class="adm-ig-fields">
						<Field label="Fit" hint="Instagram only allows 4:5 to 1.91:1.">
							<Segmented<IgFit>
								label="Instagram fit"
								value={instagram.fit}
								options={[
									{ value: 'pad', label: 'White borders' },
									{ value: 'crop', label: 'Crop' },
								]}
								onChange={(fit) => set({ fit })}
							/>
						</Field>
						<Field label="Caption" for="ig-caption" hint="Leave blank to use the text shown above.">
							<textarea
								id="ig-caption"
								class="adm-input adm-textarea"
								rows={5}
								placeholder={props.defaultCaption}
								value={instagram.caption}
								onInput={(e) => set({ caption: e.currentTarget.value })}
							/>
						</Field>
					</div>
				</div>
			) : null}
		</div>
	);
}
