// A range is a weight from 0 to 1 for each of the 169 starting-hand classes ("AKs", "QQ", "72o"); missing = 0.
import { handName, outlook, type Card, type Rng } from './cards.ts';

export type Weights = Record<string, number>;

const COMBOS: Card[][] = [];
for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) COMBOS.push([a, b]);

export const combosOf = (h: string) => (h.length === 2 ? 6 : h[2] === 's' ? 4 : 12);

/** Share of all 1326 combos the range holds, 0..1. */
export const rangeShare = (w: Weights) => Object.entries(w).reduce((n, [h, x]) => n + x * combosOf(h), 0) / 1326;

/** The range's combos that don't use a dead card, with their weights. */
export function combosIn(w: Weights, dead: Card[] = []): { hole: Card[]; weight: number }[] {
  const d = new Set(dead);
  return COMBOS.filter(([a, b]) => !d.has(a) && !d.has(b))
    .map((hole) => ({ hole, weight: w[handName(hole)] ?? 0 }))
    .filter((x) => x.weight > 0);
}

/** postflop-solver's id for a card: the same rank layout, with suits c d h s where this site has ♠ ♥ ♦ ♣. Its own inverse. */
export const solverCard = (c: Card) => c ^ 3;

/** The 1326 weights postflop-solver takes, indexed by its card ids lo < hi as lo * (101 - lo) / 2 + hi - 1. */
export function solverRange(w: Weights): Float32Array {
  const out = new Float32Array(1326);
  for (const [a, b] of COMBOS) {
    const [lo, hi] = [solverCard(a), solverCard(b)].sort((x, y) => x - y);
    out[(lo * (101 - lo)) / 2 + hi - 1] = w[handName([a, b])] ?? 0;
  }
  return out;
}

/** Share of the pot `hole` wins against the range on this board, ties split: outlook() against each combo, weighted. */
export function equityVsRange(hole: Card[], board: Card[], w: Weights, dealsPerCombo = 40, rng: Rng = Math.random): number {
  let sum = 0, total = 0;
  for (const { hole: v, weight } of combosIn(w, [...hole, ...board])) {
    sum += weight * outlook([hole, v], board, 0, board.length === 5 ? 1 : dealsPerCombo, rng).equity[0];
    total += weight;
  }
  return total ? sum / total : NaN;
}

/** Index picked with chance proportional to its weight; -1 if every weight is 0. */
export function pickWeighted(weights: ArrayLike<number>, rng: Rng = Math.random): number {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) if (weights[i] > 0 && (r -= weights[i]) < 0) return i;
  return total > 0 ? weights.length - 1 : -1;
}
