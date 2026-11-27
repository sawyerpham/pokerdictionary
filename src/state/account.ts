// Who's signed in, and syncing the saved browser stores to their account. The newest copy of each store wins.
import { create } from 'zustand';
import { useSettings } from './settingsStore';
import { useStudy } from './studyStore';

export type Role = 'default' | 'premium' | 'admin' | 'owner';
export const ROLE_LABEL: Record<Role, string> = { default: 'Default', premium: 'Premium', admin: 'Admin', owner: 'Owner' };
const RANK: Record<Role, number> = { default: 0, premium: 1, admin: 2, owner: 3 };
/** Each account type includes everything below it. */
export const atLeast = (me: Me | null | undefined, role: Role) => !!me && RANK[me.role] >= RANK[role];

export interface Me {
  email: string;
  name: string | null;
  role: Role;
}

interface Account {
  me?: Me | null; // undefined while loading
  providers: { google: boolean; email: boolean; coach: boolean };
  pulled: number; // goes up when newer data arrives from the account, so open tools reload it
}

export const useAccount = create<Account>(() => ({ providers: { google: false, email: false, coach: false }, pulled: 0 }));

const STORES = [useStudy, useSettings];
const changedAt = (name: string) => `sync-at:${name}`;
const seen = new Map<string, string | null>(); // each store's saved text as last synced or edited
const timers = new Map<string, number>();

async function push(name: string) {
  const data = localStorage.getItem(name);
  if (!useAccount.getState().me || data === null) return;
  await fetch(`/api/sync/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, at: Number(localStorage.getItem(changedAt(name)) ?? 0) }),
  }).catch(() => {}); // offline: the next change or page load sends it
}

// Note real edits (signed in or not) with a time, so the newest copy wins; send them when signed in.
for (const store of STORES) {
  const name = store.persist.getOptions().name!;
  seen.set(name, localStorage.getItem(name));
  store.subscribe(() => {
    // Listeners run before the store is written to localStorage, so look a moment later.
    clearTimeout(timers.get(name));
    timers.set(
      name,
      window.setTimeout(() => {
        const now = localStorage.getItem(name);
        if (now === seen.get(name)) return;
        seen.set(name, now);
        localStorage.setItem(changedAt(name), String(Date.now()));
        void push(name);
      }, 1000),
    );
  });
}

async function pull() {
  const server: Record<string, { data: string; at: number }> = await (await fetch('/api/sync')).json();
  for (const store of STORES) {
    const name = store.persist.getOptions().name!;
    const theirs = server[name], mine = Number(localStorage.getItem(changedAt(name)) ?? 0);
    if (theirs && theirs.at > mine) {
      localStorage.setItem(name, theirs.data);
      localStorage.setItem(changedAt(name), String(theirs.at));
      await store.persist.rehydrate();
      seen.set(name, localStorage.getItem(name)); // loading it isn't an edit
      useAccount.setState((s) => ({ pulled: s.pulled + 1 }));
    } else if (localStorage.getItem(name) !== null && mine > (theirs?.at ?? 0)) {
      await push(name);
    }
  }
}

/** On page load and after signing in: who's signed in, which sign-ins exist, then sync. */
export async function loadAccount() {
  try {
    const [providers, res] = await Promise.all([fetch('/api/auth/providers').then((r) => r.json()), fetch('/api/me')]);
    const me: Me | null = res.ok ? await res.json() : null;
    useAccount.setState({ providers, me });
    if (me) await pull();
  } catch {
    useAccount.setState({ me: null }); // no server (e.g. `npm run dev` alone): accounts just don't show
  }
}

export async function signOut() {
  await fetch('/api/logout', { method: 'POST' });
  useAccount.setState({ me: null });
}

export async function deleteAccount() {
  await fetch('/api/me', { method: 'DELETE' });
  useAccount.setState({ me: null });
}
