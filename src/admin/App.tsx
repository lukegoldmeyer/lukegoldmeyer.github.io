/** /admin: sign-in, post list, and routing to the editor. */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Session, loadSession, saveSession, signInWithGitHub, signOut } from './auth';
import { AUTH_URL, COLLECTIONS, type CollectionName, INSTAGRAM_STATE, REPO, SITE_URL, rawUrl } from './config';
import { type Post, emptyMedia, emptyProject, parseMedia, parseProject } from './content';
import { Editor } from './Editor';
import { GitHub, GitHubError, type TreeEntry } from './github';
import { KIND_LABELS, formatDate } from './Preview';

interface Summary {
	collection: CollectionName;
	slug: string;
	sha: string;
	title: string;
	kind?: keyof typeof KIND_LABELS;
	date: string;
	hidden: boolean;
	pin: boolean;
	tags: string[];
	coverName?: string;
}

interface Repo {
	files: TreeEntry[];
	summaries: Summary[];
	instagram: Record<string, unknown>;
}

type Route = { view: 'list'; collection: CollectionName } | { view: 'edit'; collection: CollectionName; slug: string | null };

function parseRoute(): Route {
	const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
	const collection = (parts[0] === 'projects' ? 'projects' : 'media') as CollectionName;
	if (parts.length >= 2) return { view: 'edit', collection, slug: parts[1] === 'new' ? null : decodeURIComponent(parts[1]) };
	return { view: 'list', collection };
}

const SUMMARY_CACHE = 'admin:summaries';
function readCache(): Record<string, Summary> {
	try {
		return JSON.parse(localStorage.getItem(SUMMARY_CACHE) ?? '{}');
	} catch {
		return {};
	}
}

/** One summary per post, re-reading only posts whose index file changed since last time. */
async function loadRepo(gh: GitHub): Promise<Repo> {
	const { files } = await gh.listFiles();
	const cache = readCache();
	const next: Record<string, Summary> = {};
	const indexes = files
		.map((f) => {
			for (const [name, c] of Object.entries(COLLECTIONS)) {
				const m = f.path.match(new RegExp(`^${c.dir}/([^/]+)/index\\.mdx?$`));
				if (m) return { collection: name as CollectionName, slug: m[1], sha: f.sha };
			}
			return null;
		})
		.filter((x): x is { collection: CollectionName; slug: string; sha: string } => !!x);

	const summaries = await Promise.all(
		indexes.map(async ({ collection, slug, sha }) => {
			const key = `${collection}/${slug}`;
			if (cache[key]?.sha === sha) return (next[key] = cache[key]);
			const text = await gh.readText(sha);
			const post = collection === 'media' ? parseMedia(slug, text, []) : parseProject(slug, text, []);
			const coverName =
				post.collection === 'media' ? (post.cover ?? post.images[0])?.name : post.thumbnail?.name;
			return (next[key] = {
				collection,
				slug,
				sha,
				title: post.title || slug,
				kind: post.collection === 'media' ? post.kind : undefined,
				date: [post.pubDate, post.updatedDate].sort().pop() ?? '',
				hidden: post.hidden,
				pin: post.pin,
				tags: post.tags,
				coverName,
			});
		}),
	);
	try {
		localStorage.setItem(SUMMARY_CACHE, JSON.stringify(next));
	} catch {}

	const igFile = files.find((f) => f.path === INSTAGRAM_STATE);
	const instagram = igFile ? JSON.parse((await gh.readText(igFile.sha)) || '{}') : {};
	return { files, summaries, instagram };
}

/* ---------- small pieces ---------- */

function ThemeToggle() {
	return (
		<button
			type="button"
			class="theme-btn"
			onClick={() => {
				const root = document.documentElement;
				const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
				root.setAttribute('data-theme', next);
				try {
					localStorage.setItem('theme', next);
				} catch {}
			}}
		>
			<span class="t-icon" aria-hidden="true">
				◐
			</span>
			<span>Theme</span>
		</button>
	);
}

interface Toast {
	id: number;
	msg: string;
	kind: 'error' | 'ok';
}

