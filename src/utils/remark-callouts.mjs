/**
 * GitHub-style callouts in Markdown/MDX:
 *
 *   > [!NOTE]
 *   > Useful information.
 *
 * Types: NOTE, TIP, IMPORTANT, WARNING, CAUTION. Renders
 * `<div class="callout callout--note"><p class="callout-title">Note</p>…</div>`.
 * The /admin preview mirrors this in src/admin/markdown.ts.
 */
const LABELS = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };
const MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*\r?\n?/i;

function walk(node, fn) {
	fn(node);
	for (const child of node.children ?? []) walk(child, fn);
}

export default function remarkCallouts() {
	return (tree) => {
		walk(tree, (node) => {
			if (node.type !== 'blockquote') return;
			const para = node.children?.[0];
			const first = para?.type === 'paragraph' ? para.children?.[0] : undefined;
			const match = first?.type === 'text' ? first.value.match(MARKER) : null;
			if (!match) return;
			const type = match[1].toLowerCase();

			first.value = first.value.slice(match[0].length);
			if (!first.value) para.children.shift();
			/* A line break right after the marker is just the marker's own line. */
			if (para.children[0]?.type === 'break') para.children.shift();
			if (!para.children.length) node.children.shift();

			node.data = { hName: 'div', hProperties: { className: ['callout', `callout--${type}`] } };
			node.children.unshift({
				type: 'paragraph',
				data: { hProperties: { className: ['callout-title'] } },
				children: [{ type: 'text', value: LABELS[type] }],
			});
		});
	};
}
