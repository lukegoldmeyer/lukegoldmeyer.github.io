/**
 * The write-up box: a Markdown textarea with a full formatting toolbar, a "/" command
 * menu, keyboard shortcuts, and list-aware Enter/Tab. Actions live in markdown-actions.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { IMAGE_ACCEPT } from './images';
import {
	ACTIONS,
	type Action,
	type ActionContext,
	type FigAlign,
	type FigSize,
	type ImageTag,
	type TextState,
	actionById,
	imageTagAt,
	imageToFigure,
	indent,
	isListLine,
	matchesKeys,
	outdent,
	setTagAttr,
} from './markdown-actions';

interface Props {
	value: string;
	onChange: (v: string) => void;
	/** Saves an image into the post folder; resolves to its file name. */
	onAddImage?: (f: File) => Promise<string | undefined>;
	rows?: number;
}

type MenuId = 'heading' | 'callout' | 'code' | null;

/** Toolbar layout: action ids, `|` = separator, `menu:x` = dropdown. */
const TOOLBAR = [
	'menu:heading',
	'|',
	'bold',
	'italic',
	'bolditalic',
	'strike',
	'underline',
	'highlight',
	'code',
	'sup',
	'sub',
	'kbd',
	'|',
	'link',
	'autolink',
	'br',
	'escape',
	'|',
	'ul',
	'ol',
	'task',
	'indent',
	'outdent',
	'|',
	'quote',
	'menu:callout',
	'hr',
	'table',
	'details',
	'|',
	'menu:code',
	'terminal',
	'math',
	'mathblock',
	'footnote',
	'|',
	'image',
	'image-row',
	'youtube',
	'comment',
];

const MENUS: Record<Exclude<MenuId, null>, { label: string; group: Action['group'] }> = {
	heading: { label: 'Heading', group: 'heading' },
	callout: { label: 'Callout', group: 'callout' },
	code: { label: 'Code block', group: 'code' },
};

const GROUP_LABELS: Record<Action['group'], string> = {
	text: 'Text',
	heading: 'Heading',
	list: 'List',
	block: 'Block',
	callout: 'Callout',
	code: 'Code',
	insert: 'Insert',
};

const LIST_ITEM = /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|(\d+)([.)])\s+)(.*)$/;

