// Turning solver output into what the river tools show.
import { handName, type Card } from '../engine/cards';
import { solverCard } from '../engine/ranges';
import type { NodeInfo } from '../solver/client';

export const PLAYER = ['OOP', 'IP'];

/** Default tree: two bet sizes, raises to 2.5x. Pot and stack in chips. */
export const DEFAULTS = { pot: 100, stack: 400, bets: '50%, 100%', raises: '2.5x' };

/** Fold blue, check and call green, bets and raises red, darker for bigger. */
export function actionColors(actions: string[]): string[] {
  const reds = ['#e8746b', '#d25f56', '#bd4238', '#a1221b', '#7d1712'];
  let k = 0;
  return actions.map((a) => (a === 'Fold' ? '#3987e5' : a === 'Check' || a === 'Call' ? '#3a9450' : reds[Math.min(reds.length - 1, k++)]));
}

/** A player's hands as this site's cards, in solver order. */
export const holesOf = (hands: number[]): Card[][] =>
  Array.from({ length: hands.length / 2 }, (_, i) => [solverCard(hands[2 * i]), solverCard(hands[2 * i + 1])]);

export interface ClassRow {
  weight: number; // combos of this class still in
  mix: number[]; // share of each action, weighted by combos (empty if this player isn't acting)
  ev: number;
  combos: { hole: Card[]; weight: number; mix: number[]; ev: number }[];
}

/** The acting player's (or `player`'s) strategy and EV, by starting-hand class. */
export function byClass(node: NodeInfo, holes: Card[][], player: number): Map<string, ClassRow> {
  const n = holes.length, acting = node.player === player && node.strategy;
  const out = new Map<string, ClassRow>();
  holes.forEach((hole, i) => {
    const weight = node.weights[player][i];
    if (weight <= 0) return;
    const mix = acting ? node.actions.map((_, a) => node.strategy![a * n + i]) : [];
    const ev = node.ev[player][i];
    const h = handName(hole);
    const row = out.get(h) ?? { weight: 0, mix: mix.map(() => 0), ev: 0, combos: [] };
    row.combos.push({ hole, weight, mix, ev });
    row.weight += weight;
    row.ev += weight * ev;
    mix.forEach((x, a) => (row.mix[a] += weight * x));
    out.set(h, row);
  });
  for (const row of out.values()) {
    row.ev /= row.weight;
    row.mix = row.mix.map((x) => x / row.weight);
  }
  return out;
}

/** How often the acting player's whole range takes each action. */
export function rangeMix(node: NodeInfo): number[] {
  if (!node.strategy) return [];
  const w = node.weights[node.player], n = w.length;
  const total = w.reduce((a, x) => a + x, 0);
  return node.actions.map((_, a) => w.reduce((s, x, i) => s + x * node.strategy![a * n + i], 0) / total);
}

/** CSS background: stripes left to right in proportion to each action. */
export function mixBackground(mix: number[], colors: string[]): string {
  let at = 0;
  const stops = mix.map((x, a) => `${colors[a]} ${at * 100}% ${(at += x) * 100}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
