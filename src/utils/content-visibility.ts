/**
 * Use as the second argument to `getCollection`, e.g.
 * `getCollection('projects', entryIsPublic)`.
 * Entries with `hidden: true` in frontmatter are excluded from listings, search, and static routes.
 */
export function entryIsPublic(entry: { data: { hidden: boolean } }): boolean {
	return !entry.data.hidden;
}
