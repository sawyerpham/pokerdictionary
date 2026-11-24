import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LINEUP, PRESETS, type Profile } from '../engine/profiles';

export interface Settings {
  sb: number;
  bb: number;
  buyInBb: number; // your buy-in
  players: number; // seats at the table including you (2–10)
  lineup: string[]; // profile id for each NPC seat, clockwise from your left
  animations: boolean;
  speed: number; // 0.5 | 1 | 2 | 4
  spectateShowCards: boolean;
  autoRebuy: boolean; // NPCs who bust buy back in
}

export const MAX_PLAYERS = 10;
export const STAKES = [
  { sb: 1, bb: 2 },
  { sb: 2, bb: 5 },
  { sb: 5, bb: 10 },
  { sb: 25, bb: 50 },
  { sb: 100, bb: 200 },
];

const DEFAULTS: Settings = {
  sb: 1,
  bb: 2,
  buyInBb: 100,
  players: 6,
  lineup: DEFAULT_LINEUP,
  animations: true,
  speed: 1,
  spectateShowCards: true,
  autoRebuy: true,
};

interface Store {
  settings: Settings;
  custom: Profile[]; // your own NPCs
  update: (patch: Partial<Settings>) => void;
  saveProfile: (p: Profile) => void;
  deleteProfile: (id: string) => void;
  reset: () => void;
}

export const useSettings = create<Store>()(
  persist(
    (set) => ({
      settings: DEFAULTS,
      custom: [],
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      saveProfile: (p) =>
        set((s) => ({ custom: s.custom.some((c) => c.id === p.id) ? s.custom.map((c) => (c.id === p.id ? p : c)) : [...s.custom, p] })),
      // Deleting an edited preset restores the original; deleting your own player unseats it.
      deleteProfile: (id) =>
        set((s) => ({
          custom: s.custom.filter((c) => c.id !== id),
          settings: PRESETS.some((p) => p.id === id)
            ? s.settings
            : { ...s.settings, lineup: s.settings.lineup.map((x, i) => (x === id ? DEFAULT_LINEUP[i] : x)) },
        })),
      reset: () => set((s) => ({ settings: { ...DEFAULTS, lineup: s.settings.lineup } })),
    }),
    {
      name: 'poker-settings',
      merge: (persisted, current) => {
        const p = persisted as Partial<Store> | undefined;
        return { ...current, custom: p?.custom ?? [], settings: { ...DEFAULTS, ...p?.settings } };
      },
    },
  ),
);

/** Every profile you can seat: presets (with your edits), then your own. Edits to a preset keep its id. */
export const allProfiles = (custom: Profile[]) => [
  ...PRESETS.map((p) => custom.find((c) => c.id === p.id) ?? p),
  ...custom.filter((c) => !PRESETS.some((p) => p.id === c.id)),
];

export function findProfile(id: string, custom: Profile[]): Profile {
  return custom.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
