// Runs postflop-solver (WebAssembly) off the main thread. Holds one solved river spot at a time.
import init, { River } from './pkg/postflop_wasm.js';
import type { NodeInfo, Request } from './client';

const ready = init();
let river: River | undefined;

function node(history: number[]): NodeInfo {
  const r = river!;
  r.go(history);
  const player = r.player();
  return {
    history,
    player,
    actions: r.actions() ? r.actions().split(',') : [],
    bets: [...r.bets()],
    weights: [r.weights(0), r.weights(1)],
    ev: [r.ev(0), r.ev(1)],
    equity: [r.equity(0), r.equity(1)],
    strategy: player >= 0 ? r.strategy() : undefined,
    actionEvs: player >= 0 ? r.action_evs() : undefined,
  };
}

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  await ready;
  try {
    if (data.type === 'solve') {
      const s = data.spot;
      river?.free();
      river = undefined;
      const started = performance.now();
      river = new River(s.oop, s.ip, s.board, s.pot, s.stack, s.oopBets, s.oopRaises, s.ipBets, s.ipRaises);
      const exploitability = river.solve(1000, s.pot * 0.002);
      const hands = [0, 1].map((p) => [...river!.hands(p)]);
      postMessage({ id: data.id, result: { exploitability, ms: performance.now() - started, hands, root: node([]) } });
    } else {
      if (!river) throw new Error('Nothing solved yet');
      postMessage({ id: data.id, result: node(data.history) });
    }
  } catch (e) {
    postMessage({ id: data.id, error: e instanceof Error ? e.message : String(e) });
  }
};
