// Solves river and turn spots with the built WebAssembly (src/solver/pkg) and checks the output makes sense.
import { readFileSync } from 'node:fs';
import { initSync, Spot } from '../src/solver/pkg/postflop_wasm.js';

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
// CFR until the exploitability (chips) is at most `target`, as the worker does it.
function solve(spot, target) {
  let e = spot.exploitability(), i = 0;
  while (e > target && i < 1000) {
    spot.step(i++);
    if (i % 10 === 0) e = spot.exploitability();
  }
  spot.finish();
  return e;
}

const river = new Spot(range(['KhQc']), range(['8c8h', 'JdTd']), ['Ks', '8d', '5c', '2h', '3s'].map(id), 100, 1000, '100%', '', '100%', '');
const t = performance.now();
const exploit = solve(river, 0.1);
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

// Turn: after check-check the river is dealt (a chance node), then OOP acts again with a full strategy.
const turn = new Spot(range(['KhQc', 'AcAd', '7c6c']), range(['8c8h', 'JdTd', 'KcJc']), ['Ks', '8d', '5c', '2h'].map(id), 100, 400, '66%', '2.5x', '66%', '2.5x');
ok(solve(turn, 0.5) <= 0.5, 'turn spot converges');
turn.go([0, 0]);
const rivers = [...turn.cards()];
ok(turn.player() === 2 && rivers.length === 48 && !rivers.includes(id('Ks')), `chance node offers 48 rivers, got ${rivers.length}`);
turn.go([0, 0, id('3s')]);
ok(turn.player() === 0 && turn.board().length === 5 && turn.bets().join() === '0,0', 'river: OOP to act, nothing bet yet');
const n = turn.hands(0).length / 2, strat = turn.strategy(), acts = turn.actions().split(',').length;
for (let i = 0; i < n; i++) {
  if (turn.weights(0)[i] === 0) continue;
  const sum = Array.from({ length: acts }, (_, a) => strat[a * n + i]).reduce((x, y) => x + y, 0);
  ok(Math.abs(sum - 1) < 1e-3, `river strategy of hand ${i} sums to ${sum}`);
}
console.log(`solver check passed (river ${ms.toFixed(0)} ms)`);
