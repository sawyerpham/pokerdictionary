// The postflop spots the flop libraries cover, and the flops they cover, for scripts/compute.ts. Ranges come from the
// site's charts: the opening ranges, and src/engine/facing.ts for calls, 3-bets and 4-bets. Chips are tenths of a bb.
import { SPOTS as FACING } from '../src/engine/facing.ts';
import { HANDS } from '../src/engine/pushfold.ts';
import type { Weights } from '../src/engine/ranges.ts';
import { expandRange, RFI } from '../src/guides/rfi.ts';

export interface Pack {
  key: string;
  title: string;
  type: 'srp' | '3bet' | '4bet';
  seats: [string, string]; // out of position, in position
  pot: number;
  stack: number;
  oop: Weights;
  ip: Weights;
  oopBets: string; // per street, "flop|turn|river"
  oopRaises: string;
  ipBets: string;
  ipRaises: string;
  live: { bets: string; raises: string }; // the trainer's live turn and river solves
}

const BLINDS = ['SB', 'BB'];
const weights = (f: (h: string, i: number) => number): Weights => Object.fromEntries(HANDS.map((h, i) => [h, f(h, i)]));

/** A pot between an opener O and a player R behind them: single-raised (R called), 3-bet (O called) or 4-bet (R called). */
export function pack(type: Pack['type'], O: string, R: string, deep = false): Pack {
  const s = FACING[`${O}-${R}`];
  const [vsOpen, vs3, vs4] = s.nodes.map((n) => n.freq);
  const opens = expandRange(RFI.find((r) => r.seat === O)!.range);
  const opened = (h: string) => (opens.has(h) ? 1 : 0);
  const each = { srp: s.open, '3bet': s.threeBet, '4bet': s.fourBet }[type];
  const dead = (O !== 'SB' && R !== 'SB' ? 0.5 : 0) + (R !== 'BB' ? 1 : 0);
  const ranges = {
    srp: [weights(opened), weights((_, i) => vsOpen[1][i] / 100)],
    '3bet': [weights((h, i) => (opened(h) * vs3[1][i]) / 100), weights((_, i) => vsOpen[2][i] / 100)],
    '4bet': [weights((h, i) => (opened(h) * vs3[2][i]) / 100), weights((_, i) => (vsOpen[2][i] * vs4[1][i]) / 10000)],
  }[type];
  // After the flop the blinds act first, except that the small blind is out of position to the big blind.
  const rIp = !BLINDS.includes(R) || O === 'SB';
  const [oop, ip] = rIp ? [ranges[0], ranges[1]] : [ranges[1], ranges[0]];
  const aggressorIp = (type === '3bet') === rIp; // the last raiser: the opener in single-raised and 4-bet pots
  // One size a street; raises only on the flop in single-raised pots (deeper raise wars don't fit in memory).
  // The player who called before the flop checks to the raiser on the flop.
  const raises = type === 'srp' ? '3x||' : '3x|3x|3x';
  const sizes = deep
    ? { bets: '33%,75%|50%,100%|50%,100%', raises: '3x|3x|3x' }
    : { bets: '33%|66%|75%', raises };
  const callerBets = sizes.bets.replace(/^[^|]*/, '');
  const title = {
    srp: `${O} opens, ${R} calls`,
    '3bet': `${R} 3-bets, ${O} calls`,
    '4bet': `${O} 4-bets, ${R} calls`,
  }[type];
  return {
    key: `${deep ? 'deep' : type}-${O}-${R}`,
    title: deep ? `${title} (2 sizes)` : title,
    type,
    seats: rIp ? [O, R] : [R, O],
    pot: Math.round((2 * each + dead) * 10),
    stack: Math.round((100 - each) * 10),
    oop,
    ip,
    oopBets: aggressorIp ? callerBets : sizes.bets,
    oopRaises: sizes.raises,
    ipBets: sizes.bets,
    ipRaises: sizes.raises,
    live: { bets: deep ? '50%,100%|50%,100%' : '66%|75%', raises: '3x|3x' },
  };
}

/** Every pack scripts/compute.ts builds, most common first. */
export const PACKS: Pack[] = [
  pack('srp', 'BTN', 'BB'),
  pack('3bet', 'BTN', 'BB'),
  pack('srp', 'CO', 'BB'),
  pack('srp', 'SB', 'BB'),
  pack('srp', 'UTG', 'BB'),
  pack('srp', 'HJ', 'BB'),
  pack('srp', 'CO', 'BTN'),
  pack('3bet', 'BTN', 'SB'),
  pack('3bet', 'CO', 'BTN'),
  pack('3bet', 'SB', 'BB'),
  pack('4bet', 'BTN', 'BB'),
  pack('4bet', 'CO', 'BTN'),
];
export const DEEP = pack('srp', 'BTN', 'BB', true);

/** Seeded random numbers (mulberry32). */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 1,755 flops that play differently (suits relabeled; postflop-solver card ids), each with how many of the 22,100 it stands for. */
export function allFlops(): { board: number[]; n: number }[] {
  const perms: number[][] = [];
  const perm = (left: number[], acc: number[]) => (left.length ? left.forEach((x, k) => perm([...left.slice(0, k), ...left.slice(k + 1)], [...acc, x])) : perms.push(acc));
  perm([0, 1, 2, 3], []);
  const count = new Map<string, number>();
  for (let a = 0; a < 52; a++)
    for (let b = a + 1; b < 52; b++)
      for (let c = b + 1; c < 52; c++) {
        const key = perms.map((p) => [a, b, c].map((x) => (x & ~3) | p[x & 3]).sort((x, y) => x - y).join('-')).sort()[0];
        count.set(key, (count.get(key) ?? 0) + 1);
      }
  return [...count].map(([k, n]) => ({ board: k.split('-').map(Number), n }));
}

/** `count` flops drawn in proportion to how often each comes, without repeats, always the same ones. */
export function someFlops(count: number) {
  const pool = allFlops(), random = rng(7), out: { board: number[]; n: number }[] = [];
  while (out.length < count && pool.length) {
    let r = random() * pool.reduce((a, f) => a + f.n, 0), k = 0;
    while ((r -= pool[k].n) > 0) k++;
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
