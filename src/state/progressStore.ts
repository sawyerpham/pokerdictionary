// Every drill answer and trainer decision, for the Progress page. Synced to your account like your other saves.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PreflopResult {
  t: number;
  players: number;
  seat: string;
  hand: string; // "AKo"
  right: boolean;
}
export interface EquityResult {
  t: number;
  street: number; // board cards: 3 flop, 4 turn, 5 river
  off: number; // points between your guess and the real equity
}
export interface TrainerResult {
  t: number;
  street: number; // 3 flop, 4 turn, 5 river
  seat: number; // 0 OOP, 1 IP
  facing: boolean; // facing a bet (calling was an option)
  chose: string; // action kind: Fold, Check, Call, Bet, Raise, AllIn
  best: string;
  loss: number; // % of the starting pot given up
}
export interface PushFoldResult {
  t: number;
  stack: number; // bb
  seat: 'SB' | 'BB';
  hand: string;
  right: boolean;
  loss: number; // bb given up against the equilibrium
}

export interface PotOddsResult {
  t: number;
  street: number; // 3 flop, 4 turn
  right: boolean;
  loss: number; // bb given up by the wrong choice
}
export interface FacingResult {
  t: number;
  spot: string; // "BTN-BB": opener, then the player who acted second
  node: number; // 0 facing the open, 1 facing a 3-bet, 2 facing a 4-bet, 3 facing an all-in
  seat?: string; // whose decision it was
  stack?: number; // bb; 100 if missing
  hand: string;
  chose: string;
  best: string;
  right: boolean;
  loss: number; // bb
}

export interface QuizResult {
  t: number;
  chart: string; // "open-BTN", "3bet-BTN-BB", "play-BTN-BB"
  score: number; // 0..1, share of combos right
}

export interface DailyResult {
  t: number;
  date: string; // "2026-11-27", UTC
  loss: number; // % of the pot given up
}

interface Progress {
  preflop: PreflopResult[];
  equity: EquityResult[];
  trainer: TrainerResult[];
  pushfold: PushFoldResult[];
  potodds: PotOddsResult[];
  facing: FacingResult[];
  quiz: QuizResult[];
  daily: DailyResult[];
  add: <K extends Kind>(kind: K, result: Omit<Progress[K][number], 't'>) => void;
  clear: () => void;
}
type Kind = 'preflop' | 'equity' | 'trainer' | 'pushfold' | 'potodds' | 'facing' | 'quiz' | 'daily';

const KEEP = 500; // newest results per tool, so the synced copy stays small

export const useProgress = create<Progress>()(
  persist(
    (set) => ({
      preflop: [],
      equity: [],
      trainer: [],
      pushfold: [],
      potodds: [],
      facing: [],
      quiz: [],
      daily: [],
      add: (kind, result) => set((s) => ({ [kind]: [...s[kind], { ...result, t: Date.now() }].slice(-KEEP) })),
      clear: () => set({ preflop: [], equity: [], trainer: [], pushfold: [], potodds: [], facing: [], quiz: [], daily: [] }),
    }),
    { name: 'pokerdictionary-progress', partialize: ({ preflop, equity, trainer, pushfold, potodds, facing, quiz, daily }) => ({ preflop, equity, trainer, pushfold, potodds, facing, quiz, daily }) },
  ),
);

/** Records a result without subscribing the caller to the store. */
export const record: Progress['add'] = (kind, result) => useProgress.getState().add(kind, result);
