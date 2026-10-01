/**
 * Publish opted-in media posts to Instagram, once each. Run by .github/workflows/instagram.yml.
 *
 * Env:
 *   IG_USER_ID       Instagram professional account ID
 *   IG_ACCESS_TOKEN  long-lived token with instagram_business_content_publish
 *   SITE_URL         live site origin, e.g. https://lukegoldmeyer.pages.dev
 *   DRY_RUN=1        print what would be posted without calling Instagram
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { STATE_FILE, igImagePath, listInstagramPosts, readState } from './instagram-lib.mjs';

const API = 'https://graph.instagram.com/v25.0';
const { IG_USER_ID, IG_ACCESS_TOKEN, SITE_URL, DRY_RUN } = process.env;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = readState();
const pending = listInstagramPosts().filter((p) => !state[p.slug]);
if (!pending.length) {
	console.log('instagram: nothing new to publish');
	process.exit(0);
}
if (!SITE_URL || (!DRY_RUN && (!IG_USER_ID || !IG_ACCESS_TOKEN))) {
	console.error('instagram: set SITE_URL, IG_USER_ID and IG_ACCESS_TOKEN (see README → Instagram).');
	process.exit(1);
}

async function api(path, params, method = 'POST') {
	const body = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
	const res =
		method === 'GET'
			? await fetch(`${API}/${path}?${body}`)
			: await fetch(`${API}/${path}`, { method, body });
	const json = await res.json();
	if (!res.ok || json.error) throw new Error(`${path}: ${json.error?.message ?? res.status}`);
	return json;
}

/** Instagram fetches images itself, so wait until this deploy's JPEGs are live (up to ~20 min). */
async function waitForLive(url) {
	for (let i = 0; i < 40; i++) {
		const res = await fetch(url, { method: 'HEAD' }).catch(() => undefined);
		if (res?.ok && res.headers.get('content-type')?.includes('image/jpeg')) return;
		await sleep(30_000);
	}
	throw new Error(`${url} never went live; is the GitHub Pages deploy failing?`);
}

/** Containers process asynchronously; publishing before FINISHED fails. */
async function waitForContainer(id) {
	for (let i = 0; i < 30; i++) {
		const { status_code } = await api(id, { fields: 'status_code' }, 'GET');
		if (status_code === 'FINISHED') return;
		if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`container ${id}: ${status_code}`);
		await sleep(5_000);
	}
	throw new Error(`container ${id} still processing after 150s`);
}

let failed = 0;
for (const post of pending) {
	const urls = post.files.map((_, i) => new URL(igImagePath(post.slug, i), SITE_URL).href);
	console.log(`instagram: ${post.slug} → ${urls.length} image(s)\n${post.caption}\n`);
	if (DRY_RUN) continue;
	try {
		await Promise.all(urls.map(waitForLive));
		let creationId;
		if (urls.length === 1) {
			creationId = (await api(`${IG_USER_ID}/media`, { image_url: urls[0], caption: post.caption })).id;
		} else {
			const children = [];
			for (const image_url of urls) {
				children.push((await api(`${IG_USER_ID}/media`, { image_url, is_carousel_item: 'true' })).id);
			}
			await Promise.all(children.map(waitForContainer));
			creationId = (
				await api(`${IG_USER_ID}/media`, {
					media_type: 'CAROUSEL',
					children: children.join(','),
					caption: post.caption,
				})
			).id;
		}
		await waitForContainer(creationId);
		const { id } = await api(`${IG_USER_ID}/media_publish`, { creation_id: creationId });
		state[post.slug] = { mediaId: id, publishedAt: new Date().toISOString() };
		console.log(`instagram: published ${post.slug} (media ${id})`);
	} catch (err) {
		failed++;
		console.error(`instagram: ${post.slug} failed: ${err.message}`);
	}
	/* Save after every post so a later failure never causes a repost. */
	mkdirSync(dirname(STATE_FILE), { recursive: true });
	writeFileSync(STATE_FILE, JSON.stringify(state, null, '\t') + '\n');
}
process.exit(failed ? 1 : 0);
