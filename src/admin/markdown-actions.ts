/**
 * Every formatting action in the write-up toolbar and the "/" command menu.
 * Actions are pure: (text, selection) → (new text, new selection). The editor applies
 * the result through the browser's insertText so Ctrl+Z still works.
 *
 * Templates use ⟦ and ⟧ to mark what gets selected after inserting (the placeholder
 * you'll type over). If text was selected, it replaces the placeholder instead.
 */
import { parseJsxAttrs } from './markdown';
import { embedUrl } from './Preview';

export interface TextState {
	value: string;
	start: number;
	end: number;
}

export interface ActionContext {
	/** Upload an image into the post folder; resolves to its file name. */
	uploadImage?: () => Promise<string | undefined>;
	/** Pick several images and upload them; resolves to their file names. */
	uploadImages?: () => Promise<string[]>;
	ask: (question: string, initial?: string) => string | null;
}

export interface Action {
	id: string;
	label: string;
	group: 'text' | 'heading' | 'list' | 'block' | 'callout' | 'code' | 'insert';
	/** Short toolbar label (falls back to label). */
	short?: string;
	keys?: string;
	/** Extra words the command menu matches on. */
	keywords?: string;
	run: (s: TextState, ctx: ActionContext) => TextState | null | Promise<TextState | null>;
}

const SEL_START = '⟦';
const SEL_END = '⟧';

/** Replace [start, end) with `template`, selecting the ⟦…⟧ part (filled with the old selection if any). */
function replaceRange(s: TextState, from: number, to: number, template: string, useSelection = true): TextState {
	const selected = s.value.slice(s.start, s.end);
	let text = template;
	const a = text.indexOf(SEL_START);
	const b = text.indexOf(SEL_END);
	let selStart: number;
	let selEnd: number;
	if (a !== -1 && b !== -1) {
		const inner = useSelection && selected ? selected : text.slice(a + 1, b);
		text = text.slice(0, a) + inner + text.slice(b + 1);
		selStart = from + a;
		selEnd = selStart + inner.length;
	} else {
		selStart = selEnd = from + text.length;
	}
	return { value: s.value.slice(0, from) + text + s.value.slice(to), start: selStart, end: selEnd };
}

/** Wrap the selection in `before`/`after`, or unwrap it if it already is. */
export function toggleWrap(s: TextState, before: string, after: string, placeholder: string): TextState {
	const { value, start, end } = s;
	if (value.slice(start - before.length, start) === before && value.slice(end, end + after.length) === after && end > start) {
		return {
			value: value.slice(0, start - before.length) + value.slice(start, end) + value.slice(end + after.length),
			start: start - before.length,
			end: end - before.length,
		};
	}
	const sel = value.slice(start, end);
	if (sel.startsWith(before) && sel.endsWith(after) && sel.length >= before.length + after.length && sel) {
		const inner = sel.slice(before.length, sel.length - after.length);
		return { value: value.slice(0, start) + inner + value.slice(end), start, end: start + inner.length };
	}
	return replaceRange(s, start, end, `${before}${SEL_START}${placeholder}${SEL_END}${after}`);
}

export const insertInline = (s: TextState, template: string) => replaceRange(s, s.start, s.end, template);

/**
 * Insert a block on its own lines, with a blank line before and after.
 * With `wrap` (code blocks, callouts…) selected text becomes the block's content.
 * Otherwise, and whenever nothing is selected, the block goes after the current line
 * so it never splits a sentence or lands inside other syntax.
 */
export function insertBlock(s: TextState, template: string, wrap = false): TextState {
	if (!wrap || s.start === s.end) {
		const lineEnd = s.value.indexOf('\n', s.end);
		const at = lineEnd === -1 ? s.value.length : lineEnd;
		s = { ...s, start: at, end: at };
	}
	const { value, start, end } = s;
	const before = value.slice(0, start);
	const after = value.slice(end);
	const lead = before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
	const trail = after === '' ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
	return replaceRange(s, start, end, lead + template + trail);
}

function lineRange(value: string, start: number, end: number): [number, number] {
	const from = value.lastIndexOf('\n', start - 1) + 1;
	let to = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end);
	if (to === -1) to = value.length;
	return [from, to];
}

