// Talks to the solver worker. Cards here are postflop-solver ids (see solverCard in engine/ranges.ts).

export interface RiverSpot {
  oop: Float32Array; // 1326 weights each, from solverRange()
  ip: Float32Array;
  board: number[]; // five cards
  pot: number;
  stack: number; // effective stack behind
  oopBets: string; // e.g. "50%, 100%"
  oopRaises: string; // e.g. "2.5x"
  ipBets: string;
  ipRaises: string;
}

/** One node of the solved tree. Per-hand arrays follow `Solved.hands[player]`; action ones are action-major. */
export interface NodeInfo {
  history: number[];
  player: number; // 0 OOP, 1 IP, -1 when the hand is over
  actions: string[]; // "Check", "Bet:50", "Raise:150", "AllIn:400", "Call", "Fold"
  bets: number[]; // each player's chips in on the river so far
  weights: Float32Array[]; // combos of each hand still in, by player
  ev: Float32Array[];
  equity: Float32Array[];
  strategy?: Float32Array; // the acting player's
  actionEvs?: Float32Array;
}

export interface Solved {
  exploitability: number; // chips
  ms: number;
  hands: number[][]; // by player: [a0, b0, a1, b1, ...]
  root: NodeInfo;
}

export type Request = { id: number } & ({ type: 'solve'; spot: RiverSpot } | { type: 'node'; history: number[] });

let worker: Worker | undefined;
const waiting = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();
let nextId = 0;

function call<T>(msg: { type: 'solve'; spot: RiverSpot } | { type: 'node'; history: number[] }): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const p = waiting.get(data.id)!;
      waiting.delete(data.id);
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.result as never);
    };
  }
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    worker!.postMessage({ ...msg, id } as Request);
  });
}

export const solveRiver = (spot: RiverSpot) => call<Solved>({ type: 'solve', spot });
export const nodeAt = (history: number[]) => call<NodeInfo>({ type: 'node', history });

/** "Bet:50" -> "Bet 50", "Raise:150" -> "Raise to 150". */
export const actionLabel = (a: string) => {
  const [kind, n] = a.split(':');
  return n === undefined ? kind : kind === 'Raise' ? `Raise to ${n}` : kind === 'AllIn' ? `All-in ${n}` : `${kind} ${n}`;
};
