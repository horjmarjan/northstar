import { API } from './apiUrl';

// In-memory session — survives navigation, cleared on app restart (forces re-login)
let _token: string | null = null;
let _username: string | null = null;
let _userId: string | null = null;

const AUTH_TIMEOUT_MS = 6000;

function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export function setSession(token: string, userId: string, username: string) {
  _token = token;
  _userId = userId;
  _username = username;
}

export function clearSession() {
  _token = null;
  _userId = null;
  _username = null;
}

export function getToken(): string | null { return _token; }
export function getUsername(): string | null { return _username; }
export function getUserId(): string | null { return _userId; }
export function isLoggedIn(): boolean { return !!_token; }

export async function login(username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await authFetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || 'Login failed' };
    setSession(json.token, json.userId, json.username);
    return { ok: true };
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    return { ok: false, error: isTimeout
      ? `Request timed out — is the server running? (${API})`
      : `Could not connect to server (${API})` };
  }
}

export async function register(username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await authFetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || 'Registration failed' };
    setSession(json.token, json.userId, json.username);
    return { ok: true };
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    return { ok: false, error: isTimeout
      ? `Request timed out — is the server running? (${API})`
      : `Could not connect to server (${API})` };
  }
}
