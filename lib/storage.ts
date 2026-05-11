import { NorthStar, Milestone, Supporter } from './types';
import { API } from './apiUrl';

const KEYS = {
  NORTH_STAR: 'northstar:goal',
  MILESTONES: 'northstar:milestones',
  SUPPORTERS: 'northstar:supporters',
};

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/api/storage/${encodeURIComponent(key)}`);
    const json = await res.json();
    return json.value ?? null;
  } catch {
    return null;
  }
}

async function setItem(key: string, value: unknown): Promise<void> {
  await fetch(`${API}/api/storage/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
}

export async function getNorthStar(): Promise<NorthStar | null> {
  return getItem<NorthStar>(KEYS.NORTH_STAR);
}

export async function saveNorthStar(ns: NorthStar): Promise<void> {
  await setItem(KEYS.NORTH_STAR, ns);
}

export async function getMilestones(): Promise<Milestone[]> {
  return (await getItem<Milestone[]>(KEYS.MILESTONES)) ?? [];
}

export async function saveMilestones(milestones: Milestone[]): Promise<void> {
  await setItem(KEYS.MILESTONES, milestones);
}

export async function getSupporters(): Promise<Supporter[]> {
  return (await getItem<Supporter[]>(KEYS.SUPPORTERS)) ?? [];
}

export async function saveSupporters(supporters: Supporter[]): Promise<void> {
  await setItem(KEYS.SUPPORTERS, supporters);
}

export async function clearAll(): Promise<void> {
  await fetch(`${API}/api/storage`, { method: 'DELETE' });
}
