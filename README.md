# Luke Goldmeyer — personal site

Personal portfolio built with [Astro 6](https://astro.build). Dark-first, light
second, with content collections for projects and media (photo, graphic design,
video), a custom editor at `/admin`, and optional cross-posting to Instagram.
Hosted on GitHub Pages at <https://lukegoldmeyer.github.io>.

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
├── astro.config.mjs             # Astro + MDX + Preact + Shiki config, /photo → /media redirects
├── public/                      # portrait.jpg, favicons
├── scripts/                     # Instagram: prepare JPEGs at build, publish from GitHub Actions
├── worker/auth.ts               # optional "Sign in with GitHub" helper (Cloudflare Worker, not deployed yet)
├── src/
│   ├── admin/                   # the /admin editor (Preact): GitHub client, forms, live preview
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
│   │   ├── admin/                      # editor page + small cover thumbnails for its post list
│   │   └── search.json.ts              # build-time search index
│   ├── styles/global.css        # single stylesheet for the site (the editor reuses it)
│   ├── utils/                   # thumbnail + media asset resolvers, recency sort
│   └── site.ts                  # name, bio, nav, skills, experience, tagOrder, etc.
└── templates/                   # post starter files for writing by hand (not loaded by Astro)
```

## Writing a post

**Use <https://lukegoldmeyer.github.io/admin/>.** Sign in (see below), write the
post, drop in photos or clips, and hit **Publish**. It commits the post and its
files to `main` in one commit; GitHub Pages redeploys and the editor shows
**Deploying… → Live ✓** (about 2 minutes).

- **Live preview** on the right uses the site's own styles. On a phone, switch
  between **Edit** and **Preview**.
- **Photos:** drop many at once, drag (or ←/→) to reorder, ★ sets the cover, alt
  text under each. Photos over 4000px are downscaled in the browser before upload
  (the site never shows them bigger, and it keeps the repo small). That also
  strips EXIF, including GPS. Tick **Keep full-size originals** to skip that.
- **Videos:** short clips (under 50 MB) as files, or a YouTube/Vimeo link.
- **Hidden (draft)** keeps a post out of listings and search while you work on it.
- Removing a photo from a post deletes the file from the repo on save.
- Frontmatter the editor doesn't know about is kept. YAML comments are not.

By hand: copy a template from `templates/` to `src/content/<projects|media>/<slug>/index.mdx`.

- **Folder name = URL slug.** Lowercase + hyphens.
- **Put images and clips in the same folder** and reference them by relative path (`./cover.jpg`).
- `title` is the only required field. See `src/content.config.ts` for the full list.
- **Media `kind`** is `photo`, `design`, or `video` and drives the filters on `/media`.
- **Videos:** short clips as files beside the post (**50 MB max per file**; the
  build fails with a clear message if one is bigger), or a YouTube/Vimeo link via
  `embed:` for anything longer.

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

## Hosting

GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`.
Limits to keep in mind: 1 GB published site, 100 GB/month bandwidth (soft), and
GitHub warns about files over 50 MB. Build-time image optimization keeps pages
small; the editor's 4000px downscale keeps the repo small.

## Admin sign-in

**Now (GitHub only, no other services):** the sign-in screen asks for a GitHub
fine-grained access token. The editor uses it to talk to GitHub directly from
your browser; it's saved only in that browser. One-time per browser:

1. GitHub → Settings → Developer settings → **Fine-grained tokens** →
   [Generate new token](https://github.com/settings/personal-access-tokens/new).
2. Name it (e.g. "Site admin"), pick an expiration (you'll make a new one when
   it expires).
3. Repository access → **Only select repositories** → `lukegoldmeyer.github.io`.
4. Permissions → Repository permissions → **Contents: Read and write**.
5. Generate, copy, paste it into `/admin`.

That token can only touch this one repo. If a device is lost, delete the token
on GitHub and it stops working everywhere. **Sign out** in the editor forgets it
in that browser.

**Later (optional "Sign in with GitHub" button):** needs a small Cloudflare
Worker that's already written (`worker/auth.ts`, `wrangler.jsonc`) but not used
yet. When you move to Cloudflare:

1. Create a Worker from this repo (deploy command `npx wrangler deploy`, no
   build command). Its name must match `name` in `wrangler.jsonc`.
2. GitHub → Settings → Developer settings → **OAuth Apps** → New: homepage = your
   site, callback = `<worker URL>/auth/callback`. Generate a client secret.
3. Add Worker *Secrets* `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; put your
   site's address in `ALLOWED_ORIGINS` in `wrangler.jsonc`.
4. Set `AUTH_URL` in `src/admin/config.ts` to the Worker's URL. The button appears.

**Testing the editor locally:** `npm run dev`, then open
<http://localhost:4321/admin/>. Saves still go to the real repo.

## Instagram

Turn on **Also post to Instagram** for a media post in `/admin` (or set
`instagram: { publish: true }`). After the push, `.github/workflows/instagram.yml`
waits for GitHub Pages to deploy, then posts the first 10 images as a single image
or a carousel, and records it in `src/data/instagram.json` so it never reposts.
Images are converted to 1440px JPEGs, padded with white (or cropped) to fit
Instagram's 4:5 – 1.91:1 range. The editor previews that shape.

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
   - Variables: `SITE_URL` = `https://lukegoldmeyer.github.io`
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
