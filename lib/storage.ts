import { NorthStar, Milestone, Supporter, Goal } from './types';
import { API } from './apiUrl';
import { getToken } from './auth';

const KEYS = {
  NORTH_STAR:   'northstar:goal',
  MILESTONES:   'northstar:milestones',
  SUPPORTERS:   'northstar:supporters',
  PROFILE_IMAGE:'northstar:profileImage',
  GOALS:        'northstar:goals',
  GOAL_IMAGE:   'northstar:goalImage',
};

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

const TIMEOUT_MS = 4000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const res  = await fetchWithTimeout(
      `${API}/api/storage/${encodeURIComponent(key)}`,
      { headers: authHeaders() }
    );
    const json = await res.json();
    return json.value ?? null;
  } catch {
    return null;
  }
}

async function setItem(key: string, value: unknown): Promise<void> {
  try {
    await fetchWithTimeout(`${API}/api/storage/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ value }),
    });
  } catch {
    // best-effort write — silent fail
  }
}

export async function getNorthStar(): Promise<NorthStar | null>          { return getItem<NorthStar>(KEYS.NORTH_STAR); }
export async function saveNorthStar(ns: NorthStar): Promise<void>        { await setItem(KEYS.NORTH_STAR, ns); }

export async function getMilestones(): Promise<Milestone[]>              { return (await getItem<Milestone[]>(KEYS.MILESTONES)) ?? []; }
export async function saveMilestones(ms: Milestone[]): Promise<void>     { await setItem(KEYS.MILESTONES, ms); }

export async function getGoals(): Promise<Goal[]>                        { return (await getItem<Goal[]>(KEYS.GOALS)) ?? []; }
export async function saveGoals(goals: Goal[]): Promise<void>            { await setItem(KEYS.GOALS, goals); }

export async function getSupporters(): Promise<Supporter[]>              { return (await getItem<Supporter[]>(KEYS.SUPPORTERS)) ?? []; }
export async function saveSupporters(s: Supporter[]): Promise<void>      { await setItem(KEYS.SUPPORTERS, s); }

export async function getProfileImage(): Promise<string | null>          { return getItem<string>(KEYS.PROFILE_IMAGE); }
export async function saveProfileImage(dataUri: string): Promise<void>   { await setItem(KEYS.PROFILE_IMAGE, dataUri); }

export async function getGoalImage(): Promise<string | null>             { return getItem<string>(KEYS.GOAL_IMAGE); }
export async function saveGoalImage(url: string): Promise<void>          { await setItem(KEYS.GOAL_IMAGE, url); }

export async function clearAll(): Promise<void> {
  const token = getToken();
  await fetch(`${API}/api/storage`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
