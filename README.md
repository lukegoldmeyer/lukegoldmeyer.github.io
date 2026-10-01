# Luke Goldmeyer — personal site

Personal portfolio built with [Astro 6](https://astro.build). Dark-first, light
second, with content collections for projects and media (photo, graphic design,
video), a CMS at `/admin`, and optional cross-posting to Instagram.

## Getting started

Requires Node **22.12** or newer.

```sh
npm install
npm run dev       # http://localhost:4321
```

| Command           | Action                                                        |
| :---------------- | :------------------------------------------------------------ |
| `npm install`     | Install dependencies                                          |
| `npm run dev`     | Start the dev server                                          |
| `npm run build`   | Production build in `./dist/` (+ Instagram JPEGs, if any)     |
| `npm run preview` | Preview the `./dist/` output locally                          |

## Project layout

```text
/
├── astro.config.mjs             # Astro + MDX + Shiki config, /photo → /media redirects
├── public/
│   ├── admin/                   # Sveltia CMS: index.html + config.yml (fields for each post type)
│   ├── _headers, _redirects     # Cloudflare Pages caching + 301s
│   └── portrait.jpg, favicons
├── scripts/                     # Instagram: prepare JPEGs at build, publish from GitHub Actions
├── src/
│   ├── components/              # Nav, Footer, SearchOverlay, Toc, ProjCard, MediaCard, Pin
│   ├── content/
│   │   ├── projects/<slug>/     # one folder per project post (index.mdx + its images)
│   │   └── media/<slug>/        # one folder per media post (index.mdx + its images/clips)
│   ├── content.config.ts        # zod schemas for both collections
│   ├── data/instagram.json      # which media posts are already on Instagram (written by CI)
│   ├── layouts/BaseLayout.astro # <head>, Nav, Footer, inline UI script
│   ├── pages/
│   │   ├── index.astro                 # hero, recent projects, recent media, about, contact
│   │   ├── projects/index.astro        # Recent + Pinned + Topics
│   │   ├── projects/all.astro          # chronological "full list"
│   │   ├── projects/[...slug].astro    # individual project
│   │   ├── media/index.astro           # Recent + Featured + All Work (filter by type)
│   │   ├── media/[...slug].astro       # individual media post (images, videos)
│   │   └── search.json.ts              # build-time search index
│   ├── styles/global.css        # single stylesheet — everything lives here
│   ├── utils/                   # thumbnail + media asset resolvers, recency sort
│   └── site.ts                  # name, bio, nav, skills, experience, tagOrder, etc.
└── templates/                   # post starter files for writing by hand (not loaded by Astro)
```

## Writing a post

**Use `/admin`.** It writes the same files you would by hand, commits them to
GitHub, and the site redeploys on its own in a minute or two. To try it locally
without logging in, run `npm run dev`, open <http://localhost:4321/admin/index.html> in
Chrome or Edge, and choose **Work with Local Repository** → pick this folder.
Changes go straight to your files; commit them with git as usual.

By hand: copy a template from `templates/` to `src/content/<projects|media>/<slug>/index.mdx`.

- **Folder name = URL slug.** Lowercase + hyphens.
- **Put images and clips in the same folder** and reference them by relative path (`./cover.jpg`).
- `title` is the only required field. See `src/content.config.ts` for the full list.
- **Media `kind`** is `photo`, `design`, or `video` and drives the filters on `/media`.
- **Videos:** short clips as files beside the post (**25 MB max per file** on
  Cloudflare Pages; the build fails with a clear message if one is bigger), or a
  YouTube/Vimeo link via `embed:` for anything longer.

### Features baked in

- **Images are optimized at build time**: resized, converted to WebP, and served
  with `srcset`, so originals of any size are fine to commit. The lightbox loads a
  2560px version.
- **Recent Media on the home page** uses justified rows: one height per row,
  widths follow each photo's aspect ratio.
- **Auto-generated TOC** for project posts with ≥ 2 `h2`/`h3` headings.
- **Code blocks** get Shiki highlighting that flips with the theme, a language
  label, and a copy button.
- **Pinning** (`pin: true`): pin badge on cards + the Pinned / Featured columns.
- **Tags** drive the Topics section on `/projects` (`site.tagOrder` / `site.hiddenTopics`).
- **Search palette** (⌘K / Ctrl+K) over titles, descriptions, tags, and bodies.

## Hosting: Cloudflare Pages

Free, unlimited bandwidth, global CDN. One-time setup:

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick this repo.
2. Framework preset **Astro**; build command `npm run build`; output directory `dist`.
3. Environment variable `NODE_VERSION` = `22`.
4. Deploy. The site is live at `https://<project-name>.pages.dev`; every push to
   `main` redeploys. Add a custom domain under the project's **Custom domains** tab.
5. Then update the site URL in three places: `site` in `astro.config.mjs`,
   `site_url` / `display_url` in `public/admin/config.yml`, and the `SITE_URL`
   repo variable (see Instagram below).
6. Once it works, delete `.github/workflows/deploy.yml` (the old GitHub Pages
   deploy) and turn off Pages in the GitHub repo settings.

Limits to know: 25 MB per file, 20,000 files per deploy, 500 builds per month.

## Admin (`/admin`)

[Sveltia CMS](https://sveltiacms.app). The page is public, but saving anything
requires a GitHub login with write access to this repo, so only you can publish.

**Quick start (no setup):** on the login screen choose **Sign In with Token** and
paste a GitHub fine-grained token: Repository access → only this repo;
Permissions → **Contents: Read and write**. It is stored only in your browser.

**Proper GitHub login button** (free, ~10 minutes):

1. Deploy [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) to
   Cloudflare Workers with its **Deploy to Cloudflare** button. Note the worker URL.
2. GitHub → Settings → Developer settings → **OAuth Apps** → New. Callback URL:
   `<worker URL>/callback`.
3. In the worker's **Settings → Variables**: `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET` (encrypt it), and `ALLOWED_DOMAINS` = your site domain.
4. In `public/admin/config.yml`, uncomment `base_url:` and set it to the worker URL.

Optional extra lock: Cloudflare **Zero Trust → Access** can put an email-code
login in front of `/admin/*` (free for up to 50 users).

## Instagram

Turn on **Also post to Instagram** for a media post in `/admin` (or set
`instagram: { publish: true }`). After the push, `.github/workflows/instagram.yml`
waits for Cloudflare to deploy, then posts the first 10 images as a single image
or a carousel, and records it in `src/data/instagram.json` so it never reposts.
Images are converted to 1440px JPEGs, padded with white (or cropped) to fit
Instagram's 4:5 – 1.91:1 range.

One-time setup (Meta's dashboard wording changes often; the flow is the same):

1. Make your Instagram account **Professional** (Creator or Business) in the app's settings.
2. [developers.facebook.com](https://developers.facebook.com/apps) → **Create app**
   → use case **Manage messaging & content on Instagram** → **API setup with
   Instagram login**.
3. Add your Instagram account (as an Instagram tester if asked, then accept the
   invite in Instagram → Settings → Website permissions → Apps and websites).
4. **Generate token** for your account. Copy the token and your Instagram user ID.
5. In GitHub → repo **Settings → Secrets and variables → Actions**:
   - Secrets: `IG_USER_ID`, `IG_ACCESS_TOKEN`
   - Variables: `SITE_URL` = your live site, e.g. `https://lukegoldmeyer.pages.dev`
   - Optional secret `GH_SECRETS_TOKEN`: fine-grained token on this repo with
     **Secrets: Read and write**. With it, the workflow refreshes the Instagram
     token monthly; without it, regenerate the token every 60 days.

Test without posting: `SITE_URL=https://example.com DRY_RUN=1 node scripts/instagram-publish.mjs`.

## If HMR gets stuck

Astro's content collection HMR can get into a bad state when you rename,
duplicate, or delete entire post folders while the dev server is running.
Symptoms: stale 404s, `UnknownContentCollectionError`, stale asset URLs.

```sh
# stop the dev server first
rm -rf .astro node_modules/.vite
npm run dev
```

On Windows, stop the dev server before renaming or moving post folders. It
holds a lock on them.