/** Apply `fn` to every line the selection touches; keeps the whole lines selected. */
function mapLines(s: TextState, fn: (lines: string[]) => string[]): TextState {
	const [from, to] = lineRange(s.value, s.start, s.end);
	const lines = s.value.slice(from, to).split('\n');
	const out = fn(lines).join('\n');
	const value = s.value.slice(0, from) + out + s.value.slice(to);
	if (lines.length === 1) {
		/* Single line: keep the caret where it was, shifted by what changed before it. */
		const delta = out.length - (to - from);
		return { value, start: Math.max(from, s.start + delta), end: Math.max(from, s.end + delta) };
	}
	return { value, start: from, end: from + out.length };
}

const LIST_MARKER = /^(\s*)(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/;

function setListType(s: TextState, kind: 'bullet' | 'number' | 'task'): TextState {
	return mapLines(s, (lines) => {
		const nonEmpty = lines.filter((l) => l.trim());
		const isKind = (l: string) =>
			kind === 'task' ? /^\s*[-*+]\s+\[[ xX]\]\s/.test(l) : kind === 'number' ? /^\s*\d+[.)]\s/.test(l) : /^\s*[-*+]\s(?!\[[ xX]\])/.test(l);
		const allAlready = nonEmpty.length > 0 && nonEmpty.every(isKind);
		let n = 0;
		return lines.map((line) => {
			if (!line.trim() && lines.length > 1) return line;
			const indent = line.match(/^\s*/)![0];
			const text = line.replace(LIST_MARKER, '').replace(/^\s+/, '');
			if (allAlready) return indent + text;
			n++;
			const marker = kind === 'bullet' ? '- ' : kind === 'number' ? `${n}. ` : '- [ ] ';
			return indent + marker + text;
		});
	});
}

