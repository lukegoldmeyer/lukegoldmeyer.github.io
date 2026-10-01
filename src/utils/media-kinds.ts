/** The types of work on /media. Order here = filter chip order. */
export const mediaKinds = ['photo', 'design', 'video'] as const;
export type MediaKind = (typeof mediaKinds)[number];

export const kindLabels: Record<MediaKind, string> = { photo: 'Photo', design: 'Design', video: 'Video' };
