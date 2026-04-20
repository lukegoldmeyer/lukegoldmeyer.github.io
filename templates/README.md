# Post templates

Two starter files with every field your content collections accept, fully
annotated. They intentionally live **outside** `src/content/` so the Astro
content loader won't try to treat them as real posts.

| Template             | Drop into                 | Becomes URL                      |
| -------------------- | ------------------------- | -------------------------------- |
| `project-post.mdx`   | `src/content/projects/<slug>/index.mdx` | `/projects/<slug>/` |
| `photo-post.mdx`     | `src/content/photos/<slug>/index.mdx`   | `/photo/<slug>/`    |

## Workflow

1. Copy the relevant template into a new folder with a URL-safe slug
   (lowercase, hyphens, no spaces), renaming the file to `index.mdx`.
2. Drop any images into that same folder beside `index.mdx`.
3. Edit frontmatter. Only `title` is required; delete everything you don't need.
4. **Remove the `#` comment lines** before shipping — YAML treats them as comments,
   but they just clutter the file.
5. Commit and reload — if the dev server was running, a restart may be needed
   when adding a brand-new folder (Astro's content-collection HMR sometimes
   needs a cold start to catch the new entry cleanly).

## Gotchas

- **No blank lines inside frontmatter** (between the two `---` delimiters).
  Some YAML parsers in the MDX toolchain treat a bare blank line as end-of-block.
- **Folder name = slug.** Renaming the folder changes the URL. Do it while the
  dev server is stopped to avoid stale content-module cache issues.
- **Images are referenced relative to the mdx file**, e.g. `./cover.jpg`.
- If a project has a `thumbnail.{jpg,png,webp,…}` file sitting beside its mdx
  it will be auto-picked even if you don't list it in frontmatter. Delete the
  file if you don't want a thumbnail.