function setHeading(s: TextState, level: number): TextState {
	return mapLines(s, (lines) =>
		lines.map((line) => {
			const current = line.match(/^(#{1,6})\s+/);
			const text = line.replace(/^#{1,6}\s+/, '');
			if (level === 0 || current?.[1].length === level) return text;
			return `${'#'.repeat(level)} ${text}`;
		}),
	);
}

function togglePrefix(s: TextState, prefix: string): TextState {
	return mapLines(s, (lines) => {
		const all = lines.filter((l) => l.trim()).every((l) => l.startsWith(prefix.trimEnd()));
		return lines.map((l) => (all ? l.replace(new RegExp(`^${prefix.trimEnd().replace(/[.*+?^${}()|[\]\\>]/g, '\\$&')} ?`), '') : `${prefix}${l}`));
	});
}

/** Width of a list item's marker ("- " = 2, "1. " = 3), used for nesting. */
function nestWidth(value: string, lineStart: number): number {
	const prev = value.slice(0, lineStart).split('\n').slice(0, -1).reverse();
	const here = value.slice(lineStart).split('\n')[0];
	const indent = here.match(/^\s*/)![0].length;
	for (const l of prev) {
		const m = l.match(/^(\s*)([-*+]|\d+[.)])\s+/);
		if (m && m[1].length === indent) return m[2].length + 1;
		if (!l.trim()) break;
	}
	/* No parent item above: use this line's own marker width. */
	const own = here.match(/^\s*([-*+]|\d+[.)])\s+/);
	return own ? own[1].length + 1 : 2;
}

export function indent(s: TextState): TextState {
	const [from] = lineRange(s.value, s.start, s.end);
	const width = nestWidth(s.value, from);
	return mapLines(s, (lines) => lines.map((l) => (l.trim() ? ' '.repeat(width) + l : l)));
}

export function outdent(s: TextState): TextState {
	return mapLines(s, (lines) =>
		lines.map((l) => {
			const m = l.match(/^(\s*)/)![0];
			if (!m) return l;
			if (m.startsWith('\t')) return l.slice(1);
			/* One nesting level: 3 spaces under "1. " items, 2 under "- " items. */
			return l.slice(Math.min(m.length, m.length % 3 === 0 ? 3 : 2));
		}),
	);
}

export const isListLine = (s: TextState) => {
	const [from, to] = lineRange(s.value, s.start, s.end);
	return LIST_MARKER.test(s.value.slice(from, to));
};

function escapeMarkdown(s: TextState): TextState {
	const sel = s.value.slice(s.start, s.end);
	if (!sel) return insertInline(s, '\\');
	const escaped = sel.replace(/([\\`*_{}[\]()#+\-!|<>~$])/g, '\\$1');
	return { value: s.value.slice(0, s.start) + escaped + s.value.slice(s.end), start: s.start, end: s.start + escaped.length };
}

function nextFootnote(value: string): string {
	const used = [...value.matchAll(/\[\^(\d+)\]/g)].map((m) => Number(m[1]));
	return String(used.length ? Math.max(...used) + 1 : 1);
}

function addFootnote(s: TextState): TextState {
	const n = nextFootnote(s.value);
	const ref = `[^${n}]`;
	const withRef = s.value.slice(0, s.end) + ref + s.value.slice(s.end);
	const body = withRef.replace(/\s+$/, '');
	const def = `[^${n}]: `;
	const placeholder = 'Footnote text.';
	const value = `${body}\n\n${def}${placeholder}\n`;
	const start = body.length + 2 + def.length;
	return { value, start, end: start + placeholder.length };
}

function camel(name: string): string {
	const base = name
		.replace(/\.[^.]+$/, '')
		.replace(/[^a-zA-Z0-9]+(.)/g, (_m, c: string) => c.toUpperCase())
		.replace(/[^a-zA-Z0-9]/g, '');
	return (/^\d/.test(base) ? `img${base}` : base || 'img') + 'Img';
}

/** Add import lines (e.g. `import x from './file'`) after any existing imports. */
function addImports(value: string, lines: string[]): { value: string; added: number } {
	const missing = lines.filter((l) => !value.includes(l));
	if (!missing.length) return { value, added: 0 };
	const existing = value.match(/^(?:(?:import|export)\s.*\n)+/);
	const at = existing ? existing[0].length : 0;
	const block = missing.join('\n') + '\n' + (existing ? '' : '\n');
	return { value: value.slice(0, at) + block + value.slice(at), added: block.length };
}

const CODE_LANGS: [string, string][] = [
	['', 'Plain text'],
	['bash', 'Bash / terminal'],
	['ts', 'TypeScript'],
	['js', 'JavaScript'],
	['tsx', 'TSX / JSX'],
	['python', 'Python'],
	['c', 'C'],
	['cpp', 'C++'],
	['cs', 'C#'],
	['java', 'Java'],
	['rust', 'Rust'],
	['go', 'Go'],
	['html', 'HTML'],
	['css', 'CSS'],
	['json', 'JSON'],
	['yaml', 'YAML'],
	['toml', 'TOML'],
	['sql', 'SQL'],
	['md', 'Markdown'],
	['astro', 'Astro'],
	['powershell', 'PowerShell'],
	['gcode', 'G-code'],
	['ini', 'INI / config'],
	['diff', 'Diff'],
];

const CALLOUTS: [string, string, string][] = [
	['note', 'Note', 'info'],
	['tip', 'Tip', 'hint idea'],
	['important', 'Important', 'key'],
	['warning', 'Warning', 'careful'],
	['caution', 'Caution', 'danger'],
];

export const ACTIONS: Action[] = [
	/* ---- text ---- */
	{ id: 'bold', group: 'text', label: 'Bold', short: 'B', keys: 'Ctrl+B', run: (s) => toggleWrap(s, '**', '**', 'bold text') },
	{ id: 'italic', group: 'text', label: 'Italic', short: 'I', keys: 'Ctrl+I', run: (s) => toggleWrap(s, '_', '_', 'italic text') },
	{ id: 'bolditalic', group: 'text', label: 'Bold italic', short: 'BI', run: (s) => toggleWrap(s, '**_', '_**', 'bold italic') },
	{ id: 'strike', group: 'text', label: 'Strikethrough', short: 'S', keys: 'Ctrl+Shift+X', run: (s) => toggleWrap(s, '~~', '~~', 'struck text') },
	{ id: 'underline', group: 'text', label: 'Underline', short: 'U', keys: 'Ctrl+U', run: (s) => toggleWrap(s, '<u>', '</u>', 'underlined') },
	{ id: 'highlight', group: 'text', label: 'Highlight', short: 'Mark', keys: 'Ctrl+Shift+H', keywords: 'mark marker', run: (s) => toggleWrap(s, '<mark>', '</mark>', 'highlighted') },
	{ id: 'code', group: 'text', label: 'Inline code', short: '`code`', keys: 'Ctrl+E', run: (s) => toggleWrap(s, '`', '`', 'code') },
	{ id: 'sup', group: 'text', label: 'Superscript', short: 'x²', keywords: 'power exponent', run: (s) => toggleWrap(s, '<sup>', '</sup>', '2') },
	{ id: 'sub', group: 'text', label: 'Subscript', short: 'x₂', keywords: 'chemical index', run: (s) => toggleWrap(s, '<sub>', '</sub>', '2') },
	{ id: 'kbd', group: 'text', label: 'Keyboard key', short: 'Key', keywords: 'kbd shortcut command', run: (s) => toggleWrap(s, '<kbd>', '</kbd>', 'Ctrl') },
	{
		id: 'link',
		group: 'text',
		label: 'Link',
		keys: 'Ctrl+K',
		keywords: 'url href',
		run: (s, ctx) => {
			const sel = s.value.slice(s.start, s.end).trim();
			if (/^https?:\/\/\S+$/.test(sel)) return insertInline(s, `[⟦link text⟧](${sel})`);
			const url = ctx.ask('Link to (a URL, or a page like /projects):', 'https://');
			if (url === null) return null;
			return replaceRange(s, s.start, s.end, `[⟦${sel || 'link text'}⟧](${url.trim()})`, false);
		},
	},
	{
		id: 'autolink',
		group: 'text',
		label: 'Bare URL (auto-link)',
		short: 'URL',
		keywords: 'autolink plain address',
		run: (s, ctx) => {
			const url = ctx.ask('URL to show as a clickable link:', 'https://');
			return url === null ? null : insertInline(s, url.trim());
		},
	},
	{ id: 'br', group: 'text', label: 'Line break', short: '↵', keywords: 'newline br break', run: (s) => insertInline(s, '<br />\n') },
	{ id: 'escape', group: 'text', label: 'Escape symbols', short: '\\', keywords: 'literal backslash', run: (s) => escapeMarkdown(s) },

	/* ---- headings ---- */
	...[2, 3, 4, 5, 6].map(
		(n): Action => ({
			id: `h${n}`,
			group: 'heading',
			label: `Heading ${n}`,
			short: `H${n}`,
			keys: n <= 4 ? `Ctrl+Alt+${n}` : undefined,
			keywords: n <= 3 ? 'title section toc' : 'title',
			run: (s) => setHeading(s, n),
		}),
	),
	{ id: 'h0', group: 'heading', label: 'Normal text', short: '¶', keywords: 'paragraph remove heading', run: (s) => setHeading(s, 0) },

	/* ---- lists ---- */
	{ id: 'ul', group: 'list', label: 'Bulleted list', short: '•', keys: 'Ctrl+Shift+8', keywords: 'unordered', run: (s) => setListType(s, 'bullet') },
	{ id: 'ol', group: 'list', label: 'Numbered list', short: '1.', keys: 'Ctrl+Shift+7', keywords: 'ordered steps', run: (s) => setListType(s, 'number') },
	{ id: 'task', group: 'list', label: 'Task list', short: '☐', keys: 'Ctrl+Shift+9', keywords: 'checkbox todo checklist', run: (s) => setListType(s, 'task') },
	{ id: 'indent', group: 'list', label: 'Indent (nest)', short: '⇥', keys: 'Tab', keywords: 'nested sub-item', run: (s) => indent(s) },
	{ id: 'outdent', group: 'list', label: 'Outdent', short: '⇤', keys: 'Shift+Tab', keywords: 'unnest', run: (s) => outdent(s) },

	/* ---- blocks ---- */
	{ id: 'quote', group: 'block', label: 'Quote', short: '❝', keywords: 'blockquote', run: (s) => togglePrefix(s, '> ') },
	...CALLOUTS.map(
		([type, label, kw]): Action => ({
			id: `callout-${type}`,
			group: 'callout',
			label: `${label} callout`,
			short: label,
			keywords: `callout admonition alert box ${kw}`,
			run: (s) => {
				const sel = s.value.slice(s.start, s.end);
				const body = sel ? sel.split('\n').map((l) => `> ${l}`).join('\n') : `> ⟦${label} text.⟧`;
				return insertBlock(s, `> [!${type.toUpperCase()}]\n${body}`, true);
			},
		}),
	),
	{ id: 'hr', group: 'block', label: 'Divider', short: '—', keywords: 'horizontal rule line separator hr', run: (s) => insertBlock(s, '---') },
	{
		id: 'table',
		group: 'block',
		label: 'Table',
		short: '▦',
		keywords: 'grid columns rows',
		run: (s) =>
			insertBlock(
				{ ...s, end: s.start },
				'| ⟦Column 1⟧ | Column 2 | Column 3 |\n| :------- | :------: | -------: |\n| Left     | Center   | Right    |\n| Left     | Center   | Right    |',
			),
	},
	{
		id: 'details',
		group: 'block',
		label: 'Collapsible section',
		short: '▸',
		keywords: 'details summary spoiler expand toggle',
		run: (s) => insertBlock(s, '<details>\n<summary>Click to expand</summary>\n\n⟦Hidden content.⟧\n\n</details>', true),
	},

	/* ---- code & math ---- */
	...CODE_LANGS.map(
		([lang, label]): Action => ({
			id: `codeblock-${lang || 'plain'}`,
			group: 'code',
			label: lang ? `Code block: ${label}` : 'Code block (plain)',
			short: label,
			keywords: `code block fence snippet ${lang} ${label}`,
			run: (s) => insertBlock(s, `\`\`\`${lang}\n⟦${lang === 'bash' ? 'npm run dev' : 'code'}⟧\n\`\`\``, true),
		}),
	),
	{ id: 'terminal', group: 'insert', label: 'Terminal command', short: '>_', keywords: 'shell bash command line console', run: (s) => insertBlock(s, '```bash\n⟦npm run dev⟧\n```', true) },
	{ id: 'math', group: 'insert', label: 'Equation (inline)', short: '∑', keys: 'Ctrl+M', keywords: 'math latex katex formula', run: (s) => toggleWrap(s, '$', '$', 'E = mc^2') },
	{
		id: 'mathblock',
		group: 'insert',
		label: 'Equation (block)',
		short: '∑∑',
		keywords: 'math latex katex formula display',
		run: (s) => insertBlock(s, '$$\n⟦\\int_0^1 x^2 \\, dx = \\frac{1}{3}⟧\n$$', true),
	},
	{ id: 'footnote', group: 'insert', label: 'Footnote', short: '¹', keywords: 'reference citation note', run: (s) => addFootnote(s) },

	/* ---- media & misc ---- */
	{
		id: 'image',
		group: 'insert',
		label: 'Image (caption, size, position)',
		short: 'Img',
		keywords: 'picture photo upload figure caption optimized',
		run: async (s, ctx) => {
			if (ctx.uploadImage) {
				const name = await ctx.uploadImage();
				if (!name) return null;
				const varName = camel(name);
				const placed = insertBlock(s, `<Figure src={${varName}} alt="⟦Describe the image⟧" caption="" />`);
				const { value, added } = addImports(placed.value, [`import ${varName} from './${name}'`]);
				return { value, start: placed.start + added, end: placed.end + added };
			}
			const url = ctx.ask('Image URL:', 'https://');
			return url === null ? null : insertBlock(s, `<Figure src="${url.trim()}" alt="⟦Describe the image⟧" caption="" />`);
		},
	},
	{
		id: 'image-row',
		group: 'insert',
		label: 'Images side by side',
		short: 'Img ▯▯',
		keywords: 'row gallery pair two three columns grid photos upload',
		run: async (s, ctx) => {
			if (!ctx.uploadImages) return null;
			const names = await ctx.uploadImages();
			if (!names.length) return null;
			const figs = names.map((n, i) => `  <Figure src={${camel(n)}} alt="${i === 0 ? '⟦Describe the image⟧' : 'Describe the image'}" caption="" />`);
			const placed = insertBlock(s, `<ImageRow>\n${figs.join('\n')}\n</ImageRow>`);
			const { value, added } = addImports(placed.value, names.map((n) => `import ${camel(n)} from './${n}'`));
			return { value, start: placed.start + added, end: placed.end + added };
		},
	},
	{
		id: 'image-markdown',
		group: 'insert',
		label: 'Plain Markdown image (not resized)',
		keywords: 'picture photo upload simple',
		run: async (s, ctx) => {
			if (ctx.uploadImage) {
				const name = await ctx.uploadImage();
				return name ? insertBlock(s, `![⟦Describe the image⟧](./${name})`) : null;
			}
			const url = ctx.ask('Image URL:', 'https://');
			return url === null ? null : insertBlock(s, `![⟦Describe the image⟧](${url.trim()})`);
		},
	},
	{
		id: 'youtube',
		group: 'insert',
		label: 'YouTube / Vimeo video',
		short: '▶',
		keywords: 'video embed iframe',
		run: (s, ctx) => {
			const link = ctx.ask('YouTube or Vimeo link:', 'https://');
			if (link === null) return null;
			const src = embedUrl(link);
			if (!src) {
				ctx.ask('That isn’t a YouTube or Vimeo link. (Press OK to close.)');
				return null;
			}
			return insertBlock(s, `<div class="media-embed">\n  <iframe src="${src}" title="Video" loading="lazy" allowfullscreen></iframe>\n</div>`);
		},
	},
	{ id: 'comment', group: 'insert', label: 'Hidden comment', short: '/* */', keywords: 'note to self private todo', run: (s) => insertInline(s, '{/* ⟦note to self⟧ */}') },
];

