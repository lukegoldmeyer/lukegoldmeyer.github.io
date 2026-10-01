/**
 * Minimal GitHub client for the editor, using the user's own token straight from the
 * browser. Every save is one commit built with the Git Data API (blobs → tree → commit
 * → move the branch), so a post and all of its files always land together.
 */
import { BRANCH, REPO, apiBase } from './config';

export class GitHubError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

export interface TreeEntry {
	path: string;
	sha: string;
	type: 'blob' | 'tree';
	size?: number;
}

/** A file to write (`content`) or delete (`null`) in a commit. */
export type FileChange = { content: Blob | string } | null;

export interface CommitProgress {
	done: number;
	total: number;
	label: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
	const buf = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < buf.length; i += chunk) {
		binary += String.fromCharCode(...buf.subarray(i, i + chunk));
	}
	return btoa(binary);
}

export class GitHub {
	constructor(private token: string) {}

	async request<T>(path: string, init: RequestInit = {}): Promise<T> {
		const res = await fetch(`${apiBase()}${path}`, {
			...init,
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${this.token}`,
				'X-GitHub-Api-Version': '2022-11-28',
				...(init.body ? { 'Content-Type': 'application/json' } : {}),
				...init.headers,
			},
		});
		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as { message?: string };
			throw new GitHubError(body.message ?? `GitHub returned ${res.status}`, res.status);
		}
		return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
	}

	private repo = (path: string) => `/repos/${REPO}${path}`;

	getUser() {
		return this.request<{ login: string; avatar_url: string }>('/user');
	}

	/** True if this token can push to the repo. */
	async canPush(): Promise<boolean> {
		const repo = await this.request<{ permissions?: { push?: boolean } }>(this.repo(''));
		return repo.permissions?.push === true;
	}

	async head(): Promise<{ commit: string; tree: string }> {
		const ref = await this.request<{ object: { sha: string } }>(this.repo(`/git/ref/heads/${BRANCH}`));
		const commit = await this.request<{ tree: { sha: string } }>(this.repo(`/git/commits/${ref.object.sha}`));
		return { commit: ref.object.sha, tree: commit.tree.sha };
	}

	/** Every file in the branch (one request). */
	async listFiles(): Promise<{ head: string; files: TreeEntry[] }> {
		const { commit, tree } = await this.head();
		const res = await this.request<{ tree: TreeEntry[]; truncated: boolean }>(
			this.repo(`/git/trees/${tree}?recursive=1`),
		);
		return { head: commit, files: res.tree.filter((e) => e.type === 'blob') };
	}

	async readText(sha: string): Promise<string> {
		const blob = await this.request<{ content: string; encoding: string }>(this.repo(`/git/blobs/${sha}`));
		const bytes = Uint8Array.from(atob(blob.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	}

	/**
	 * Commit `changes` (path → new content, or null to delete) on top of the branch.
	 * Uploads each file once, then retries the tree/commit step if someone else pushed
	 * in the meantime (e.g. the Instagram workflow recording a post).
	 */
	async commit(
		message: string,
		changes: Record<string, FileChange>,
		onProgress?: (p: CommitProgress) => void,
	): Promise<string> {
		const entries = Object.entries(changes);
		const uploads = entries.filter(([, c]) => c !== null);
		const blobShas = new Map<string, string>();
		let done = 0;
		for (const [path, change] of uploads) {
			const name = path.split('/').pop()!;
			onProgress?.({ done, total: uploads.length, label: `Uploading ${name}` });
			const content = change!.content;
			const body =
				typeof content === 'string'
					? { content, encoding: 'utf-8' }
					: { content: await blobToBase64(content), encoding: 'base64' };
			const blob = await this.request<{ sha: string }>(this.repo('/git/blobs'), {
				method: 'POST',
				body: JSON.stringify(body),
			});
			blobShas.set(path, blob.sha);
			done++;
		}
		onProgress?.({ done, total: uploads.length, label: 'Publishing' });

		for (let attempt = 0; ; attempt++) {
			const base = await this.head();
			const tree = await this.request<{ sha: string }>(this.repo('/git/trees'), {
				method: 'POST',
				body: JSON.stringify({
					base_tree: base.tree,
					tree: entries.map(([path]) => ({
						path,
						mode: '100644',
						type: 'blob',
						sha: blobShas.get(path) ?? null,
					})),
				}),
			});
			const commit = await this.request<{ sha: string }>(this.repo('/git/commits'), {
				method: 'POST',
				body: JSON.stringify({ message, tree: tree.sha, parents: [base.commit] }),
			});
			try {
				await this.request(this.repo(`/git/refs/heads/${BRANCH}`), {
					method: 'PATCH',
					body: JSON.stringify({ sha: commit.sha }),
				});
				return commit.sha;
			} catch (err) {
				/* 422 = branch moved since we read it; rebuild on the new head. */
				if (err instanceof GitHubError && err.status === 422 && attempt < 3) continue;
				throw err;
			}
		}
	}

	/** Status of the Pages deploy for a commit, if it has started. */
	async deployStatus(sha: string): Promise<{ status: string; conclusion: string | null; url: string } | undefined> {
		const res = await this.request<{
			workflow_runs: { name: string; status: string; conclusion: string | null; html_url: string }[];
		}>(this.repo(`/actions/runs?head_sha=${sha}&per_page=20`));
		const run = res.workflow_runs.find((r) => /pages/i.test(r.name)) ?? res.workflow_runs[0];
		return run && { status: run.status, conclusion: run.conclusion, url: run.html_url };
	}
}