function SignIn({ onSession }: { onSession: (s: Session) => void }) {
	const [error, setError] = useState('');
	const [pending, setPending] = useState(false);
	const [showToken, setShowToken] = useState(false);
	const [token, setToken] = useState('');

	async function github() {
		setError('');
		setPending(true);
		try {
			onSession(await signInWithGitHub());
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setPending(false);
		}
	}

	async function withToken(e: Event) {
		e.preventDefault();
		setError('');
		setPending(true);
		try {
			const user = await new GitHub(token.trim()).getUser();
			onSession({ token: token.trim(), login: user.login, avatar: user.avatar_url });
		} catch {
			setError('That token didn’t work. Check it has access to this repo.');
		} finally {
			setPending(false);
		}
	}

	const tokenForm = (
		<form class="adm-token" onSubmit={withToken}>
			<input
				class="adm-input"
				type="password"
				placeholder="github_pat_…"
				aria-label="GitHub access token"
				value={token}
				onInput={(e) => setToken(e.currentTarget.value)}
				autoComplete="off"
			/>
			<button class={`adm-btn${AUTH_URL ? '' : ' adm-btn--primary'}`} disabled={!token.trim() || pending}>
				{pending && !AUTH_URL ? 'Checking…' : 'Sign in'}
			</button>
		</form>
	);

	const tokenSteps = (
		<ol class="adm-steps">
			<li>
				Open{' '}
				<a class="link-accent" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
					GitHub → new fine-grained token
				</a>
				.
			</li>
			<li>Name it (e.g. “Site admin”) and pick an expiration.</li>
			<li>
				Repository access → <b>Only select repositories</b> → <b>{REPO.split('/')[1]}</b>.
			</li>
			<li>
				Permissions → Repository permissions → <b>Contents: Read and write</b>.
			</li>
			<li>Generate, copy, and paste it here.</li>
		</ol>
	);

	return (
		<div class="adm-signin">
			<p class="section-label">Admin</p>
			<h1 class="adm-signin-title">Sign in</h1>
			{AUTH_URL ? (
				<>
					<p class="adm-hint">Only accounts that can push to {REPO} can publish.</p>
					<button type="button" class="adm-btn adm-btn--primary adm-btn--big" onClick={github} disabled={pending}>
						{pending ? 'Waiting for GitHub…' : 'Sign in with GitHub'}
					</button>
					{showToken ? (
						<>
							{tokenForm}
							<p class="adm-hint">Fine-grained token → only this repo → Contents: Read and write. Stored only in this browser.</p>
						</>
					) : (
						<button type="button" class="adm-link" onClick={() => setShowToken(true)}>
							Use an access token instead
						</button>
					)}
				</>
			) : (
				<>
					<p class="adm-hint">
						Paste a GitHub access token that can edit {REPO}. It’s saved only in this browser, and goes only to
						GitHub. You only need to do this once per browser.
					</p>
					{tokenForm}
					{tokenSteps}
				</>
			)}
			{error ? <p class="adm-error-text">{error}</p> : null}
		</div>
	);
}