/* ---- image settings (the bar that appears with the cursor in an image tag) ---- */

export type FigSize = 'small' | 'medium' | 'large' | 'full';
export type FigAlign = 'center' | 'left' | 'right';

export interface ImageTag {
	kind: 'Figure' | 'Image';
	/** [from, to) of the whole `<Figure … />` in the text. */
	from: number;
	to: number;
	attrs: Record<string, string>;
	/** Inside an <ImageRow>, where size and position don't apply. */
	inRow: boolean;
}

/** The `<Figure … />` or `<Image … />` tag the cursor is in, if any. */
export function imageTagAt(value: string, pos: number): ImageTag | null {
	const m = /<(Figure|Image)\b/g;
	let found: ImageTag | null = null;
	for (const hit of value.matchAll(m)) {
		const from = hit.index!;
		if (from > pos) break;
		const close = value.indexOf('/>', from);
		if (close === -1) break;
		const to = close + 2;
		if (pos <= to) {
			const before = value.slice(0, from);
			found = {
				kind: hit[1] as ImageTag['kind'],
				from,
				to,
				attrs: parseJsxAttrs(value.slice(from + hit[0].length, close)),
				inRow: before.lastIndexOf('<ImageRow') > before.lastIndexOf('</ImageRow>'),
			};
		}
	}
	return found;
}

