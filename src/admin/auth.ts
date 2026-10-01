/**
 * Sign-in for the editor. A pasted fine-grained GitHub token always works and needs
 * nothing else. "Sign in with GitHub" (only when AUTH_URL is set) opens the login Worker
 * in a popup, which posts the token back here. The session lives in this browser's
 * localStorage only.
 */
import { AUTH_URL } from './config';

export interface Session {
	token: string;
	login: string;
	avatar?: string;
}

const KEY = 'admin:session';

export function loadSession(): Session | null {
	try {
		const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
		return s?.token ? s : null;
	} catch {
		return null;
	}
}

export function saveSession(s: Session): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(s));
	} catch {}
}

export async function signOut(session: Session | null): Promise<void> {
	try {
		localStorage.removeItem(KEY);
	} catch {}
	/* Revoke OAuth tokens on GitHub's side too; pasted tokens are the user's to manage. */
	if (AUTH_URL && session && !session.token.startsWith('github_pat_') && !session.token.startsWith('ghp_')) {
		await fetch(`${AUTH_URL}/auth/revoke`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: session.token }),
		}).catch(() => {});
	}
}

export function signInWithGitHub(): Promise<Session> {
	return new Promise((resolve, reject) => {
		const w = 520;
		const h = 680;
		const popup = window.open(
			`${AUTH_URL}/auth/login?origin=${encodeURIComponent(location.origin)}`,
			'admin-github-login',
			`width=${w},height=${h},left=${Math.round(screenX + (outerWidth - w) / 2)},top=${Math.round(screenY + (outerHeight - h) / 2)}`,
		);
		if (!popup) {
			reject(new Error('The sign-in popup was blocked. Allow popups for this site and try again.'));
			return;
		}
		const authOrigin = new URL(AUTH_URL).origin;
		const onMessage = (e: MessageEvent) => {
			if (e.origin !== authOrigin || e.data?.type !== 'admin-auth') return;
			cleanup();
			if (e.data.error) reject(new Error(e.data.error));
			else resolve({ token: e.data.token, login: e.data.login, avatar: e.data.avatar });
		};
		const timer = setInterval(() => {
			if (popup.closed) {
				cleanup();
				reject(new Error('Sign-in window closed.'));
			}
		}, 500);
		const cleanup = () => {
			window.removeEventListener('message', onMessage);
			clearInterval(timer);
		};
		window.addEventListener('message', onMessage);
	});
}
