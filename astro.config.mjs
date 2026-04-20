// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	// Canonical URL used for sitemap, RSS, social meta tags, and absolute links.
	// User-site repos (named `<username>.github.io`) serve at the root, so no `base` needed.
	site: 'https://lukegoldmeyer.github.io',
	integrations: [mdx()],
	markdown: {
		shikiConfig: {
			/**
			 * Dual themes — Shiki emits CSS variables (`--shiki-light`, `--shiki-dark`)
			 * on every token so we can swap the palette based on our own
			 * `[data-theme]` attribute in global.css.
			 */
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			defaultColor: false,
			wrap: false,
		},
	},
});
