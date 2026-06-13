import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './apiUrl';

const isWeb = Platform.OS === 'web';

let _token: string | null = isWeb ? (typeof localStorage !== 'undefined' ? localStorage.getItem('ns:token') : null) : null;
let _username: string | null = isWeb ? (typeof localStorage !== 'undefined' ? localStorage.getItem('ns:username') : null) : null;
let _userId: string | null = isWeb ? (typeof localStorage !== 'undefined' ? localStorage.getItem('ns:userId') : null) : null;

// Promise that resolves once the native session has been restored from AsyncStorage.
// On web it resolves immediately since localStorage is synchronous.
let _sessionRestored: Promise<void>;
if (isWeb) {
  _sessionRestored = Promise.resolve();
} else {
  _sessionRestored = Promise.all([
    AsyncStorage.getItem('ns:token'),
    AsyncStorage.getItem('ns:userId'),
    AsyncStorage.getItem('ns:username'),
  ]).then(([t, u, n]) => {
    if (t) _token = t;
    if (u) _userId = u;
    if (n) _username = n;
  });
}

export function restoreSession(): Promise<void> { return _sessionRestored; }

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
  if (isWeb && typeof localStorage !== 'undefined') {
    localStorage.setItem('ns:token', token);
    localStorage.setItem('ns:userId', userId);
    localStorage.setItem('ns:username', username);
  } else {
    AsyncStorage.setItem('ns:token', token);
    AsyncStorage.setItem('ns:userId', userId);
    AsyncStorage.setItem('ns:username', username);
  }
}

export function clearSession() {
  _token = null;
  _userId = null;
  _username = null;
  if (isWeb && typeof localStorage !== 'undefined') {
    localStorage.removeItem('ns:token');
    localStorage.removeItem('ns:userId');
    localStorage.removeItem('ns:username');
  } else {
    AsyncStorage.removeItem('ns:token');
    AsyncStorage.removeItem('ns:userId');
    AsyncStorage.removeItem('ns:username');
  }
}

export function getToken(): string | null {
  if (isWeb && typeof localStorage !== 'undefined') {
    return _token || localStorage.getItem('ns:token');
  }
  return _token;
}
export function getUsername(): string | null {
  if (isWeb && typeof localStorage !== 'undefined') {
    return _username || localStorage.getItem('ns:username');
  }
  return _username;
}
export function getUserId(): string | null {
  if (isWeb && typeof localStorage !== 'undefined') {
    return _userId || localStorage.getItem('ns:userId');
  }
  return _userId;
}
export function isLoggedIn(): boolean { return !!getToken(); }

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
