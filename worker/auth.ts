/**
 * GitHub login helper for the site's /admin editor.
 *
 * The site itself is static (GitHub Pages), but GitHub's OAuth flow needs a client
 * secret, which can't live in the browser. This Worker holds it and does nothing else:
 *
 *   GET  /auth/login?origin=<site origin>  → redirect to GitHub's consent screen
 *   GET  /auth/callback                    → swap the code for a token, check the user,
 *                                            hand the token to the /admin window, close
 *   POST /auth/revoke                      → revoke a token on sign-out
 *
 * Config (Cloudflare dashboard → this Worker → Settings → Variables and Secrets):
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET   secrets, from the GitHub OAuth app
 *   ALLOWED_USERS, ALLOWED_ORIGINS, SCOPE    plain vars, set in wrangler.jsonc
 */

interface Env {
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	/** Comma-separated GitHub usernames allowed to sign in. */
	ALLOWED_USERS: string;
	/** Comma-separated origins allowed to receive a token, e.g. https://lukegoldmeyer.github.io */
	ALLOWED_ORIGINS: string;
	/** OAuth scope. `public_repo` is enough while the repo is public. */
	SCOPE: string;
}

const STATE_COOKIE = 'admin_oauth_state';

const list = (s: string | undefined) =>
	(s ?? '')
		.split(',')
		.map((x) => x.trim().toLowerCase())
		.filter(Boolean);

function cookie(request: Request, name: string): string | undefined {
	const match = request.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
	return match ? decodeURIComponent(match[1]) : undefined;
}

/** Popup page that posts the outcome to the /admin window that opened it, then closes. */
function reply(origin: string, payload: Record<string, unknown>, status = 200): Response {
	const html = `<!doctype html><meta charset="utf-8"><title>Signing in…</title>
<body style="font:15px system-ui;background:#0c0c0b;color:#edede8;display:grid;place-items:center;height:100vh;margin:0">
<p id="m">${'error' in payload ? 'Sign-in failed. You can close this window.' : 'Signed in. You can close this window.'}</p>
<script>
  var data = ${JSON.stringify({ type: 'admin-auth', ...payload })};
  if (window.opener) { window.opener.postMessage(data, ${JSON.stringify(origin)}); window.close(); }
  else if (data.error) { document.getElementById('m').textContent = data.error; }
</script></body>`;
	return new Response(html, {
		status,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
			// Clear the one-time state cookie.
			'Set-Cookie': `${STATE_COOKIE}=; Path=/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
		},
	});
}

async function login(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const origin = url.searchParams.get('origin') ?? '';
	if (!list(env.ALLOWED_ORIGINS).includes(origin.toLowerCase())) {
		return new Response('Origin not allowed', { status: 403 });
	}
	const state = crypto.randomUUID();
	const authorize = new URL('https://github.com/login/oauth/authorize');
	authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
	authorize.searchParams.set('redirect_uri', `${url.origin}/auth/callback`);
	authorize.searchParams.set('scope', env.SCOPE || 'public_repo');
	authorize.searchParams.set('state', state);
	authorize.searchParams.set('allow_signup', 'false');
	return new Response(null, {
		status: 302,
		headers: {
			Location: authorize.href,
			// Ties the callback to this browser and remembers which site asked (10 minutes).
			'Set-Cookie': `${STATE_COOKIE}=${encodeURIComponent(`${state}|${origin}`)}; Path=/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
		},
	});
}

async function callback(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const [state, origin] = (cookie(request, STATE_COOKIE) ?? '').split('|');
	if (!state || !origin || !list(env.ALLOWED_ORIGINS).includes(origin.toLowerCase())) {
		return new Response('Sign-in expired. Close this window and try again.', { status: 400 });
	}
	if (url.searchParams.get('state') !== state) {
		return reply(origin, { error: 'Sign-in state mismatch. Try again.' }, 400);
	}
	const code = url.searchParams.get('code');
	if (!code) return reply(origin, { error: url.searchParams.get('error_description') ?? 'Sign-in cancelled.' }, 400);

	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: `${url.origin}/auth/callback`,
		}),
	});
	const tokenJson = (await tokenRes.json()) as { access_token?: string; error_description?: string };
	const token = tokenJson.access_token;
	if (!token) return reply(origin, { error: tokenJson.error_description ?? 'GitHub did not return a token.' }, 502);

	const userRes = await fetch('https://api.github.com/user', {
		headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'site-admin-auth', Accept: 'application/vnd.github+json' },
	});
	const user = (await userRes.json()) as { login?: string; avatar_url?: string };
	if (!user.login || !list(env.ALLOWED_USERS).includes(user.login.toLowerCase())) {
		await revokeToken(env, token);
		return reply(origin, { error: `@${user.login ?? 'unknown'} isn't allowed to edit this site.` }, 403);
	}
	return reply(origin, { token, login: user.login, avatar: user.avatar_url });
}

/** DELETE /applications/{client_id}/token — invalidates the token on GitHub's side. */
async function revokeToken(env: Env, token: string): Promise<void> {
	await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
		method: 'DELETE',
		headers: {
			Authorization: `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`,
			Accept: 'application/vnd.github+json',
			'User-Agent': 'site-admin-auth',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ access_token: token }),
	});
}

async function revoke(request: Request, env: Env): Promise<Response> {
	const origin = request.headers.get('Origin') ?? '';
	const allowed = list(env.ALLOWED_ORIGINS).includes(origin.toLowerCase());
	const cors: Record<string, string> = allowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: allowed ? 204 : 403,
			headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' },
		});
	}
	if (!allowed) return new Response('Origin not allowed', { status: 403 });
	const { token } = (await request.json().catch(() => ({}))) as { token?: string };
	if (token) await revokeToken(env, token);
	return new Response(null, { status: 204, headers: cors });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);
		if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
			return new Response('Login helper not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.', { status: 500 });
		}
		if (pathname === '/auth/login' && request.method === 'GET') return login(request, env);
		if (pathname === '/auth/callback' && request.method === 'GET') return callback(request, env);
		if (pathname === '/auth/revoke') return revoke(request, env);
		return new Response('Not found', { status: 404 });
	},
};