function PostList(props: {
	repo: Repo;
	collection: CollectionName;
	thumbs: Record<string, string>;
}) {
	const [q, setQ] = useState('');
	const meta = COLLECTIONS[props.collection];
	const rows = props.repo.summaries
		.filter((s) => s.collection === props.collection)
		.filter((s) => !q || `${s.title} ${s.tags.join(' ')} ${s.kind ?? ''}`.toLowerCase().includes(q.toLowerCase()))
		.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
	return (
		<div class="adm-list">
			<div class="adm-list-head">
				<div class="adm-tabs adm-tabs--big" role="tablist">
					{(Object.keys(COLLECTIONS) as CollectionName[]).map((c) => (
						<a role="tab" aria-selected={c === props.collection} href={`#/${c}`}>
							{COLLECTIONS[c].label}
						</a>
					))}
				</div>
				<div class="adm-row">
					<input class="adm-input adm-search" type="search" placeholder="Filter…" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
					<a class="adm-btn adm-btn--primary" href={`#/${props.collection}/new`}>
						+ New {meta.singular}
					</a>
				</div>
			</div>
			{rows.length === 0 ? (
				<p class="adm-hint adm-list-empty">{q ? 'Nothing matches.' : `No ${meta.label.toLowerCase()} yet.`}</p>
			) : (
				<ul class="adm-rows">
					{rows.map((s) => {
						const thumb =
							props.thumbs[`${s.collection}/${s.slug}`] ??
							(s.coverName ? rawUrl(`${meta.dir}/${s.slug}/${s.coverName}`) : undefined);
						return (
							<li key={s.slug}>
								<a class="adm-rowlink" href={`#/${s.collection}/${encodeURIComponent(s.slug)}`}>
									<span class="adm-row-thumb">{thumb ? <img src={thumb} alt="" loading="lazy" /> : null}</span>
									<span class="adm-row-main">
										<span class="adm-row-title">{s.title}</span>
										<span class="adm-row-meta">
											{s.kind ? `${KIND_LABELS[s.kind]} · ` : ''}
											{s.date ? formatDate(s.date, 'short') : 'No date'}
										</span>
									</span>
									<span class="adm-row-badges">
										{s.hidden ? <span class="adm-badge">Hidden</span> : null}
										{s.pin ? <span class="adm-badge adm-badge--accent">{s.collection === 'media' ? 'Featured' : 'Pinned'}</span> : null}
										{props.repo.instagram[s.slug] && s.collection === 'media' ? <span class="adm-badge">On Instagram</span> : null}
									</span>
								</a>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

/* ---------- app ---------- */

export default function App() {
	const [session, setSession] = useState<Session | null>(() => loadSession());
	const gh = useMemo(() => (session ? new GitHub(session.token) : null), [session?.token]);
	const [repo, setRepo] = useState<Repo | null>(null);
	const [loadError, setLoadError] = useState('');
	const [route, setRoute] = useState<Route>(parseRoute);
	/** `key` matches the route; `session` stays the same across publishing a new post, so the editor isn't remounted. */
	const [editing, setEditing] = useState<{ key: string; session: number; post: Post } | null>(null);
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [thumbs, setThumbs] = useState<Record<string, string>>({});
	const dirtyRef = useRef(false);

	const toast = (msg: string, kind: 'error' | 'ok' = 'ok') => {
		const id = Date.now() + Math.random();
		setToasts((t) => [...t, { id, msg, kind }]);
		setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4000);
	};

	/* Hash routing, with a guard against leaving unpublished edits. */
	useEffect(() => {
		let last = location.hash;
		const onHash = () => {
			if (dirtyRef.current && !confirm('You have unpublished changes. Leave anyway?')) {
				history.replaceState(null, '', last);
				return;
			}
			dirtyRef.current = false;
			last = location.hash;
			setRoute(parseRoute());
		};
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);

	/* Small cover thumbnails generated by the site build (src/pages/admin/posts.json.ts). */
	useEffect(() => {
		fetch('/admin/posts.json')
			.then((r) => (r.ok ? r.json() : {}))
			.then(setThumbs)
			.catch(() => {});
	}, []);

	const refresh = async () => {
		if (!gh) return;
		try {
			setRepo(await loadRepo(gh));
			setLoadError('');
		} catch (err) {
			if (err instanceof GitHubError && err.status === 401) {
				await signOut(session);
				setSession(null);
				toast('Your sign-in expired. Sign in again.', 'error');
			} else {
				setLoadError((err as Error).message);
			}
		}
	};

	useEffect(() => {
		if (!gh) return;
		gh.canPush()
			.then((ok) => {
				if (!ok) setLoadError(`@${session?.login} can’t push to ${REPO}.`);
			})
			.catch(() => {});
		refresh();
	}, [gh]);

	/* Load the post the route points at. */
	useEffect(() => {
		if (!gh || !repo || route.view !== 'edit') return;
		const key = `${route.collection}/${route.slug ?? 'new'}`;
		if (editing?.key === key) return;
		if (route.slug === null) {
			setEditing({ key, session: Date.now(), post: route.collection === 'media' ? emptyMedia() : emptyProject() });
			return;
		}
		const dir = `${COLLECTIONS[route.collection].dir}/${route.slug}/`;
		const index = repo.files.find((f) => f.path === `${dir}index.mdx` || f.path === `${dir}index.md`);
		if (!index) {
			toast(`No ${COLLECTIONS[route.collection].singular} at “${route.slug}”.`, 'error');
			location.hash = `#/${route.collection}`;
			return;
		}
		setEditing(null);
		const folderFiles = repo.files.filter((f) => f.path.startsWith(dir) && f.path !== index.path).map((f) => f.path.slice(dir.length));
		gh.readText(index.sha)
			.then((text) =>
				setEditing({
					session: Date.now(),
					key,
					post: route.collection === 'media' ? parseMedia(route.slug!, text, folderFiles) : parseProject(route.slug!, text, folderFiles),
				}),
			)
			.catch((err) => toast(`Couldn’t open it: ${err.message}`, 'error'));
	}, [gh, repo, route]);

	const tagSuggestions = useMemo(
		() => [...new Set(repo?.summaries.flatMap((s) => s.tags) ?? [])].sort((a, b) => a.localeCompare(b)),
		[repo],
	);

	return (
		<div class="adm">
			<header class="adm-top">
				<a class="nav-logo adm-logo" href="#/">
					Admin
				</a>
				<div class="adm-row">
					<a class="adm-link" href={SITE_URL} target="_blank" rel="noreferrer">
						View site ↗
					</a>
					<ThemeToggle />
					{session ? (
						<button
							type="button"
							class="adm-user"
							title="Sign out"
							onClick={async () => {
								if (dirtyRef.current && !confirm('You have unpublished changes. Sign out anyway?')) return;
								await signOut(session);
								setSession(null);
								setRepo(null);
							}}
						>
							{session.avatar ? <img src={session.avatar} alt="" /> : null}
							<span>Sign out</span>
						</button>
					) : null}
				</div>
			</header>

			<main class="adm-main">
				{!session ? (
					<SignIn
						onSession={(s) => {
							saveSession(s);
							setSession(s);
						}}
					/>
				) : loadError ? (
					<div class="adm-signin">
						<p class="adm-error-text">{loadError}</p>
						<button type="button" class="adm-btn" onClick={refresh}>
							Try again
						</button>
					</div>
				) : !repo ? (
					<p class="adm-loading">Loading posts…</p>
				) : route.view === 'list' ? (
					<PostList repo={repo} collection={route.collection} thumbs={thumbs} />
				) : editing && editing.key === `${route.collection}/${route.slug ?? 'new'}` ? (
					<Editor
						key={editing.session}
						gh={gh!}
						initial={editing.post}
						existingSlugs={repo.summaries.filter((s) => s.collection === route.collection).map((s) => s.slug)}
						tagSuggestions={tagSuggestions}
						instagramPosted={route.collection === 'media' && !!route.slug && !!repo.instagram[route.slug]}
						onDirtyChange={(d) => (dirtyRef.current = d)}
						onSaved={(post) => {
							const key = `${post.collection}/${post.slug}`;
							setEditing((e) => ({ key, session: e?.session ?? Date.now(), post }));
							if (route.slug === null) history.replaceState(null, '', `#/${post.collection}/${post.slug}`);
							setRoute({ view: 'edit', collection: post.collection, slug: post.slug });
							refresh();
						}}
						onDeleted={() => {
							dirtyRef.current = false;
							setEditing(null);
							location.hash = `#/${route.collection}`;
							refresh();
						}}
						toast={toast}
					/>
				) : (
					<p class="adm-loading">Opening…</p>
				)}
			</main>

			<div class="adm-toasts" role="status" aria-live="polite">
				{toasts.map((t) => (
					<div key={t.id} class={`adm-toast adm-toast--${t.kind}`}>
						{t.msg}
					</div>
				))}
			</div>
		</div>
	);
}
