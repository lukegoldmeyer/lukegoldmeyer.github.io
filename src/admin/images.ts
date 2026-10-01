/** Preparing photos and clips in the browser before they're uploaded. */
import { MAX_IMAGE_EDGE, MAX_VIDEO_BYTES } from './config';

const RESIZABLE = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml';
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v';

export interface PreparedImage {
	blob: Blob;
	/** File extension to save with (may change only if the browser re-encoded it). */
	ext: string;
	width: number;
	height: number;
	resized: boolean;
}

const extFor = (type: string) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[type];

/**
 * Downscale photos whose long edge is over MAX_IMAGE_EDGE (the site never shows them
 * bigger, and it keeps the repo small). Orientation from EXIF is applied; other EXIF
 * (including GPS location) is dropped from resized files.
 */
export async function prepareImage(file: File, keepOriginal: boolean): Promise<PreparedImage> {
	const originalExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
	if (/^image\/hei[cf]$/.test(file.type) || /^(heic|heif)$/.test(originalExt)) {
		throw new Error(`${file.name}: HEIC photos can't be read by browsers. Export it as JPEG first.`);
	}
	if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
		return { blob: file, ext: originalExt, width: 0, height: 0, resized: false };
	}
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		throw new Error(`${file.name} isn't an image this browser can read.`);
	}
	const { width, height } = bitmap;
	const scale = MAX_IMAGE_EDGE / Math.max(width, height);
	if (keepOriginal || scale >= 1 || !RESIZABLE.includes(file.type)) {
		bitmap.close();
		return { blob: file, ext: originalExt, width, height, resized: false };
	}
	const w = Math.round(width * scale);
	const h = Math.round(height * scale);
	const canvas = new OffscreenCanvas(w, h);
	const ctx = canvas.getContext('2d')!;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();
	const blob = await canvas.convertToBlob({ type: file.type, quality: 0.92 });
	return { blob, ext: extFor(file.type) ?? originalExt, width: w, height: h, resized: true };
}

export function checkVideo(file: File): void {
	if (!/^video\//.test(file.type) && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
		throw new Error(`${file.name} isn't a video file.`);
	}
	if (file.size > MAX_VIDEO_BYTES) {
		throw new Error(
			`${file.name} is ${(file.size / 1024 / 1024).toFixed(0)} MB. Clips must be under ${MAX_VIDEO_BYTES / 1024 / 1024} MB: compress it, or upload it to YouTube/Vimeo and paste the link.`,
		);
	}
}

/** Natural size of an image URL, for aspect-ratio-aware previews. */
export function imageSize(url: string): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
		img.onerror = reject;
		img.src = url;
	});
}