export function MarkdownEditor(props: Props) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const pickRef = useRef<((f: File[]) => void) | null>(null);
	const [pickMany, setPickMany] = useState(false);
	/** Start of the image tag the cursor is in (the settings bar edits it). */
	const [imgAt, setImgAt] = useState<number | null>(null);
	const [menu, setMenu] = useState<MenuId>(null);
	const [palette, setPalette] = useState(false);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(0);
	const savedSel = useRef<[number, number]>([0, 0]);
	const paletteInput = useRef<HTMLInputElement>(null);

	/* Put the cursor in the command menu's search box as soon as it opens. */
	useEffect(() => {
		if (palette) paletteInput.current?.focus();
	}, [palette]);

	/* Closing the file picker without choosing fires `cancel` (no `change`). */
	useEffect(() => {
		const input = fileRef.current;
		const onCancel = () => pickRef.current?.([]);
		input?.addEventListener('cancel', onCancel);
		return () => input?.removeEventListener('cancel', onCancel);
	}, []);

	/* Close dropdowns on outside click. */
	useEffect(() => {
		if (!menu) return;
		const close = (e: MouseEvent) => {
			if (!(e.target as Element).closest?.('.adm-md-menu')) setMenu(null);
		};
		document.addEventListener('mousedown', close);
		return () => document.removeEventListener('mousedown', close);
	}, [menu]);

	const available = useMemo(
		() => ACTIONS.filter((a) => a.id !== 'image-row' || props.onAddImage),
		[props.onAddImage],
	);

	const ctx: ActionContext = {
		ask: (q, initial) => window.prompt(q, initial ?? ''),
		uploadImage: props.onAddImage ? async () => (await pickAndUpload(false))[0] : undefined,
		uploadImages: props.onAddImage ? () => pickAndUpload(true) : undefined,
	};

	/** Open the file picker and upload what's chosen, in order. */
	function pickAndUpload(many: boolean): Promise<string[]> {
		setPickMany(many);
		return new Promise((resolve) => {
			pickRef.current = async (files) => {
				pickRef.current = null;
				const names: string[] = [];
				for (const f of files) {
					const name = await props.onAddImage!(f);
					if (name) names.push(name);
				}
				resolve(names);
			};
			/* Let `multiple` update before the picker opens. */
			requestAnimationFrame(() => fileRef.current!.click());
		});
	}

	/** Track which image tag (if any) the cursor is in. */
	function trackCursor() {
		const ta = ref.current;
		if (!ta) return;
		setImgAt(imageTagAt(ta.value, ta.selectionStart)?.from ?? null);
	}

	const imgTag: ImageTag | null = imgAt === null ? null : imageTagAt(props.value, imgAt);
	/** Edits from the settings bar; skip the textarea so its inputs keep focus. */
	const editTag = (fn: (value: string, tag: ImageTag) => string) => {
		if (imgTag) props.onChange(fn(props.value, imgTag));
	};

	const state = (): TextState => {
		const ta = ref.current!;
		return { value: ta.value, start: ta.selectionStart, end: ta.selectionEnd };
	};

	/** Apply a new text state through insertText so the browser's undo history keeps it. */
	function apply(next: TextState) {
		const ta = ref.current!;
		const old = ta.value;
		let p = 0;
		while (p < old.length && p < next.value.length && old[p] === next.value[p]) p++;
		let q = 0;
		while (q < old.length - p && q < next.value.length - p && old[old.length - 1 - q] === next.value[next.value.length - 1 - q]) q++;
		ta.focus();
		ta.setSelectionRange(p, old.length - q);
		const middle = next.value.slice(p, next.value.length - q);
		const ok = middle ? document.execCommand('insertText', false, middle) : document.execCommand('delete');
		if (!ok || ta.value !== next.value) props.onChange(next.value);
		ta.setSelectionRange(next.start, next.end);
		requestAnimationFrame(() => {
			ta.setSelectionRange(next.start, next.end);
			trackCursor();
		});
	}

	async function run(action: Action, from?: TextState) {
		setMenu(null);
		const result = await action.run(from ?? state(), ctx);
		if (result) apply(result);
		else ref.current?.focus();
	}

	function openPalette() {
		const ta = ref.current!;
		savedSel.current = [ta.selectionStart, ta.selectionEnd];
		setQuery('');
		setActive(0);
		setPalette(true);
	}

	function closePalette() {
		setPalette(false);
		const ta = ref.current!;
		ta.focus();
		ta.setSelectionRange(...savedSel.current);
	}

	const matches = useMemo(() => {
		const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		if (!words.length) return available;
		/* Every typed word must appear somewhere ("equation block" finds "Equation (block)"). */
		return available.filter((a) => {
			const hay = `${a.label} ${a.short ?? ''} ${a.keywords ?? ''} ${GROUP_LABELS[a.group]}`.toLowerCase();
			return words.every((w) => hay.includes(w));
		});
	}, [query, available]);

	function runFromPalette(a: Action) {
		setPalette(false);
		const ta = ref.current!;
		const [start, end] = savedSel.current;
		ta.focus();
		ta.setSelectionRange(start, end);
		run(a, { value: ta.value, start, end });
	}

	function onKeyDown(e: KeyboardEvent) {
		const ta = ref.current!;
		/* "/" on an empty line, or Ctrl+/ anywhere: open the command menu. */
		if ((e.ctrlKey || e.metaKey) && e.key === '/') {
			e.preventDefault();
			openPalette();
			return;
		}
		if (e.key === '/' && !e.ctrlKey && !e.metaKey && ta.selectionStart === ta.selectionEnd) {
			const lineStart = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
			if (ta.value.slice(lineStart, ta.selectionStart).trim() === '') {
				const lineEnd = ta.value.indexOf('\n', ta.selectionStart);
				if (ta.value.slice(ta.selectionStart, lineEnd === -1 ? undefined : lineEnd).trim() === '') {
					e.preventDefault();
					openPalette();
					return;
				}
			}
		}
		if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
			const s = state();
			if (isListLine(s) || s.value.slice(s.start, s.end).includes('\n')) {
				e.preventDefault();
				apply(e.shiftKey ? outdent(s) : indent(s));
				return;
			}
		}
		/* Enter in a list item continues the list; Enter on an empty item ends it. */
		if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && ta.selectionStart === ta.selectionEnd) {
			const s = state();
			const lineStart = s.value.lastIndexOf('\n', s.start - 1) + 1;
			const lineEndRaw = s.value.indexOf('\n', s.start);
			const lineEnd = lineEndRaw === -1 ? s.value.length : lineEndRaw;
			const m = s.value.slice(lineStart, lineEnd).match(LIST_ITEM);
			if (m && s.start === lineEnd) {
				e.preventDefault();
				const [, ind, marker, num, punct, text] = m;
				if (!text.trim()) {
					apply({ value: s.value.slice(0, lineStart) + s.value.slice(lineEnd), start: lineStart, end: lineStart });
					return;
				}
				const next = num ? `${Number(num) + 1}${punct} ` : marker.includes('[') ? '- [ ] ' : marker;
				const insert = `\n${ind}${next}`;
				apply({ value: s.value.slice(0, s.start) + insert + s.value.slice(s.end), start: s.start + insert.length, end: s.start + insert.length });
				return;
			}
		}
		for (const a of available) {
			if (a.keys && !a.keys.includes('Tab') && matchesKeys(e, a.keys)) {
				e.preventDefault();
				run(a);
				return;
			}
		}
	}

	const button = (a: Action) => (
		<button
			type="button"
			key={a.id}
			class={`adm-md-btn adm-md-btn--${a.id}`}
			title={a.keys ? `${a.label} (${a.keys})` : a.label}
			aria-label={a.label}
			onMouseDown={(e) => e.preventDefault() /* keep the textarea selection */}
			onClick={() => run(a)}
		>
			{a.short ?? a.label}
		</button>
	);

	return (
		<div class="adm-md">
			<div class="adm-md-bar" role="toolbar" aria-label="Formatting">
				{TOOLBAR.map((item, i) => {
					if (item === '|') return <span class="adm-md-sep" aria-hidden="true" key={`sep${i}`} />;
					if (item.startsWith('menu:')) {
						const id = item.slice(5) as Exclude<MenuId, null>;
						const m = MENUS[id];
						return (
							<div class="adm-md-menu" key={item}>
								<button
									type="button"
									class="adm-md-btn"
									aria-haspopup="menu"
									aria-expanded={menu === id}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => setMenu(menu === id ? null : id)}
								>
									{m.label} ▾
								</button>
								{menu === id ? (
									<div class="adm-md-pop" role="menu">
										{available
											.filter((a) => a.group === m.group)
											.map((a) => (
												<button
													type="button"
													role="menuitem"
													key={a.id}
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => run(a)}
												>
													<span>{id === 'code' ? a.short : a.label}</span>
													{a.keys ? <kbd>{a.keys}</kbd> : null}
												</button>
											))}
									</div>
								) : null}
							</div>
						);
					}
					const a = actionById(item);
					return a && available.includes(a) ? button(a) : null;
				})}
				<span class="adm-md-sep" aria-hidden="true" />
				<button
					type="button"
					class="adm-md-btn adm-md-btn--cmd"
					title="All formatting (type / on an empty line, or Ctrl+/)"
					onMouseDown={(e) => e.preventDefault()}
					onClick={openPalette}
				>
					/ Commands
				</button>
			</div>

			<div class="adm-md-wrap">
				<textarea
					ref={ref}
					class="adm-input adm-textarea adm-md-text"
					rows={props.rows ?? 12}
					value={props.value}
					onInput={(e) => props.onChange(e.currentTarget.value)}
					onKeyDown={onKeyDown}
					onSelect={trackCursor}
					onClick={trackCursor}
					onKeyUp={trackCursor}
					placeholder="Write in Markdown… (type / on an empty line for all formatting)"
					spellcheck
				/>
				{imgTag ? <ImageSettings tag={imgTag} edit={editTag} /> : null}
				{palette ? (
					<div class="adm-md-palette" role="dialog" aria-label="Formatting commands">
						<input
							class="adm-input"
							ref={paletteInput}
							placeholder="Search formatting… (e.g. table, python, equation)"
							value={query}
							onInput={(e) => {
								setQuery(e.currentTarget.value);
								setActive(0);
							}}
							onKeyDown={(e) => {
								if (e.key === 'Escape') {
									e.preventDefault();
									closePalette();
								} else if (e.key === 'ArrowDown') {
									e.preventDefault();
									setActive((i) => Math.min(i + 1, matches.length - 1));
								} else if (e.key === 'ArrowUp') {
									e.preventDefault();
									setActive((i) => Math.max(i - 1, 0));
								} else if (e.key === 'Enter') {
									e.preventDefault();
									if (matches[active]) runFromPalette(matches[active]);
								}
							}}
							onBlur={(e) => {
								if (!(e.relatedTarget as Element | null)?.closest?.('.adm-md-palette')) setPalette(false);
							}}
						/>
						<ul role="listbox">
							{matches.length === 0 ? <li class="adm-hint">Nothing matches.</li> : null}
							{matches.map((a, i) => (
								<li key={a.id}>
									<button
										type="button"
										role="option"
										aria-selected={i === active}
										class={i === active ? 'is-active' : ''}
										ref={(el) => {
											if (i === active) el?.scrollIntoView({ block: 'nearest' });
										}}
										onMouseDown={(e) => e.preventDefault()}
										onMouseEnter={() => setActive(i)}
										onClick={() => runFromPalette(a)}
									>
										<span class="adm-md-pal-group">{GROUP_LABELS[a.group]}</span>
										<span class="adm-md-pal-label">{a.label}</span>
										{a.keys ? <kbd>{a.keys}</kbd> : null}
									</button>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
			<p class="adm-hint adm-md-foot">
				Markdown. <kbd>/</kbd> on an empty line or <kbd>Ctrl</kbd>+<kbd>/</kbd> for every option · <kbd>Tab</kbd> nests list
				items · hover a button for its shortcut.
			</p>

			<input
				ref={fileRef}
				type="file"
				hidden
				accept={IMAGE_ACCEPT}
				multiple={pickMany}
				onChange={(e) => {
					const files = [...(e.currentTarget.files ?? [])];
					e.currentTarget.value = '';
					pickRef.current?.(files);
				}}
			/>
		</div>
	);
}

const SIZES: { value: FigSize; label: string }[] = [
	{ value: 'small', label: 'Small' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large', label: 'Large' },
	{ value: 'full', label: 'Full width' },
];

const ALIGNS: { value: FigAlign; label: string }[] = [
	{ value: 'left', label: 'Left' },
	{ value: 'center', label: 'Center' },
	{ value: 'right', label: 'Right' },
];

/** Caption, size and position for the image the cursor is in. */
function ImageSettings({ tag, edit }: { tag: ImageTag; edit: (fn: (value: string, tag: ImageTag) => string) => void }) {
	if (tag.kind === 'Image') {
		return (
			<div class="adm-md-img">
				<span class="adm-md-img-title">Image</span>
				<span class="adm-hint">Captions, sizes and positions need the newer image block.</span>
				<button type="button" class="adm-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => edit(imageToFigure)}>
					Convert
				</button>
			</div>
		);
	}
	const size = (SIZES.find((o) => o.value === tag.attrs.size)?.value ?? 'full') as FigSize;
	const align = (ALIGNS.find((o) => o.value === tag.attrs.align)?.value ?? 'center') as FigAlign;
	const seg = <T extends string>(label: string, options: { value: T; label: string }[], value: T, attr: string, dflt: T) => (
		<div class="adm-seg" role="radiogroup" aria-label={label}>
			{options.map((o) => (
				<button
					type="button"
					role="radio"
					key={o.value}
					aria-checked={value === o.value}
					class={value === o.value ? 'is-on' : ''}
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => edit((v, t) => setTagAttr(v, t, attr, o.value === dflt ? null : o.value))}
				>
					{o.label}
				</button>
			))}
		</div>
	);
	return (
		<div class="adm-md-img">
			<span class="adm-md-img-title">{tag.inRow ? 'Image in row' : 'Image'}</span>
			<label class="adm-md-img-field">
				<span>Caption</span>
				<input
					class="adm-input"
					value={tag.attrs.caption ?? ''}
					placeholder="Shown under the image"
					onInput={(e) => {
						const v = e.currentTarget.value;
						edit((val, t) => setTagAttr(val, t, 'caption', v));
					}}
				/>
			</label>
			<label class="adm-md-img-field">
				<span>Alt text</span>
				<input
					class="adm-input"
					value={tag.attrs.alt ?? ''}
					placeholder="Describe the image for screen readers"
					onInput={(e) => {
						const v = e.currentTarget.value;
						edit((val, t) => setTagAttr(val, t, 'alt', v));
					}}
				/>
			</label>
			{tag.inRow ? (
				<span class="adm-hint">Images in a row share its width automatically.</span>
			) : (
				<div class="adm-md-img-segs">
					{seg('Size', SIZES, size, 'size', 'full')}
					{seg('Position', ALIGNS, align, 'align', 'center')}
				</div>
			)}
			{!tag.inRow && align !== 'center' && size !== 'full' ? (
				<span class="adm-hint">Text wraps beside it on wide screens.</span>
			) : null}
		</div>
	);
}
