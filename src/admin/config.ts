/** Settings for the /admin editor. */

export const REPO = 'lukegoldmeyer/lukegoldmeyer.github.io';
export const BRANCH = 'main';

/**
 * The Cloudflare Worker that runs "Sign in with GitHub" (worker/auth.ts). Empty = not set
 * up yet: the editor then signs in with a pasted GitHub access token only, and nothing
 * talks to Cloudflare. Set it to the Worker's URL to turn the GitHub button on.
 */
export const AUTH_URL = '';

export const SITE_URL = 'https://lukegoldmeyer.github.io';

export const COLLECTIONS = {
	media: { dir: 'src/content/media', label: 'Media', singular: 'media post', urlBase: '/media' },
	projects: { dir: 'src/content/projects', label: 'Projects', singular: 'project', urlBase: '/projects' },
} as const;
export type CollectionName = keyof typeof COLLECTIONS;

export const INSTAGRAM_STATE = 'src/data/instagram.json';

/** Photos larger than this on their long edge are downscaled before upload (unless "keep originals"). */
export const MAX_IMAGE_EDGE = 4000;
/** GitHub warns above 50 MB per file; the site build rejects bigger clips too. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Public URL of a file already in the repo (the repo is public). */
export const rawUrl = (path: string) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

/**
 * GitHub API base. On localhost you can point it at a mock server for testing with
 * `localStorage['admin:apiBase'] = 'http://localhost:9999'`.
 */
export function apiBase(): string {
	try {
		if (location.hostname === 'localhost') return localStorage.getItem('admin:apiBase') || 'https://api.github.com';
	} catch {}
	return 'https://api.github.com';
}
