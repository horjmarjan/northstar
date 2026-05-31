import { NorthStar, Milestone, Supporter, Goal } from './types';
import { API } from './apiUrl';
import { getToken } from './auth';

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
    const res = await fetchWithTimeout(
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

// ─── Multi-North-Star list ─────────────────────────────────────────────────

export async function getNorthStars(): Promise<NorthStar[]> {
  let list = await getItem<NorthStar[]>('northstar:list');
  if (list !== null) return list;

  // One-time migration: convert old single-NS storage to list format
  const old = await getItem<NorthStar>('northstar:goal');
  if (!old) return [];

  const [oldMs, oldGs, oldSup, oldImg] = await Promise.all([
    getItem<Milestone[]>('northstar:milestones'),
    getItem<Goal[]>('northstar:goals'),
    getItem<Supporter[]>('northstar:supporters'),
    getItem<string>('northstar:goalImage'),
  ]);

  list = [old];
  await Promise.all([
    setItem('northstar:list', list),
    setItem('northstar:activeId', old.id),
    oldMs  ? setItem(`northstar:milestones:${old.id}`, oldMs)  : Promise.resolve(),
    oldGs  ? setItem(`northstar:goals:${old.id}`, oldGs)       : Promise.resolve(),
    oldSup ? setItem(`northstar:supporters:${old.id}`, oldSup) : Promise.resolve(),
    oldImg ? setItem(`northstar:goalImage:${old.id}`, oldImg)  : Promise.resolve(),
  ]);

  return list;
}

export async function saveNorthStars(list: NorthStar[]): Promise<void> {
  await setItem('northstar:list', list);
}

export async function getActiveNorthStarId(): Promise<string | null> {
  const id = await getItem<string>('northstar:activeId');
  if (id) return id;
  const list = await getNorthStars();
  if (list.length > 0) {
    await setItem('northstar:activeId', list[0].id);
    return list[0].id;
  }
  return null;
}

export async function setActiveNorthStarId(id: string): Promise<void> {
  await setItem('northstar:activeId', id);
}

// Convenience: returns the active NorthStar object
export async function getNorthStar(): Promise<NorthStar | null> {
  const [list, activeId] = await Promise.all([getNorthStars(), getItem<string>('northstar:activeId')]);
  if (list.length === 0) return null;
  return list.find(ns => ns.id === activeId) ?? list[0];
}

// Upsert a NorthStar into the list (adds if new id, updates if exists)
export async function saveNorthStar(ns: NorthStar): Promise<void> {
  const list = await getNorthStars();
  const idx = list.findIndex(n => n.id === ns.id);
  if (idx >= 0) list[idx] = ns; else list.push(ns);
  await saveNorthStars(list);
}

// Add a brand-new NorthStar and make it active
export async function addNorthStar(ns: NorthStar): Promise<void> {
  const list = await getNorthStars();
  list.push(ns);
  await Promise.all([
    saveNorthStars(list),
    setItem('northstar:activeId', ns.id),
  ]);
}

// ─── Per-North-Star data (all keyed by nsId) ───────────────────────────────

export async function getMilestones(nsId: string): Promise<Milestone[]> {
  return (await getItem<Milestone[]>(`northstar:milestones:${nsId}`)) ?? [];
}
export async function saveMilestones(nsId: string, ms: Milestone[]): Promise<void> {
  await setItem(`northstar:milestones:${nsId}`, ms);
}

export async function getGoals(nsId: string): Promise<Goal[]> {
  return (await getItem<Goal[]>(`northstar:goals:${nsId}`)) ?? [];
}
export async function saveGoals(nsId: string, goals: Goal[]): Promise<void> {
  await setItem(`northstar:goals:${nsId}`, goals);
}

export async function getSupporters(nsId: string): Promise<Supporter[]> {
  return (await getItem<Supporter[]>(`northstar:supporters:${nsId}`)) ?? [];
}
export async function saveSupporters(nsId: string, s: Supporter[]): Promise<void> {
  await setItem(`northstar:supporters:${nsId}`, s);
}

export async function getGoalImage(nsId: string): Promise<string | null> {
  return getItem<string>(`northstar:goalImage:${nsId}`);
}
export async function saveGoalImage(nsId: string, url: string): Promise<void> {
  await setItem(`northstar:goalImage:${nsId}`, url);
}

// ─── Shared (profile image is account-wide, not per-NS) ───────────────────

export async function getProfileImage(): Promise<string | null> {
  return getItem<string>('northstar:profileImage');
}
export async function saveProfileImage(dataUri: string): Promise<void> {
  await setItem('northstar:profileImage', dataUri);
}

// ─── Delete a North Star and its associated data ───────────────────────────

// Removes the NS from the list, clears its keyed data, returns the next active id (or null).
export async function deleteNorthStarAndData(nsId: string): Promise<string | null> {
  const list = await getNorthStars();
  const remaining = list.filter(n => n.id !== nsId);
  const nextId = remaining[0]?.id ?? null;
  await Promise.all([
    saveNorthStars(remaining),
    setItem('northstar:activeId', nextId),
    setItem(`northstar:milestones:${nsId}`, null),
    setItem(`northstar:goals:${nsId}`, null),
    setItem(`northstar:supporters:${nsId}`, null),
    setItem(`northstar:goalImage:${nsId}`, null),
  ]);
  return nextId;
}

// ─── Full account wipe ─────────────────────────────────────────────────────

export async function clearAll(): Promise<void> {
  const token = getToken();
  await fetch(`${API}/api/storage`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
