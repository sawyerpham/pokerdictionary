import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PRESETS, randomProfile, type Profile } from '../engine/profiles';

export interface Settings {
  sb: number;
  bb: number;
  buyInBb: number; // buy-in for every seat, in big blinds
  npcThinkMs: number; // how long NPCs take to act, before the speed setting
  animations: boolean;
  speed: number; // 0.5 | 1 | 2 | 4
  spectateShowCards: boolean;
  autoRebuy: boolean; // NPCs who bust buy back in
  showPositions: boolean; // UTG, HJ, CO… tags on the seats
  chipColors: Record<number, string>; // by denomination
  chipDesign: ChipDesign;
}

/** Seats at a table, you included. Spectating fills all of them with NPCs. */
export const MAX_PLAYERS = 9;

export type ChipDesign = 'classic' | 'striped' | 'ring' | 'solid';
export const DENOMS = [1000, 500, 100, 25, 5, 1] as const;
/** Standard Las Vegas casino chip colors. */
export const VEGAS_CHIPS: Record<number, string> = {
  1: '#f2f2f7', // white
  5: '#d42a2a', // red
  25: '#1f9d55', // green
  100: '#1c1c1e', // black
  500: '#7d3fc6', // purple
  1000: '#f0b429', // yellow
};
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
  npcThinkMs: 1200,
  animations: true,
  speed: 1,
  spectateShowCards: true,
  autoRebuy: true,
  showPositions: true,
  chipColors: VEGAS_CHIPS,
  chipDesign: 'classic',
};

interface Store {
  settings: Settings;
  /** Who you're playing, clockwise from your left. Not saved: every visit starts heads-up against a random player. */
  opponents: string[];
  custom: Profile[]; // your custom players and the random ones at the table
  update: (patch: Partial<Settings>) => void;
  /** Puts `id` (or a new random player) in opponent `slot`; a slot past the end adds a seat. */
  seat: (slot: number, id?: string) => void;
  unseat: (slot: number) => void;
  saveProfile: (p: Profile) => void;
  deleteProfile: (id: string) => void;
  reset: () => void;
}

/** A random player whose name isn't already at the table. */
function freshRandom(taken: Set<string>): Profile {
  let p = randomProfile();
  for (let tries = 0; taken.has(p.name) && tries < 30; tries++) p = randomProfile();
  return p;
}

/** Random players live only while seated. */
const prune = (custom: Profile[], opponents: string[]) => custom.filter((c) => !c.random || opponents.includes(c.id));

const firstOpponent = randomProfile();

export const useSettings = create<Store>()(
  persist(
    (set) => ({
      settings: DEFAULTS,
      opponents: [firstOpponent.id],
      custom: [firstOpponent],
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      seat: (slot, id) =>
        set((s) => {
          const fresh = id ? undefined : freshRandom(new Set(s.opponents.map((o) => findProfile(o, s.custom).name)));
          const opponents = [...s.opponents];
          opponents[Math.min(slot, opponents.length, MAX_PLAYERS - 1)] = id ?? fresh!.id;
          return { opponents, custom: prune(fresh ? [...s.custom, fresh] : s.custom, opponents) };
        }),
      unseat: (slot) =>
        set((s) => {
          if (s.opponents.length <= 1) return s;
          const opponents = s.opponents.filter((_, i) => i !== slot);
          return { opponents, custom: prune(s.custom, opponents) };
        }),
      saveProfile: (p) =>
        set((s) => ({ custom: s.custom.some((c) => c.id === p.id) ? s.custom.map((c) => (c.id === p.id ? p : c)) : [...s.custom, p] })),
      // Deleting a custom player also takes them off the table.
      deleteProfile: (id) =>
        set((s) => {
          const opponents = s.opponents.filter((o) => o !== id);
          return { custom: s.custom.filter((c) => c.id !== id), opponents: opponents.length ? opponents : s.opponents };
        }),
      reset: () => set({ settings: DEFAULTS }),
    }),
    {
      name: 'poker-settings',
      partialize: (s) => ({ settings: s.settings, custom: s.custom.filter((c) => !c.random) }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Store> | undefined;
        return {
          ...current,
          // Presets aren't editable any more: drop old edits saved under a preset's id.
          custom: [...(p?.custom ?? []).filter((c) => !c.random && !PRESETS.some((x) => x.id === c.id)), firstOpponent],
          settings: { ...DEFAULTS, ...p?.settings, chipColors: { ...VEGAS_CHIPS, ...p?.settings?.chipColors } },
        };
      },
    },
  ),
);

export function findProfile(id: string, custom: Profile[]): Profile {
  return custom.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
