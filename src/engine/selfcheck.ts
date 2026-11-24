// Engine self-check: `node src/engine/selfcheck.ts`. Throws on the first failure.
import { categoryOf, describe, equity, evaluate, type Card } from './cards.ts';
import { decide } from './bots.ts';
import { act, newTable, pots, startHand, type Table } from './holdem.ts';
import { PRESETS } from './profiles.ts';

const ok = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};
// "As Kd" -> cards
const c = (s: string): Card[] =>
  s.split(' ').map((x) => '23456789TJQKA'.indexOf(x[0]) * 4 + 'shdc'.indexOf(x[1]));

// Evaluator: categories and orderings.
const cases: [string, number][] = [
  ['As Ks Qs Js Ts 2d 3c', 8], ['5h 4h 3h 2h Ah Kd Kc', 8], ['9c 9d 9h 9s 2d 3c 4h', 7],
  ['Kc Kd Kh 7s 7d 2c 3h', 6], ['Ah 9h 6h 3h 2h Kd Kc', 5], ['Ad 2c 3h 4s 5d Kc Kh', 4],
  ['Qc Qd Qh 7s 4d 2c 9h', 3], ['Qc Qd 7h 7s 4d 4c 9h', 2], ['Jc Jd 7h 8s 4d 3c 2h', 1], ['Ac Jd 7h 8s 4d 3c 2h', 0],
];
for (const [hand, cat] of cases) ok(categoryOf(evaluate(c(hand))) === cat, `${hand}: got ${describe(evaluate(c(hand)))}`);
ok(evaluate(c('Ad 2c 3h 4s 5d')) < evaluate(c('2d 3c 4h 5s 6d')), 'wheel loses to six-high straight');
ok(evaluate(c('Ac Ad Kh 7s 4d')) > evaluate(c('Ac Ad Qh Js Td')), 'pair kicker');
ok(evaluate(c('Qc Qd 7h 7s 4d 4c 9h')) === evaluate(c('Qh Qs 7c 7d 9s 2c 3d')), 'two pair uses best kicker');
ok(describe(evaluate(c('Kc Kd Kh 7s 7d'))) === 'Kings full of Sevens', 'describe full house');
const aa = equity(c('As Ah'), [], 1, 4000);
ok(aa > 0.82 && aa < 0.88, `AA vs random ~85%, got ${aa}`);

// Side pots: A all in 50, B all in 100, C covers 200 -> main 150, side 100, side 100 (C alone).
const t0 = newTable(['a', 'b', 'c'], 0, 1, 2);
t0.seats.forEach((s, i) => Object.assign(s, { inHand: true, committed: [50, 100, 200][i] }));
const ps = pots(t0);
ok(ps.map((x) => x.amount).join() === '150,100,100' && ps[2].eligible.join() === '2', `side pots ${JSON.stringify(ps)}`);

// Thousands of bot hands: chips are conserved, every hand finishes, stacks never go negative.
let rngSeed = 7;
const rng = () => ((rngSeed = (rngSeed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
for (const players of [2, 3, 6, 10]) {
  const ids = PRESETS.slice(0, players).map((p) => p.id);
  let t: Table = newTable(ids, 200, 1, 2);
  t.seats.forEach((s, i) => (s.stack = 40 + i * 37)); // uneven stacks force side pots
  for (let hand = 0; hand < 400; hand++) {
    for (const s of t.seats) if (s.stack === 0) s.stack = 200; // rebuy busted players
    const chips = t.seats.reduce((n, s) => n + s.stack, 0);
    t = startHand(t, rng);
    for (let steps = 0; t.street !== 'done'; steps++) {
      ok(steps < 200, 'hand never finished');
      const prof = PRESETS.find((p) => p.id === t.seats[t.toAct!].id)!;
      t = act(t, decide(t, prof, 0, rng));
    }
    const after = t.seats.reduce((n, s) => n + s.stack, 0);
    ok(after === chips, `chips ${chips} -> ${after} in hand ${hand} (${players} players)`);
    ok(t.seats.every((s) => s.stack >= 0), 'negative stack');
    ok(t.winners.length > 0, 'no winner');
  }
}
console.log('engine self-check passed');
