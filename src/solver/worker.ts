// Runs postflop-solver (WebAssembly) off the main thread. Holds one solved spot at a time. On a cross-origin isolated
// page (the server sends COOP and COEP headers) it loads the build that solves on every core; otherwise one core.
import type { NodeInfo, Request } from './client';

type Wasm = typeof import('./pkg/postflop_wasm.js');
type Spot = InstanceType<Wasm['Spot']>;
const threads = self.crossOriginIsolated && navigator.hardwareConcurrency > 1 ? Math.max(1, navigator.hardwareConcurrency - 1) : 1;
const ready: Promise<Wasm> = (async () => {
  if (threads > 1) {
    const wasm = await import('./pkg-threads/postflop_wasm.js');
    await wasm.default();
    await wasm.initThreadPool(threads);
    return wasm as unknown as Wasm;
  }
  const wasm = await import('./pkg/postflop_wasm.js');
  await wasm.default();
  return wasm;
})();
let spot: Spot | undefined;
let active = -1; // id of the solve in progress; a newer solve replaces it
let stopped = false;

function node(history: number[]): NodeInfo {
  const s = spot!;
  s.go(history);
  const player = s.player();
  const acting = player === 0 || player === 1;
  return {
    history,
    player,
    actions: s.actions() ? s.actions().split(',') : [],
    cards: player === 2 ? [...s.cards()] : [],
    board: [...s.board()],
    bets: [...s.bets()],
    weights: [s.weights(0), s.weights(1)],
    ev: [s.ev(0), s.ev(1)],
    equity: [s.equity(0), s.equity(1)],
    strategy: acting ? s.strategy() : undefined,
    actionEvs: acting ? s.action_evs() : undefined,
  };
}

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  if (data.type === 'stop') {
    stopped = true;
    return;
  }
  const { Spot } = await ready;
  try {
    if (data.type === 'solve') {
      const c = data.spot;
      active = data.id;
      stopped = false;
      const started = performance.now();
      const s = new Spot(c.oop, c.ip, c.board, c.pot, c.stack, c.oopBets, c.oopRaises, c.ipBets, c.ipRaises);
      for (const lock of c.locks ?? []) s.lock(Uint32Array.from(lock.history), lock.strategy);
      // Close enough: 0.2% of the pot on the river, 0.5% on the turn, 1% on the flop (more nodes to settle each street).
      const target = c.pot * [0.01, 0.005, 0.002][c.board.length - 3];
      let exploitability = s.exploitability(), iterations = 0;
      while (exploitability > target && iterations < 1000 && !stopped && active === data.id) {
        s.step(iterations++);
        if (iterations % 10 === 0) {
          exploitability = s.exploitability();
          postMessage({ id: data.id, progress: { iterations, exploitability } });
          await new Promise((r) => setTimeout(r)); // let a stop or a newer solve arrive
        }
      }
      if (active !== data.id) {
        s.free();
        throw new Error('Replaced by a newer solve');
      }
      active = -1;
      s.finish();
      spot?.free();
      spot = s;
      const hands = [0, 1].map((p) => [...s.hands(p)]);
      postMessage({ id: data.id, result: { exploitability, iterations, memoryMb: s.memory_mb(), ms: performance.now() - started, threads, hands, root: node([]) } });
    } else {
      if (!spot) throw new Error('Nothing solved yet');
      postMessage({ id: data.id, result: node(data.history) });
    }
  } catch (e) {
    postMessage({ id: data.id, error: e instanceof Error ? e.message : String(e) });
  }
};
