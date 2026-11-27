// Flop Review: your flop decisions from hand histories, graded against the flop libraries when the pot, the seats and
// the flop (up to suits) are in one. Bet and raise sizes are matched by kind, since each library has one size.
import type { Hand } from '../engine/history';
import { solverCard } from '../engine/ranges';
import { flopNode, loadFlop, loadPack, loadPacks, type Library } from '../solver/library';

export interface Reviewed {
  hand: Hand;
  pack: string;
  decisions: { actions: string[]; chosen: number; freq: number[]; loss: number }[]; // loss: % of the pot, NaN if not graded
  stopped?: string; // why the review ended before the flop did
}

const PERMS: number[][] = [];
const permute = (left: number[], acc: number[]) => (left.length ? left.forEach((x, k) => permute([...left.slice(0, k), ...left.slice(k + 1)], [...acc, x])) : PERMS.push(acc));
permute([0, 1, 2, 3], []);

/** The library's name for a flop (scripts/spots.ts allFlops picks the same one) and the suit relabeling that gets there. */
export function canonical(board: number[]) {
  return PERMS.map((p) => ({ key: board.map((c) => (c & ~3) | p[c & 3]).sort((a, b) => a - b).join('-'), p })).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))[0];
}

const KIND = { check: 'Check', call: 'Call', fold: 'Fold', bet: 'Bet', raise: 'Raise' } as const;

export async function reviewFlops(hands: Hand[]): Promise<Reviewed[]> {
  const packs = new Set((await loadPacks()).map((p) => p.key));
  const cache = new Map<string, Promise<Library>>();
  const out: Reviewed[] = [];
  for (const hand of hands) {
    const f = hand.flop;
    if (!f || !packs.has(f.pack)) continue;
    const { key, p } = canonical(f.board.map(solverCard));
    const pack = await loadPack(f.pack);
    if (!pack.files.some((x) => x.file === `${key}.json`)) continue;
    const id = `${f.pack}/${key}`;
    if (!cache.has(id)) cache.set(id, loadFlop(f.pack, { file: `${key}.json`, keepSuits: true }));
    const lib = await cache.get(id)!;
    const me = pack.seats.indexOf(hand.position);
    const mine = hand.hole.map((c) => (solverCard(c) & ~3) | p[solverCard(c) & 3]);
    const at = lib.hands[me].findIndex((_, i) => i % 2 === 0 && mine.includes(lib.hands[me][i]) && mine.includes(lib.hands[me][i + 1]));
    const idx = at < 0 ? -1 : at / 2;
    const review: Reviewed = { hand, pack: f.pack, decisions: [] };
    let history: number[] = [];
    for (const act of f.acts) {
      const node = flopNode(lib, history);
      if (node.player !== 0 && node.player !== 1) break;
      // The first action of the same kind; a bet or raise can also be the library's all-in.
      const k = node.actions.findIndex((a) => a.startsWith(KIND[act.kind]) || (/bet|raise/.test(act.kind) && a.startsWith('AllIn')));
      if (k < 0 || (node.player === me) !== act.mine) {
        review.stopped = `the library has no ${act.kind} here`;
        break;
      }
      if (act.mine && idx >= 0) {
        const n = lib.hands[me].length / 2;
        const evs = node.actions.map((_, a) => node.actionEvs![a * n + idx]);
        const reached = node.weights[me][idx] > 0;
        review.decisions.push({
          actions: node.actions,
          chosen: k,
          freq: node.actions.map((_, a) => node.strategy![a * n + idx]),
          loss: reached ? ((Math.max(...evs) - evs[k]) / pack.pot) * 100 : NaN,
        });
      }
      history = [...history, k];
    }
    if (review.decisions.length || review.stopped) out.push(review);
  }
  return out;
}