const quoteAttr = (v: string) => (v.includes('"') ? (v.includes("'") ? `"${v.replace(/"/g, '”')}"` : `'${v}'`) : `"${v}"`);

/** Set (or with `null`, remove) a string attribute on the tag at [from, to). Returns the new text. */
export function setTagAttr(value: string, tag: ImageTag, name: string, v: string | null): string {
	let text = value.slice(tag.from, tag.to);
	const re = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*'|\\{[^}]*\\})`);
	if (v === null) text = text.replace(re, '');
	else if (re.test(text)) text = text.replace(re, ` ${name}=${quoteAttr(v)}`);
	else text = text.replace(/\s*\/>$/, ` ${name}=${quoteAttr(v)} />`);
	return value.slice(0, tag.from) + text + value.slice(tag.to);
}

/** `<Image src={x} alt="…" width={400} />` → `<Figure …>` with the closest size. */
export function imageToFigure(value: string, tag: ImageTag): string {
	const w = Number(tag.attrs.width);
	const size: FigSize = !w || w > 760 ? 'full' : w > 550 ? 'large' : w > 370 ? 'medium' : 'small';
	const src = /^\w+$/.test(tag.attrs.src ?? '') && value.slice(tag.from, tag.to).includes('src={') ? `{${tag.attrs.src}}` : quoteAttr(tag.attrs.src ?? '');
	const parts = [`src=${src}`, `alt=${quoteAttr(tag.attrs.alt ?? '')}`, 'caption=""'];
	if (size !== 'full') parts.push(`size="${size}"`);
	return value.slice(0, tag.from) + `<Figure ${parts.join(' ')} />` + value.slice(tag.to);
}

export const actionById = (id: string) => ACTIONS.find((a) => a.id === id)!;

/** Does a keyboard event match a shortcut like "Ctrl+Shift+X"? (Cmd counts as Ctrl on Mac.) */
export function matchesKeys(e: KeyboardEvent, keys: string): boolean {
	const parts = keys.split('+');
	const key = parts.pop()!.toLowerCase();
	const want = { ctrl: parts.includes('Ctrl'), shift: parts.includes('Shift'), alt: parts.includes('Alt') };
	const code = e.code.replace(/^(Key|Digit)/, '').toLowerCase();
	return (
		(e.ctrlKey || e.metaKey) === want.ctrl &&
		e.shiftKey === want.shift &&
		e.altKey === want.alt &&
		(code === key || e.key.toLowerCase() === key)
	);
}
