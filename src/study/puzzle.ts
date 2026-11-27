// A single flop decision from a library flop: deal both hands, let the other player act from the solved strategy,
// and stop at your first real choice. Daily Flop and the sizing drill use it.
import type { Card, Rng } from '../engine/cards';
import { pickWeighted } from '../engine/ranges';
import type { NodeInfo } from '../solver/client';
import { BB, flopNode, loadFlop, type Library } from '../solver/library';
import { holesOf } from './spots';

export interface Puzzle {
  lib: Library;
  hero: number; // 0 out of position, 1 in position
  holes: Card[][][];
  heroIdx: number;
  node: NodeInfo;
  log: string[];
}

export const amount = (chips: number) => `${Math.round((chips / BB) * 10) / 10} bb`;
export const label = (a: string) => {
  const [kind, n] = a.split(':');
  return n === undefined ? kind : kind === 'Raise' ? `Raise to ${amount(Number(n))}` : kind === 'AllIn' ? `All-in ${amount(Number(n))}` : `${kind} ${amount(Number(n))}`;
};

/**
 * Deals from `pack` until the hero (`seat`, or either) reaches a decision with a choice on the flop that `wanted`
 * accepts. A lone check plays itself.
 */
export async function puzzle(pack: string, random: Rng, opts: { seat?: number; wanted?: (node: NodeInfo) => boolean } = {}): Promise<Puzzle> {
  for (let tries = 0; tries < 60; tries++) {
    const lib = await loadFlop(pack, { random });
    const hero = opts.seat ?? (random() < 0.5 ? 0 : 1), holes = lib.hands.map(holesOf);
    const heroIdx = pickWeighted(lib.weights[hero], random);
    const mine = new Set(holes[hero][heroIdx]);
    const villainIdx = pickWeighted(Array.from(lib.weights[1 - hero], (w, i) => (holes[1 - hero][i].some((c) => mine.has(c)) ? 0 : w)), random);
    let node = flopNode(lib, []);
    const log: string[] = [];
    for (;;) {
      if (node.player === hero && node.actions.length > 1) {
        if (!opts.wanted || opts.wanted(node)) return { lib, hero, holes, heroIdx, node, log };
        break;
      }
      if (node.player !== 0 && node.player !== 1) break;
      const who = node.player === hero ? 'You' : lib.pack.seats[node.player];
      const step = node.player === hero ? 0 : pickWeighted(node.actions.map((_, k) => node.strategy![k * holes[node.player].length + villainIdx]), random);
      log.push(`${who}: ${label(node.actions[step]).toLowerCase()}`);
      node = flopNode(lib, [...node.history, step]);
    }
  }
  throw new Error('Could not find a spot like that in the library.');
}

/** Your hand's EV and the solver's mix for each action, and the best one. */
export function grade(p: Puzzle) {
  const n = p.holes[p.hero].length, { node } = p;
  const evs = node.actions.map((_, k) => node.actionEvs![k * n + p.heroIdx]);
  const freq = node.actions.map((_, k) => node.strategy![k * n + p.heroIdx]);
  return { evs, freq, best: evs.indexOf(Math.max(...evs)) };
}
