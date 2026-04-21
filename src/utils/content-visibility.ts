/**
 * Use as the second argument to `getCollection`, e.g.
 * `getCollection('projects', entryIsPublic)`.
 * Entries with `hidden: true` are excluded from listings and search; direct post URLs still build and work.
 */
export function entryIsPublic(entry: { data: { hidden: boolean } }): boolean {
	return !entry.data.hidden;
}
