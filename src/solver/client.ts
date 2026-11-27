// Talks to the solver worker. Cards here are postflop-solver ids (see solverCard in engine/ranges.ts).

export interface SpotConfig {
  oop: Float32Array; // 1326 weights each, from solverRange()
  ip: Float32Array;
  board: number[]; // four cards (turn spot) or five (river spot)
  pot: number;
  stack: number; // effective stack behind
  oopBets: string; // e.g. "33%, 75%"; used on every street
  oopRaises: string; // e.g. "2.5x"
  ipBets: string;
  ipRaises: string;
}

/** One node of the solved tree. Per-hand arrays follow `Solved.hands[player]`; action ones are action-major. */
export interface NodeInfo {
  history: number[]; // action indices, or card ids where a card was dealt
  player: number; // 0 OOP, 1 IP, 2 the river is dealt, -1 the hand is over
  actions: string[]; // "Check", "Bet:50", "Raise:150", "AllIn:400", "Call", "Fold"
  cards: number[]; // when player is 2: the rivers that can come
  board: number[];
  bets: number[]; // each player's chips in since the start of the spot
  weights: Float32Array[]; // combos of each hand still in, by player
  ev: Float32Array[];
  equity: Float32Array[];
  strategy?: Float32Array; // the acting player's
  actionEvs?: Float32Array;
}

export interface Solved {
  exploitability: number; // chips
  iterations: number;
  memoryMb: number;
  ms: number;
  hands: number[][]; // by player: [a0, b0, a1, b1, ...]
  root: NodeInfo;
}

export interface Progress {
  iterations: number;
  exploitability: number; // chips
}

export type Request = { id: number } & ({ type: 'solve'; spot: SpotConfig } | { type: 'node'; history: number[] } | { type: 'stop' });

let worker: Worker | undefined;
const waiting = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void; progress?: (p: Progress) => void }>();
let nextId = 0;

function send(msg: { type: 'solve'; spot: SpotConfig } | { type: 'node'; history: number[] } | { type: 'stop' }, progress?: (p: Progress) => void) {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const p = waiting.get(data.id);
      if (!p) return;
      if (data.progress) return p.progress?.(data.progress);
      waiting.delete(data.id);
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.result as never);
    };
  }
  const id = nextId++;
  worker.postMessage({ ...msg, id } as Request);
  return { id, progress };
}

function call<T>(msg: { type: 'solve'; spot: SpotConfig } | { type: 'node'; history: number[] }, progress?: (p: Progress) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { id } = send(msg, progress);
    waiting.set(id, { resolve, reject, progress });
  });
}

/** Solves until close enough (or `stopSolving()`), reporting progress every few iterations. */
export const solveSpot = (spot: SpotConfig, progress?: (p: Progress) => void) => call<Solved>({ type: 'solve', spot }, progress);
/** Ends the running solve early; it resolves with what it has. */
export const stopSolving = () => void send({ type: 'stop' });
export const nodeAt = (history: number[]) => call<NodeInfo>({ type: 'node', history });

/** "Bet:50" -> "Bet 50", "Raise:150" -> "Raise to 150". */
export const actionLabel = (a: string) => {
  const [kind, n] = a.split(':');
  return n === undefined ? kind : kind === 'Raise' ? `Raise to ${n}` : kind === 'AllIn' ? `All-in ${n}` : `${kind} ${n}`;
};
