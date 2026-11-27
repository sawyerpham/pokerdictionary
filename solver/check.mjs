// Solves a river spot with the built WebAssembly (src/solver/pkg) and checks the output makes sense.
import { readFileSync } from 'node:fs';
import { initSync, River } from '../src/solver/pkg/postflop_wasm.js';

initSync({ module: readFileSync(new URL('../src/solver/pkg/postflop_wasm_bg.wasm', import.meta.url)) });

const ok = (cond, msg) => {
  if (!cond) throw new Error(`solver check failed: ${msg}`);
};
// Solver card ids: 4 * rank + suit (c d h s); index of a pair lo < hi is lo * (101 - lo) / 2 + hi - 1.
const id = (s) => '23456789TJQKA'.indexOf(s[0]) * 4 + 'cdhs'.indexOf(s[1]);
const range = (hands) => {
  const r = new Float32Array(1326);
  for (const h of hands) {
    const [lo, hi] = [id(h.slice(0, 2)), id(h.slice(2))].sort((a, b) => a - b);
    r[(lo * (101 - lo)) / 2 + hi - 1] = 1;
  }
  return r;
};

// Board Ks 8d 5c 2h 3s. OOP holds only bluff-catchers (Kh Qc); IP is polar: nut sets (8c 8h) or air (Jd Td).
const river = new River(range(['KhQc']), range(['8c8h', 'JdTd']), ['Ks', '8d', '5c', '2h', '3s'].map(id), 100, 1000, '100%', '', '100%', '');
const t = performance.now();
const exploit = river.solve(1000, 0.1);
const ms = performance.now() - t;
ok(exploit < 0.5, `exploitability ${exploit}`);

river.go([0]); // OOP checks
ok(river.player() === 1 && river.actions() === 'Check,Bet:100', `IP actions ${river.actions()}`);
const hands = [...river.hands(1)];
const s = river.strategy(); // action-major: [check..., bet...]
const set = hands[0] === id('8c') || hands[1] === id('8c') ? 0 : 1;
ok(s[1 * 2 + set] > 0.99, `nut set always bets, got ${s[2 + set]}`);
// A pot-size bet gives 2:1, so in equilibrium IP bluffs half as often as it value-bets.
ok(Math.abs(s[2 + (1 - set)] - 0.5) < 0.05, `air bluffs half the time, got ${s[2 + (1 - set)]}`);
river.go([0, 1]); // IP bets; OOP calls 1/2 of the time to keep the bluffs indifferent
const call = river.strategy()[1];
ok(Math.abs(call - 0.5) < 0.05, `bluff-catcher calls half the time, got ${call}`);
// The trainer grades by these per-action EVs, so folding (0) and calling must come out equal here.
const [foldEv, callEv] = river.action_evs();
ok(foldEv === 0 && Math.abs(callEv) < 1, `indifferent call EV ${callEv} vs fold ${foldEv}`);
console.log(`solver check passed (${ms.toFixed(0)} ms)`);
