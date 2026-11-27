// Runs postflop-solver (WebAssembly) off the main thread. Holds one solved spot at a time.
import init, { Spot } from './pkg/postflop_wasm.js';
import type { NodeInfo, Request } from './client';

const ready = init();
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
  await ready;
  try {
    if (data.type === 'solve') {
      const c = data.spot;
      active = data.id;
      stopped = false;
      const started = performance.now();
      const s = new Spot(c.oop, c.ip, c.board, c.pot, c.stack, c.oopBets, c.oopRaises, c.ipBets, c.ipRaises);
      // Close enough: 0.2% of the pot on the river, 0.5% from the turn (it has many more nodes to settle).
      const target = c.pot * (c.board.length === 5 ? 0.002 : 0.005);
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
      postMessage({ id: data.id, result: { exploitability, iterations, memoryMb: s.memory_mb(), ms: performance.now() - started, hands, root: node([]) } });
    } else {
      if (!spot) throw new Error('Nothing solved yet');
      postMessage({ id: data.id, result: node(data.history) });
    }
  } catch (e) {
    postMessage({ id: data.id, error: e instanceof Error ? e.message : String(e) });
  }
};
