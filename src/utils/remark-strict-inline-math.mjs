/**
 * Keep prices from turning into equations. remark-math reads any pair of `$` as
 * inline math, so "around $250 … around $1,300" becomes one long equation.
 * This applies the usual (Pandoc) rule instead: `$…$` is math only when the opening
 * `$` isn't followed by a space, the closing `$` isn't preceded by one, and the
 * closing `$` isn't followed by a digit. Anything else goes back to normal text.
 *
 * Runs after remark-math. The /admin preview uses the same rule in src/admin/markdown.ts.
 */

function isMath(source, node) {
	const start = node.position?.start?.offset;
	const end = node.position?.end?.offset;
	if (start === undefined || end === undefined) return true;
	const raw = source.slice(start, end);
	/* Only single-dollar math; `$$…$$` is always intentional. */
	if (!/^\$[^$]/.test(raw) || !/[^$]\$$/.test(raw)) return true;
	const inner = raw.slice(1, -1);
	return !/^\s/.test(inner) && !/\s$/.test(inner) && !/^\d/.test(source.slice(end));
}

export default function remarkStrictInlineMath() {
	const processor = this;
	return (tree, file) => {
		const source = String(file.value);
		const fix = (parent) => {
			if (!parent.children) return;
			for (let i = 0; i < parent.children.length; i++) {
				const node = parent.children[i];
				if (node.type === 'inlineMath' && !isMath(source, node)) {
					const raw = source.slice(node.position.start.offset, node.position.end.offset);
					/* Re-read what was between the dollars as normal Markdown (links, bold…).
					 * Parsing trims the ends, so put the surrounding spaces back. */
					const [, lead, body, trail] = raw.slice(1, -1).match(/^(\s*)([\s\S]*?)(\s*)$/);
					const para = body ? processor.parse(body).children[0] : undefined;
					const inner = para?.type === 'paragraph' ? para.children : [{ type: 'text', value: body }];
					const replacement = [
						{ type: 'text', value: `$${lead.replace(/\s+/g, ' ')}` },
						...inner,
						{ type: 'text', value: `${trail.replace(/\s+/g, ' ')}$` },
					];
					parent.children.splice(i, 1, ...replacement);
					i += replacement.length - 1;
				} else {
					fix(node);
				}
			}
		};
		fix(tree);
	};
}
