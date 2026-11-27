import { useEffect, useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { Segmented } from '../components/RuleControls';
import { describe, evaluate, shuffledDeck, type Card } from '../engine/cards';
import { pickWeighted, solverCard, solverRange } from '../engine/ranges';
import { nodeAt, solveSpot, type NodeInfo, type Progress, type SpotConfig } from '../solver/client';
import { BB, flopNode, loadFlop, loadPacks, type Library, type Pack } from '../solver/library';
import { record } from '../state/progressStore';
import { findRange, useStudy } from '../state/studyStore';
import { cardName, DEFAULTS, holesOf, PLAYER, SIZES, STREETS } from './spots';
import { BUTTON, Field, PANEL, RangeSelect } from './ui';

interface Decision {
  actions: string[];
  chosen: number;
  evs: number[]; // your hand's EV for each action
  freq: number[]; // how often the solver takes each with your hand
  loss: number; // chips; NaN when the solver never gets here with your hand
  pot: number; // the starting pot it's graded against
}

interface Hand {
  lib?: Library; // while on the flop: decisions come from the library; then the turn is solved live
  hero: number; // 0 OOP, 1 IP
  holes: Card[][][]; // by player, solver order
  heroIdx: number;
  villainIdx: number;
  node: NodeInfo;
  pot0: number; // chips at the start of the current solve
  stack0: number;
  bb?: number; // chips per big blind, to show amounts in bb
  seats: string[];
  runout: Card[]; // cards dealt only to show the showdown after an all-in
  log: string[];
  decisions: Decision[];
}

const SEATS = [
  { value: -1, label: 'Random' },
  { value: 0, label: 'OOP' },
  { value: 1, label: 'IP' },
];
const TRAINER_STREETS = [{ value: 3, label: 'Flop' }, ...STREETS];
const random = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Chips as shown: big blinds for library spots, plain chips otherwise. */
const amount = (x: number, bb?: number) => (bb ? `${Math.round((x / bb) * 10) / 10} bb` : String(x));
/** "Bet:50" -> "Bet 50" (or "Bet 5 bb"), "Raise:150" -> "Raise to 150". */
function label(a: string, bb?: number) {
  const [kind, n] = a.split(':');
  if (n === undefined) return kind;
  const x = amount(Number(n), bb);
  return kind === 'Raise' ? `Raise to ${x}` : kind === 'AllIn' ? `All-in ${x}` : `${kind} ${x}`;
}

const goto = (hand: Hand, history: number[]) => (hand.lib ? Promise.resolve(flopNode(hand.lib, history)) : nodeAt(history));

/** The flop is over without an all-in: deal a turn and solve it live, from the ranges that got here. */
async function toTurn(hand: Hand, onProgress: (p: Progress) => void): Promise<Hand> {
  const lib = hand.lib!, node = hand.node;
  const used = new Set([...hand.holes[hand.hero][hand.heroIdx], ...hand.holes[1 - hand.hero][hand.villainIdx], ...lib.board.map(solverCard)]);
  const turn = random(Array.from({ length: 52 }, (_, c) => c).filter((c) => !used.has(c)));
  // Each player's range at the end of the flop, as the solver's 1326 weights. Your hand stays in even if the solver
  // would never play it this way, so the turn can still be graded.
  const ranges = [0, 1].map((p) => {
    const r = new Float32Array(1326), mine = p === hand.hero ? hand.heroIdx : hand.villainIdx;
    hand.holes[p].forEach((hole, i) => {
      const [lo, hi] = hole.map(solverCard).sort((x, y) => x - y);
      r[(lo * (101 - lo)) / 2 + hi - 1] = i === mine ? Math.max(node.weights[p][i], 0.001) : node.weights[p][i];
    });
    return r;
  });
  const pot = hand.pot0 + node.bets[0] + node.bets[1], stack = hand.stack0 - node.bets[0];
  const { bets, raises } = lib.pack.live;
  const spot: SpotConfig = { oop: ranges[0], ip: ranges[1], board: [...lib.board, solverCard(turn)], pot, stack, oopBets: bets, oopRaises: raises, ipBets: bets, ipRaises: raises };
  onProgress({ iterations: 0, exploitability: NaN });
  const solved = await solveSpot(spot, onProgress);
  const holes = solved.hands.map(holesOf);
  const find = (p: number, cards: Card[]) => holes[p].findIndex((h) => h.every((c) => cards.includes(c)));
  return {
    ...hand,
    lib: undefined,
    holes,
    heroIdx: find(hand.hero, hand.holes[hand.hero][hand.heroIdx]),
    villainIdx: find(1 - hand.hero, hand.holes[1 - hand.hero][hand.villainIdx]),
    node: solved.root,
    pot0: pot,
    stack0: stack,
    log: [...hand.log, `Turn: ${cardName(turn)}`],
  };
}

/** Plays the villain (from the solved strategy, with its one hand) and deals cards, until it's your turn or the hand ends. */
async function advance(start: Hand, onProgress: (p: Progress) => void): Promise<Hand> {
  let hand = start;
  const villain = 1 - hand.hero;
  for (;;) {
    const { node } = hand;
    const held = [...hand.holes[hand.hero][hand.heroIdx], ...hand.holes[villain][hand.villainIdx]];
    if (node.player === 2 && hand.lib) {
      hand = await toTurn(hand, onProgress);
      continue;
    }
    // A move with no choice (the big blind checking to the raiser) plays itself.
    const forced = node.player === hand.hero && node.actions.length === 1;
    if (node.player !== villain && node.player !== 2 && !forced) break;
    let step: number;
    let log: string[];
    if (node.player === 2) {
      // Both hands are dealt, so neither can come on the river.
      step = random(node.cards.filter((c) => !held.includes(solverCard(c))));
      log = [...hand.log, `River: ${cardName(solverCard(step))}`];
    } else if (forced) {
      step = 0;
      log = [...hand.log, `You: ${label(node.actions[0], hand.bb).toLowerCase()}`];
    } else {
      const n = hand.holes[villain].length;
      step = pickWeighted(node.actions.map((_, k) => node.strategy![k * n + hand.villainIdx]));
      log = [...hand.log, `Villain: ${label(node.actions[step], hand.bb).toLowerCase()}`];
    }
    hand = { ...hand, node: await goto(hand, [...node.history, step]), log };
  }
  // An all-in called before the river ends the tree early; deal the rest to show who wins.
  const { node } = hand;
  if (node.player === -1 && node.bets[0] === node.bets[1] && node.board.length < 5) {
    const used = new Set([...hand.holes[hand.hero][hand.heroIdx], ...hand.holes[villain][hand.villainIdx], ...node.board.map(solverCard)]);
    const deck = shuffledDeck().filter((c) => !used.has(c)).slice(0, 5 - node.board.length);
    hand = { ...hand, runout: deck, log: [...hand.log, ...deck.map((c, k) => `${node.board.length + k === 3 ? 'Turn' : 'River'}: ${cardName(c)}`)] };
  }
  return hand;
}

/** Play flop, turn or river spots against the solver; every decision is graded by the EV it gives up. */
export function Trainer() {
  const ranges = useStudy((s) => s.ranges);
  const [oop, setOop] = useState(ranges.find((r) => r.name === 'CO open')?.name ?? ranges[0]?.name ?? '');
  const [ip, setIp] = useState(ranges.find((r) => r.name === 'BTN open')?.name ?? ranges[0]?.name ?? '');
  const [seat, setSeat] = useState(-1);
  const [street, setStreet] = useState(3);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [pot, setPot] = useState('srp-BTN-BB');
  useEffect(() => {
    loadPacks().then(setPacks, (e: Error) => setError(e.message));
  }, []);
  const [deep, setDeep] = useState(false);
  const [hasDeep, setHasDeep] = useState(false);
  useEffect(() => {
    fetch('/flops/index.json')
      .then((r) => r.json())
      .then((ps: Pack[]) => setHasDeep(ps.some((p) => p.key === 'deep-BTN-BB' && p.flops > 0)), () => {});
  }, []);
  const chosenPack = packs.find((p) => p.key === pot) ?? packs[0];
  // Two sizes a street: only button vs big blind single-raised pots have them.
  const pack = deep && chosenPack?.key === 'srp-BTN-BB' ? { ...chosenPack, key: 'deep-BTN-BB' } : chosenPack;
  const [size, setSize] = useState<keyof typeof SIZES>('one');
  const [hand, setHand] = useState<Hand>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>();
  const [error, setError] = useState<string>();
  const [session, setSession] = useState({ decisions: 0, loss: 0 });

  const run = (work: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    work()
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        setBusy(false);
        setProgress(undefined);
      });
  };

  /** Deals both hands from the starting weights; yours can't share a card with theirs. */
  const seatHands = (holes: Card[][][], weights: ArrayLike<number>[], hero: number) => {
    const heroIdx = pickWeighted(weights[hero]);
    const mine = new Set(holes[hero][heroIdx]);
    const villainIdx = pickWeighted(Array.from(weights[1 - hero], (w, i) => (holes[1 - hero][i].some((c) => mine.has(c)) ? 0 : w)));
    if (heroIdx < 0 || villainIdx < 0) throw new Error('A range has no hands left on this board. Try again or widen it.');
    return { heroIdx, villainIdx };
  };

  const deal = () =>
    run(async () => {
      const hero = seat >= 0 ? seat : Math.random() < 0.5 ? 0 : 1;
      if (street === 3) {
        if (!pack) throw new Error('The flop library is still loading.');
        const lib = await loadFlop(pack.key);
        const holes = lib.hands.map(holesOf);
        const root = flopNode(lib, []);
        const h: Hand = { lib, hero, holes, ...seatHands(holes, lib.weights, hero), node: root, pot0: lib.pack.pot, stack0: lib.pack.stack, bb: BB, seats: lib.pack.seats, runout: [], log: [], decisions: [] };
        setHand(await advance(h, setProgress));
        return;
      }
      const board = shuffledDeck().slice(0, street);
      const { bets, raises } = SIZES[size];
      setProgress({ iterations: 0, exploitability: NaN });
      const solved = await solveSpot(
        {
          oop: solverRange(findRange(ranges, oop)),
          ip: solverRange(findRange(ranges, ip)),
          board: board.map(solverCard),
          pot: DEFAULTS.pot,
          stack: DEFAULTS.stack,
          oopBets: bets,
          oopRaises: raises,
          ipBets: bets,
          ipRaises: raises,
        },
        setProgress,
      );
      setProgress(undefined);
      const holes = solved.hands.map(holesOf);
      const h: Hand = { hero, holes, ...seatHands(holes, solved.root.weights, hero), node: solved.root, pot0: DEFAULTS.pot, stack0: DEFAULTS.stack, seats: PLAYER, runout: [], log: [], decisions: [] };
      setHand(await advance(h, setProgress));
    });

  const choose = (a: number) =>
    run(async () => {
      if (!hand) return;
      const { node, heroIdx } = hand;
      const n = hand.holes[hand.hero].length;
      const evs = node.actions.map((_, k) => node.actionEvs![k * n + heroIdx]);
      const reached = node.weights[hand.hero][heroIdx] > 0;
      const loss = reached ? Math.max(...evs) - evs[a] : NaN;
      const decision = { actions: node.actions, chosen: a, evs, freq: node.actions.map((_, k) => node.strategy![k * n + heroIdx]), loss, pot: hand.pot0 };
      if (reached) {
        setSession((s) => ({ decisions: s.decisions + 1, loss: s.loss + (loss / hand.pot0) * 100 }));
        const kind = (k: number) => node.actions[k].split(':')[0];
        record('trainer', {
          street: node.board.length,
          seat: hand.hero,
          facing: node.actions.includes('Call'),
          chose: kind(a),
          best: kind(evs.indexOf(Math.max(...evs))),
          loss: (loss / hand.pot0) * 100,
        });
      }
      const next = await goto(hand, [...node.history, a]);
      setHand(await advance({ ...hand, node: next, log: [...hand.log, `You: ${label(node.actions[a], hand.bb).toLowerCase()}`], decisions: [...hand.decisions, decision] }, setProgress));
    });

  const heroTurn = hand && hand.node.player === hand.hero;
  const over = hand && hand.node.player === -1;
  const shownPot = hand ? hand.pot0 + hand.node.bets[0] + hand.node.bets[1] : 0;
  const board = hand ? [...hand.node.board.map(solverCard), ...hand.runout] : [];
  const last = hand?.decisions.at(-1);

  return (
    <>
      <section className={PANEL}>
        {street === 3 ? (
          <Field label="Pot">
            <select value={chosenPack?.key ?? ''} onChange={(e) => setPot(e.target.value)} className="min-h-11 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px] text-[var(--text-primary)]">
              {packs.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.title} ({p.flops} flop{p.flops === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <RangeSelect label="OOP range" value={oop} onChange={setOop} />
            <RangeSelect label="IP range" value={ip} onChange={setIp} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Segmented label="Street" value={street} options={TRAINER_STREETS} onChange={setStreet} />
          {street === 3 && hasDeep && chosenPack?.key === 'srp-BTN-BB' && (
            <Segmented
              label="Bet sizes"
              value={deep ? 'two' : 'one'}
              options={[
                { value: 'one', label: '1 size' },
                { value: 'two', label: '2 sizes' },
              ]}
              onChange={(v) => setDeep(v === 'two')}
            />
          )}
          {street !== 3 && (
            <Segmented label="Bet sizes" value={size} options={Object.entries(SIZES).map(([value, s]) => ({ value: value as keyof typeof SIZES, label: s.label }))} onChange={setSize} />
          )}
          <Segmented
            label="Your seat"
            value={seat}
            options={street === 3 && pack ? [SEATS[0], { value: 0, label: pack.seats[0] }, { value: 1, label: pack.seats[1] }] : SEATS}
            onChange={setSeat}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={deal} disabled={busy} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            {hand ? 'Next hand' : 'Deal'}
          </button>
          <span className="text-[13px] text-[var(--text-muted)] tabular-nums">
            {progress
              ? `Solving${hand?.lib ? ' the turn' : ''}… ${progress.iterations} iterations${Number.isNaN(progress.exploitability) ? '' : ` · ${((progress.exploitability / (hand?.pot0 ?? DEFAULTS.pot)) * 100).toFixed(1)}% of the pot from done`}`
              : session.decisions
                ? `${session.decisions} decisions · ${(session.loss / session.decisions).toFixed(1)}% of the pot lost per decision`
                : street === 3
                  ? `Six-max, 100 bb. ${pack ? `${pack.title} before the flop.` : ''} Flop bets are a third of the pot.`
                  : `Pot ${DEFAULTS.pot}, ${DEFAULTS.stack} behind; bets ${SIZES[size].bets} of the pot, raises ${SIZES[size].raises}.`}
          </span>
        </div>
        {error && <p className="mt-2 text-[15px] text-rose-400">{error}</p>}
      </section>

      {hand && (
        <section className={`${PANEL} mt-4`}>
          <div className="flex flex-wrap items-end justify-center gap-x-8 gap-y-3">
            <Seat label={`Villain · ${hand.seats[1 - hand.hero]}`} cards={over ? hand.holes[1 - hand.hero][hand.villainIdx] : undefined} />
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (board[i] === undefined ? <PlayingCard key={i} size="md" /> : <PlayingCard key={i} card={board[i]} size="md" />))}
              </div>
              <span className="text-[13px] text-[var(--text-muted)] tabular-nums">Pot {amount(shownPot, hand.bb)}</span>
            </div>
            <Seat label={`You · ${hand.seats[hand.hero]}`} cards={hand.holes[hand.hero][hand.heroIdx]} />
          </div>

          <p className="mt-4 min-h-6 text-center text-[15px] text-[var(--text-muted)]">{hand.log.join(' · ') || 'You act first.'}</p>

          {heroTurn && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {hand.node.actions.map((a, i) => (
                <button key={a} type="button" disabled={busy} onClick={() => choose(i)} className={`${BUTTON} bg-[var(--bg-third)]`}>
                  {label(a, hand.bb)}
                </button>
              ))}
            </div>
          )}
          {over && <p className="mt-3 text-center text-[17px] font-semibold">{result(hand, board)}</p>}
          {last && <Grade d={last} bb={hand.bb} />}
        </section>
      )}
      {street === 3 && (
        <p className="text-footnote mt-3 px-2 text-[var(--text-muted)]">
          Flops come from a library of solved flops (postflop-solver, within 1% of the pot of perfect play), with the site’s opening and facing-a-raise
          ranges. To fit in memory those solves have raises on the flop only; once the flop is done, the turn and river are solved live in your browser,
          raises included.
        </p>
      )}
    </>
  );
}

