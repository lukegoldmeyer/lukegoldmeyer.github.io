# Luke Goldmeyer — personal site

Personal portfolio built with [Astro 6](https://astro.build). Dark-first, light
second, with a content-collection setup for projects and photography posts.

## Getting started

Requires Node **22.12** or newer.

```sh
npm install
npm run dev       # http://localhost:4321
```

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`     | Start the dev server                          |
| `npm run build`   | Produce a production build in `./dist/`       |
| `npm run preview` | Preview the `./dist/` output locally          |

## Project layout

```text
/
├── astro.config.mjs             # Astro + MDX + Shiki (dual-theme) config
├── public/                      # static assets served as-is (portrait.jpg, favicons)
├── src/
│   ├── components/              # Nav, Footer, SearchOverlay, Toc, ProjCard, Pin
│   ├── content/
│   │   ├── projects/<slug>/     # one folder per project post
│   │   └── photos/<slug>/       # one folder per photo post
│   ├── content.config.ts        # zod schemas for both collections
│   ├── layouts/BaseLayout.astro # <head>, Nav, Footer, inline UI script
│   ├── pages/
│   │   ├── index.astro
│   │   ├── projects/index.astro        # Recent + Pinned + Topics
│   │   ├── projects/all.astro          # chronological "full list"
│   │   ├── projects/[...slug].astro    # individual project
│   │   ├── photo/index.astro           # Recent + Featured + All masonry
│   │   ├── photo/[...slug].astro       # individual photo post
│   │   └── search.json.ts              # build-time search index
│   ├── styles/global.css        # single stylesheet — everything lives here
│   ├── utils/                   # thumbnail + photo asset resolvers, recency sort
│   └── site.ts                  # name, bio, nav, skills, experience, tagOrder, etc.
└── templates/                   # post starter files (not loaded by Astro)
    ├── project-post.mdx
    ├── photo-post.mdx
    └── README.md
```

## Writing a post

Copy the relevant template from `templates/` into `src/content/<type>/<slug>/index.mdx`.

- **Folder name = URL slug.** Use lowercase + hyphens.
- **Drop images into the same folder** and reference them with relative paths
  (`./cover.jpg`), or use the Astro `<Image />` component for optimization.
- `title` is the only required frontmatter field. Every other field is optional
  (see `src/content.config.ts` for the authoritative list).
- **Don't leave blank lines inside frontmatter** — some YAML parsers in the MDX
  toolchain treat them as end-of-block.

### Features baked in

- **Auto-generated TOC** for any post with ≥ 2 `h2`/`h3` headings.
- **Code blocks** get Shiki syntax highlighting that flips with the theme, a
  language label centered at the top, and a copy button in the top-right.
- **Pinning** (`pin: true`): adds a pin badge to every card + floats the post
  into the right-hand "Pinned" / "Featured" column on the listing page.
- **Tags** drive the Topics section on `/projects`. Control ordering and
  hide certain tags via `site.tagOrder` / `site.hiddenTopics`.
- **Search palette** (⌘K / Ctrl+K) searches titles, descriptions, tags, and
  article bodies. Index is built at `/search.json` and lazy-loaded.

## If HMR gets stuck

Astro's content collection HMR can get into a bad state when you rename,
duplicate, or delete entire post folders while the dev server is running.
Symptoms: stale 404s, `UnknownContentCollectionError`, stale asset URLs.

The clean fix:

```sh
# stop the dev server first
rm -rf .astro node_modules/.vite
npm run dev
```

## Deploying

Any static host works — the build outputs plain HTML/CSS/JS to `./dist/`.
Netlify, Vercel, Cloudflare Pages, and GitHub Pages are all fine.
