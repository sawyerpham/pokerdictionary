import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card } from '../engine/cards';
import type { Weights } from '../engine/ranges';
import { expandRange, RFI } from '../guides/rfi';

export interface SavedRange {
  name: string;
  weights: Weights;
}

/** A preflop drill question you got wrong, asked again until you get it right. */
export interface Miss {
  players: number;
  seat: string;
  hole: Card[];
}

interface Study {
  ranges: SavedRange[];
  misses: Miss[];
  saveRange: (r: SavedRange) => void;
  deleteRange: (name: string) => void;
  setMisses: (m: Miss[]) => void;
}

// Start with the opening charts the guides use, so every tool has ranges before you build your own.
const CHARTS: SavedRange[] = RFI.map((r) => ({
  name: `${r.seat} open`,
  weights: Object.fromEntries([...expandRange(r.range)].map((h) => [h, 1])),
}));

export const useStudy = create<Study>()(
  persist(
    (set) => ({
      ranges: CHARTS,
      misses: [],
      saveRange: (r) => set((s) => ({ ranges: [...s.ranges.filter((x) => x.name !== r.name), r] })),
      deleteRange: (name) => set((s) => ({ ranges: s.ranges.filter((x) => x.name !== name) })),
      setMisses: (misses) => set({ misses }),
    }),
    { name: 'pokerdictionary-study' },
  ),
);

export const findRange = (ranges: SavedRange[], name: string) => ranges.find((r) => r.name === name)?.weights ?? {};
