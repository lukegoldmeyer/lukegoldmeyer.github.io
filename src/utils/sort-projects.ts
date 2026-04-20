/** Newest first; uses the later of pubDate vs updatedDate when both exist; stable tie-break by id. */
export function sortProjectsByRecency<
	T extends { id: string; data: { pubDate?: Date; updatedDate?: Date } },
>(projects: T[]): T[] {
	const t = (d: Date | undefined) => d?.getTime() ?? 0;
	return [...projects].sort((a, b) => {
		const ka = Math.max(t(a.data.pubDate), t(a.data.updatedDate));
		const kb = Math.max(t(b.data.pubDate), t(b.data.updatedDate));
		if (kb !== ka) return kb - ka;
		return a.id.localeCompare(b.id);
	});
}
