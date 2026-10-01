/**
 * Markdown → HTML for the editor's live preview. Mirrors the site's pipeline
 * (astro.config.mjs): GFM, footnotes, KaTeX math, `> [!NOTE]` callouts, and
 * `<Image src={x} />` from `import x from './file.jpg'`.
 */
import katex from 'katex';
import { Marked, type Tokens, type TokenizerAndRendererExtension } from 'marked';
import markedFootnote from 'marked-footnote';

const CALLOUT_LABELS: Record<string, string> = {
	note: 'Note',
	tip: 'Tip',
	important: 'Important',
	warning: 'Warning',
	caution: 'Caution',
};
const CALLOUT_MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*\n?/i;

const tex = (src: string, displayMode: boolean) =>
	katex.renderToString(src, { displayMode, throwOnError: false, output: 'html' });

const mathBlock: TokenizerAndRendererExtension = {
	name: 'mathBlock',
	level: 'block',
	start: (src) => src.match(/^\$\$/m)?.index,
	tokenizer(src) {
		const m = /^\$\$[ \t]*\n?([\s\S]+?)\n?[ \t]*\$\$[ \t]*(?:\n|$)/.exec(src);
		if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
	},
	renderer: (t) => tex(t.text, true),
};

const mathInline: TokenizerAndRendererExtension = {
	name: 'mathInline',
	level: 'inline',
	start: (src) => src.indexOf('$'),
	tokenizer(src) {
		const m = /^\$(?!\$)((?:\\.|[^\\$\n])+?)\$(?!\d)/.exec(src);
		if (m) return { type: 'mathInline', raw: m[0], text: m[1] };
	},
	renderer: (t) => tex(t.text, false),
};

/**
 * Prepare MDX for a Markdown renderer: drop import/export lines and JSX comments,
 * turn `<Image src={var} … />` into `<img>` using the file each import points at.
 */
function mdxToMarkdown(body: string, resolve: (href: string) => string): string {
	const imports = new Map<string, string>();
	for (const m of body.matchAll(/^import\s+(\w+)\s+from\s+['"](\.\/[^'"]+)['"];?\s*$/gm)) imports.set(m[1], m[2]);
	const cleaned = body
		.replace(/^(?:import|export)\s.+$/gm, '')
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
		.replace(/<Image\b([\s\S]*?)\/>/g, (whole, attrs: string) => {
			const src = attrs.match(/src=\{(\w+)\}/)?.[1];
			const file = src ? imports.get(src) : attrs.match(/src=["']([^"']+)["']/)?.[1];
			if (!file) return whole;
			const alt = attrs.match(/alt=["']([^"']*)["']/)?.[1] ?? '';
			return `<img src="${resolve(file)}" alt="${alt.replace(/"/g, '&quot;')}" />`;
		});
	/* Footnote definitions may continue on indented lines (remark allows any indent);
	 * un-indent them so the preview doesn't read them as code blocks. */
	let inFootnote = false;
	return cleaned
		.split('\n')
		.map((line, i, lines) => {
			if (/^\[\^[^\]]+\]:/.test(line)) {
				inFootnote = true;
				/* Keep consecutive definitions separate once their continuations are un-indented. */
				return i > 0 && lines[i - 1].trim() ? `\n${line}` : line;
			}
			if (!line.trim() || !/^\s/.test(line)) inFootnote = false;
			else if (inFootnote) return line.trimStart();
			return line;
		})
		.join('\n');
}

/** Render a post body. `resolve` maps relative paths like `./a.jpg` to loadable URLs. */
export function renderMarkdown(body: string, resolve: (href: string) => string): string {
	const marked = new Marked({ gfm: true });
	marked.use(markedFootnote());
	marked.use({ extensions: [mathBlock, mathInline] });
	marked.use({
		walkTokens(token) {
			if (token.type === 'image') token.href = resolve(token.href);
			if (token.type === 'html') {
				/* Relative srcs in raw HTML too (e.g. from <Image>). */
				token.text = token.text.replace(/\bsrc="(\.\/[^"]+)"/g, (_m: string, p: string) => `src="${resolve(p)}"`);
			}
			if (token.type === 'blockquote') {
				const para = token.tokens?.[0] as Tokens.Paragraph | undefined;
				const first = para?.type === 'paragraph' ? para.tokens[0] : undefined;
				const match = first?.type === 'text' ? first.text.match(CALLOUT_MARKER) : null;
				if (!match || !para || !first) return;
				(token as Tokens.Blockquote & { callout?: string }).callout = match[1].toLowerCase();
				const t = first as Tokens.Text;
				t.text = t.text.slice(match[0].length);
				t.raw = t.raw.replace(CALLOUT_MARKER, '');
				if ('tokens' in t && t.tokens) t.tokens = undefined;
				if (!t.text) para.tokens.shift();
				if (para.tokens[0]?.type === 'br') para.tokens.shift();
				if (!para.tokens.length) token.tokens?.shift();
			}
		},
		renderer: {
			blockquote(token) {
				const type = (token as Tokens.Blockquote & { callout?: string }).callout;
				if (!type) return false;
				return `<div class="callout callout--${type}"><p class="callout-title">${CALLOUT_LABELS[type]}</p>${this.parser.parse(token.tokens)}</div>`;
			},
		},
	});
	return marked.parse(mdxToMarkdown(body, resolve), { async: false }) as string;
}

/**
 * Text that will break the MDX build: `{` and `<` are code in MDX unless escaped
 * (`\{`, `\<`) or inside code, math, or a real tag. Returns human-readable problems.
 */
export function mdxProblems(body: string): string[] {
	const problems: string[] = [];
	let inFence = false;
	let inMath = false;
	body.split('\n').forEach((line, i) => {
		const t = line.trim();
		if (/^(```|~~~)/.test(t)) {
			inFence = !inFence;
			return;
		}
		if (t === '$$') {
			inMath = !inMath;
			return;
		}
		if (inFence || inMath || /^(import|export)\s/.test(t)) return;
		const scrubbed = line
			.replace(/`[^`]*`/g, '')
			.replace(/\$\$.*?\$\$|\$(?:\\.|[^\\$])+?\$/g, '')
			.replace(/\{\/\*.*?\*\/\}/g, '')
			.replace(/\\[{}<]/g, '')
			/* JSX attribute expressions like src={img} are fine. */
			.replace(/=\{[^}]*\}/g, '');
		if (/<https?:/i.test(scrubbed)) {
			problems.push(`Line ${i + 1}: <https://…> links don’t work in posts. Paste the bare URL or use the Link button.`);
		} else if (/[{}]/.test(scrubbed)) {
			problems.push(`Line ${i + 1}: “{” or “}” has a special meaning in posts. Type \\{ or \\} instead, or put it in \`code\`.`);
		} else if (/<(?![A-Za-z/!])/.test(scrubbed)) {
			problems.push(`Line ${i + 1}: a “<” not starting a tag breaks the post. Type \\< instead, or put it in \`code\`.`);
		}
	});
	return problems;
}
