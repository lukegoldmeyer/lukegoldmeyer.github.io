/**
 * Post-build step: write Instagram-ready JPEGs for opted-in media posts to dist/ig/<slug>/<n>.jpg.
 * Instagram only accepts JPEG between 4:5 and 1.91:1, and crops every carousel slide to the
 * first slide's shape, so all slides of a post are fitted to the first image's (clamped) ratio.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import {
	IG_MAX_RATIO,
	IG_MIN_RATIO,
	IG_WIDTH,
	ROOT,
	igImagePath,
	listInstagramPosts,
	readState,
} from './instagram-lib.mjs';

const published = readState();
const pending = listInstagramPosts().filter((p) => !published[p.slug]);

for (const post of pending) {
	const first = await sharp(post.files[0]).rotate().metadata();
	/* `rotate()` applies EXIF orientation; metadata() still reports pre-rotation size, so swap if needed. */
	const [w, h] = (first.orientation ?? 1) >= 5 ? [first.height, first.width] : [first.width, first.height];
	const ratio = Math.min(IG_MAX_RATIO, Math.max(IG_MIN_RATIO, w / h));
	const height = Math.round(IG_WIDTH / ratio);

	for (const [i, file] of post.files.entries()) {
		const out = join(ROOT, 'dist', igImagePath(post.slug, i));
		mkdirSync(dirname(out), { recursive: true });
		await sharp(file)
			.rotate()
			.resize(IG_WIDTH, height, {
				fit: post.fit === 'crop' ? 'cover' : 'contain',
				background: '#ffffff',
			})
			.flatten({ background: '#ffffff' })
			.jpeg({ quality: 90, mozjpeg: true })
			.toFile(out);
	}
	console.log(`instagram: prepared ${post.files.length} image(s) for ${post.slug} (${IG_WIDTH}x${height})`);
}
