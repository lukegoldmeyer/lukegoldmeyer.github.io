// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	// Canonical URL used for sitemap, RSS, social meta tags, and absolute links.
	// User-site repos (named `<username>.github.io`) serve at the root, so no `base` needed.
	// TODO: switch to the Cloudflare Pages URL (or custom domain) once the site moves there.
	site: 'https://lukegoldmeyer.github.io',
	integrations: [mdx()],
	// /photo became /media. Cloudflare serves real 301s from public/_redirects; these
	// meta-refresh pages are the fallback for any other static host.
	redirects: {
		'/photo': '/media',
		'/photo/[...slug]': '/media/[...slug]',
	},
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