function Seat({ label, cards }: { label: string; cards?: Card[] }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {(cards ?? [undefined, undefined]).map((c, i) => (
          <PlayingCard key={i} card={c} size="md" />
        ))}
      </div>
      <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

/** Your last decision next to the solver's. */
function Grade({ d, bb }: { d: Decision; bb?: number }) {
  const best = d.evs.indexOf(Math.max(...d.evs));
  const verdict = Number.isNaN(d.loss)
    ? 'Not graded: the solver never reaches this spot with your hand.'
    : d.loss < d.pot * 0.005
      ? 'Best play.'
      : `Best was ${label(d.actions[best], bb).toLowerCase()}: you gave up ${bb ? amount(Math.round(d.loss * 10) / 10, bb) : `${d.loss.toFixed(1)} chips`} (${((d.loss / d.pot) * 100).toFixed(1)}% of the pot).`;
  return (
    <div className="mt-4 border-t border-[var(--line)] pt-3">
      <p className={`text-[15px] font-semibold ${Number.isNaN(d.loss) ? '' : d.loss < d.pot * 0.005 ? 'text-emerald-400' : d.loss < d.pot * 0.05 ? 'text-amber-300' : 'text-rose-400'}`}>
        {verdict}
      </p>
      <table className="mt-2 w-full text-[13px] tabular-nums">
        <thead className="text-[var(--text-muted)]">
          <tr>
            <th className="py-1 text-left font-normal">Action</th>
            <th className="py-1 text-right font-normal">Solver</th>
            <th className="py-1 text-right font-normal">EV{bb ? ' (bb)' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {d.actions.map((a, i) => (
            <tr key={a} className={`border-t border-[var(--line)] ${i === d.chosen ? 'font-semibold' : ''}`}>
              <td className="py-1">
                {label(a, bb)}
                {i === d.chosen && ' (you)'}
              </td>
              <td className="py-1 text-right">{(d.freq[i] * 100).toFixed(0)}%</td>
              <td className="py-1 text-right">{Number.isNaN(d.loss) ? '–' : (bb ? d.evs[i] / bb : d.evs[i]).toFixed(bb ? 2 : 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Who won, once the hand is over. */
function result(hand: Hand, board: Card[]): string {
  const pot = amount(hand.pot0 + hand.node.bets[0] + hand.node.bets[1], hand.bb);
  const called = amount(hand.pot0 + 2 * Math.min(...hand.node.bets), hand.bb); // a fold hands back the bet nobody called
  const folded = hand.log.findLast((l) => l.endsWith(': fold'));
  if (folded === 'You: fold') return `You fold. Villain takes ${called}.`;
  if (folded === 'Villain: fold') return `Villain folds. You take ${called}.`;
  const mine = evaluate([...hand.holes[hand.hero][hand.heroIdx], ...board]);
  const theirs = evaluate([...hand.holes[1 - hand.hero][hand.villainIdx], ...board]);
  if (mine === theirs) return `Split pot: ${describe(mine)}.`;
  return mine > theirs ? `You win ${pot} with ${describe(mine)}.` : `Villain wins ${pot} with ${describe(theirs)}.`;
}
