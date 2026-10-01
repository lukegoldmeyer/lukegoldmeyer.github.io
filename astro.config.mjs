// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

import preact from '@astrojs/preact';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkCallouts from './src/utils/remark-callouts.mjs';

// https://astro.build/config
export default defineConfig({
    // Canonical URL used for sitemap, RSS, social meta tags, and absolute links.
    // User-site repos (named `<username>.github.io`) serve at the root, so no `base` needed.
    site: 'https://lukegoldmeyer.github.io',
    integrations: [mdx(), preact()],
    // /photo became /media; old links land on a page that forwards to the new URL.
    redirects: {
        '/photo': '/media',
        '/photo/[...slug]': '/media/[...slug]',
    },
    markdown: {
        // `$math$` / `$$math$$` via KaTeX, and GitHub-style `> [!NOTE]` callouts. MDX inherits these.
        remarkPlugins: [remarkMath, remarkCallouts],
        rehypePlugins: [rehypeKatex],
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