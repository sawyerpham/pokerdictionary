// The flop libraries (public/flops, written by scripts/compute.ts): flop decisions solved ahead of time, since a flop
// takes minutes to solve. Cards are postflop-solver ids. Chips are tenths of a big blind.
import type { NodeInfo } from './client';

export const BB = 10; // chips per big blind

/** One pot the libraries cover, as public/flops/index.json lists it. */
export interface Pack {
  key: string;
  title: string;
  type: 'srp' | '3bet' | '4bet';
  seats: [string, string]; // out of position, in position
  flops: number;
}
interface PackIndex extends Pack {
  pot: number;
  stack: number;
  live: { bets: string; raises: string }; // sizes for the live turn and river solves
  flops: number;
  files: { file: string; n: number }[];
}

interface RawNode {
  h: number[];
  p: number; // 0 OOP, 1 IP, 2 the turn comes, -1 the hand is over (a fold, or an all-in called)
  a?: string;
  b: number[];
  s?: string; // strategy, bytes /255, action-major
  e?: string; // action EVs, int16 hundredths of a big blind, action-major
}
export interface Library {
  pack: PackIndex;
  file: string;
  board: number[];
  hands: number[][]; // by player: [a0, b0, a1, b1, ...]
  weights: Float32Array[]; // starting range, by player
  nodes: Map<string, { p: number; actions: string[]; bets: number[]; strategy?: Float32Array; actionEvs?: Float32Array }>;
}

const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const get = <T,>(url: string): Promise<T> => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load the flop library. Check your connection and try again.'))));

let packs: Promise<Pack[]> | undefined;
/** Every pack with at least one solved flop, most common first. */
export const loadPacks = () => (packs ??= get<Pack[]>('/flops/index.json').then((ps) => ps.filter((p) => p.flops > 0 && !p.key.startsWith('deep')).sort(byCommon)));
const ORDER = ['srp-BTN-BB', '3bet-BTN-BB', 'srp-CO-BB', 'srp-SB-BB'];
const byCommon = (a: Pack, b: Pack) => (ORDER.indexOf(a.key) + 1 || 99) - (ORDER.indexOf(b.key) + 1 || 99);

const indexes = new Map<string, Promise<PackIndex>>();
export function loadPack(key: string): Promise<PackIndex> {
  if (!indexes.has(key)) indexes.set(key, get<Omit<PackIndex, 'files' | 'flops'> & { flops: { file: string; n: number }[] }>(`/flops/${key}/index.json`).then((p) => ({ ...p, files: p.flops, flops: p.flops.length })));
  return indexes.get(key)!;
}

/**
 * One flop of a pack: `file`, or a random one. A library with every flop picks them as often as they come; a sample
 * was already drawn that way. Suits are relabeled at random (the ranges don't care) unless `keepSuits`.
 */
export async function loadFlop(key: string, opts: { file?: string; random?: () => number; keepSuits?: boolean } = {}): Promise<Library> {
  const random = opts.random ?? Math.random;
  const pack = await loadPack(key);
  if (!pack.files.length) throw new Error('This pot has no solved flops yet.');
  let file = opts.file;
  if (!file) {
    const all = pack.files.length >= 1755;
    let r = random() * pack.files.reduce((a, f) => a + (all ? f.n : 1), 0), k = 0;
    while ((r -= all ? pack.files[k].n : 1) > 0 && k < pack.files.length - 1) k++;
    file = pack.files[k].file;
  }
  const raw: { board: number[]; hands: string[]; weights: string[]; nodes: RawNode[] } = await get(`/flops/${key}/${file}`);

  const perm = [0, 1, 2, 3];
  if (!opts.keepSuits)
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
  const card = (c: number) => (c & ~3) | perm[c & 3];
  const nodes: Library['nodes'] = new Map();
  for (const n of raw.nodes) {
    const actions = n.a ? n.a.split(',') : [];
    let strategy: Float32Array | undefined, actionEvs: Float32Array | undefined;
    if (n.s && n.e) {
      const s = bytes(n.s), e = new Int16Array(bytes(n.e).buffer);
      const hands = s.length / actions.length;
      strategy = new Float32Array(s.length);
      for (let i = 0; i < hands; i++) {
        let sum = 0;
        for (let a = 0; a < actions.length; a++) sum += s[a * hands + i];
        for (let a = 0; a < actions.length; a++) strategy[a * hands + i] = sum ? s[a * hands + i] / sum : 1 / actions.length;
      }
      actionEvs = Float32Array.from(e, (x) => x / 10);
    }
    nodes.set(n.h.join(','), { p: n.p, actions, bets: n.b, strategy, actionEvs });
  }
  return {
    pack,
    file,
    board: raw.board.map(card),
    hands: raw.hands.map((h) => [...bytes(h)].map(card)),
    weights: raw.weights.map((w) => Float32Array.from(bytes(w), (x) => x / 255)),
    nodes,
  };
}

/** A flop node in the shape the solver worker returns. Each player's weights follow their own actions on the way here. */
export function flopNode(lib: Library, history: number[]): NodeInfo {
  const n = lib.nodes.get(history.join(','));
  if (!n) throw new Error('That line is not in the flop library');
  const weights = lib.weights.map((w) => w.slice());
  history.forEach((a, k) => {
    const at = lib.nodes.get(history.slice(0, k).join(','))!;
    const w = weights[at.p], hands = w.length;
    for (let i = 0; i < hands; i++) w[i] *= at.strategy![a * hands + i];
  });
  return {
    history,
    player: n.p,
    actions: n.actions,
    cards: [],
    board: lib.board,
    bets: n.bets,
    weights,
    ev: [],
    equity: [],
    strategy: n.strategy,
    actionEvs: n.actionEvs,
  };
}
