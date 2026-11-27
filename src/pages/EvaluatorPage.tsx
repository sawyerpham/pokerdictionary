import { useDeferredValue, useMemo, useState } from 'react';
import { OddsPanel, pct, type Spot } from '../components/OddsPanel';
import { CardSlot, DeckDialog, type Slot } from '../components/CardPicker';
import { SourceLink } from '../components/SourceLink';
import { handName, outlook, shuffledDeck, type Card } from '../engine/cards';
import { around, HandRangeGrid, openingRange, SEATS } from '../guides/Preflop';
import { SRC } from '../guides/sources';

/** Where a card goes: a seat (by position name) or the board, and which card of it. */
type Target = { seat: string; i: number };
const BOARD = 'board';
const EMPTY_HAND: Slot[] = [null, null];
const EMPTY_BOARD: Slot[] = [null, null, null, null, null];

const known = (cards: Slot[]) => cards.filter((c): c is Card => c !== null);

export function EvaluatorPage() {
  const [players, setPlayers] = useState(6);
  const [pickedSeat, setSeat] = useState('CO');
  const [hands, setHands] = useState<Record<string, Slot[]>>({ CO: [48, 44] }); // A♠ K♠
  const [board, setBoard] = useState<Slot[]>(EMPTY_BOARD);
  const [target, setTarget] = useState<Target>();

  const seats = around(players);
  const you = seats.includes(pickedSeat) ? pickedSeat : SEATS[players][0];
  const handOf = (seat: string) => hands[seat] ?? EMPTY_HAND;
  const cardsAt = (seat: string) => (seat === BOARD ? board : handOf(seat));
  const used = new Set(known([...board, ...seats.flatMap(handOf)]));

  const setCard = (t: Target, card: Slot) => {
    // A card can only be in one place, including seats hidden at this table size.
    const clear = (list: Slot[]) => (card === null ? list : list.map((c) => (c === card ? null : c)));
    const nextHands = Object.fromEntries(Object.entries(hands).map(([k, v]) => [k, clear(v)]));
    let nextBoard = clear(board);
    if (t.seat === BOARD) nextBoard = nextBoard.map((c, i) => (i === t.i ? card : c));
    else nextHands[t.seat] = (nextHands[t.seat] ?? EMPTY_HAND).map((c, i) => (i === t.i ? card : c));
    setHands(nextHands);
    setBoard(nextBoard);
  };
  const pick = (card: Card) => {
    if (!target) return;
    setCard(target, card);
    // Move on to the next empty card of the same hand or the flop; close once that group is filled.
    const end = target.seat !== BOARD ? 2 : target.i < 3 ? 3 : target.i + 1;
    const next = cardsAt(target.seat).findIndex((c, i) => i > target.i && i < end && c === null);
    setTarget(next >= 0 ? { seat: target.seat, i: next } : undefined);
  };

  const random = () => {
    const deck = shuffledDeck();
    let k = 0;
    setHands(Object.fromEntries(seats.map((seat) => [seat, [deck[k++], deck[k++]]])));
    const shown = known(board).length;
    setBoard(board.map((_, i) => (i < shown ? deck[k++] : null)));
  };
  const clear = () => {
    setHands({});
    setBoard(EMPTY_BOARD);
  };

  // Every seat's known cards, for the win shares on the table and your panel below it.
  const spot = { hands: seats.map((seat) => known(handOf(seat))), hero: seats.indexOf(you), board: known(board) };
  const key = useDeferredValue(JSON.stringify(spot));
  const equities = useMemo(() => {
    const p: Spot = JSON.parse(key);
    return outlook(p.hands, p.board, p.hero).equity;
  }, [key]);

  const street = ['Preflop', 'Preflop', 'Preflop', 'Flop', 'Turn', 'River'][spot.board.length];
  const mine = spot.hands[spot.hero];
  // Preflop only: what the opening chart says for your seat.
  const advice =
    spot.board.length === 0 && mine.length === 2 && you !== 'BB'
      ? openingRange(players, SEATS[players].length - SEATS[players].indexOf(you)).has(handName(mine))
        ? 'raise'
        : 'fold'
      : null;

  const at = (i: number) => {
    const a = ((90 + (i * 360) / seats.length) * Math.PI) / 180;
    return { left: `calc(50% + var(--rx) * ${Math.cos(a)})`, top: `calc(50% + var(--ry) * ${Math.sin(a)})` };
  };
  const BOARD_LABEL = ['Flop', 'Flop', 'Flop', 'Turn', 'River'];

  return (
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-2 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-2">
        <h1 className="text-title-2">Evaluator</h1>
        <label className="flex min-w-56 flex-1 items-center gap-3 text-[15px] sm:max-w-sm">
          <span className="whitespace-nowrap">
            Players <strong className="tabular-nums">{players}</strong>
          </span>
          <input type="range" min={2} max={9} value={players} onChange={(e) => setPlayers(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
        </label>
        <div className="ml-auto flex gap-4 text-[15px]">
          <button type="button" onClick={random} className="min-h-11 text-[var(--accent)]">
            Random Cards
          </button>
          <button type="button" onClick={clear} className="min-h-11 min-w-11 text-[var(--text-muted)]">
            Clear
          </button>
        </div>
      </div>

      {/* The table: nearly the whole screen */}
      <section aria-label="Table" className="relative mx-auto aspect-[2/3] w-full [--rx:37%] [--ry:42%] sm:aspect-auto sm:h-[min(34rem,calc(100vh-12rem))] sm:min-h-[30rem] sm:max-w-4xl sm:[--rx:42%] sm:[--ry:37%]">
        <h2 className="card-title absolute top-1 left-1">Table</h2>
        <div className="absolute inset-[9%_8%] rounded-[50%] border-[10px] border-[#1d1d1f] bg-[radial-gradient(ellipse_at_50%_40%,#16263f_0%,#0e1828_60%,#0a111d_100%)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07),0_30px_60px_-30px_rgb(0_0_0/0.9)] sm:inset-[13%_9%] sm:border-[16px]" />

        <div className="absolute top-1/2 left-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
          <div className="flex gap-0.5 sm:gap-1.5">
            {board.map((c, i) => (
              <div key={i} className={`flex flex-col items-center gap-1 ${i === 3 || i === 4 ? 'ml-0.5 sm:ml-2' : ''}`}>
                <CardSlot card={c} label={`${BOARD_LABEL[i]} card`} onClick={() => setTarget({ seat: BOARD, i })} />
                <span className="text-[11px] text-white/45">{BOARD_LABEL[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {seats.map((seat, i) => {
          const on = seat === you;
          const equity = equities.length === seats.length ? equities[i] : undefined;
          return (
            <div key={seat} className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={at(i)}>
              <div className="flex gap-0.5">
                {handOf(seat).map((c, k) => (
                  <CardSlot key={k} card={c} label={`${seat} card ${k + 1}`} onClick={() => setTarget({ seat, i: k })} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSeat(seat)}
                aria-pressed={on}
                aria-label={`${seat}${on ? ', you' : ''}`}
                className={`hit relative flex items-center gap-1.5 rounded-full bg-[rgb(28_28_30/0.95)] px-2.5 py-0.5 text-[11px] whitespace-nowrap ring-2 sm:text-[13px] ${on ? 'ring-white' : 'ring-white/10'}`}
              >
                <strong>{seat}</strong>
                {equity !== undefined && <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{pct(equity)}</span>}
              </button>
            </div>
          );
        })}
      </section>

      {/* Your numbers */}
      <OddsPanel
        spot={spot}
        title={`${you} · ${street} · ${players - 1} opponent${players > 2 ? 's' : ''}`}
        className="mx-auto max-w-4xl"
        extra={
          advice && (
            <p className="mt-3 border-t border-[var(--line)] pt-3 text-[15px]">
              {you}, folded to you: <strong className={advice === 'raise' ? 'text-emerald-400' : 'text-rose-400'}>{advice}</strong>
            </p>
          )
        }
      />

      {/* Preflop chart for this table: your player count, seat and cards */}
      <section aria-label="Preflop hands" className="mx-auto mt-4 max-w-2xl rounded-[12px] bg-[var(--bg-second)] p-3 sm:p-5">
        <h2 className="card-title">Preflop hands</h2>
        <HandRangeGrid
          players={players}
          seat={you}
          mark={known(handOf(you)).length === 2 ? handName(known(handOf(you))) : undefined}
          engine={<SourceLink {...SRC.engine} />}
          open={<SourceLink {...SRC.upswingRfi} />}
        />
      </section>

      {target && (
        <DeckDialog
          key={target.seat}
          title={target.seat === BOARD ? `${BOARD_LABEL[target.i]} card` : `${target.seat}: card ${target.i + 1}`}
          used={used}
          current={cardsAt(target.seat)[target.i]}
          onPick={pick}
          onRemove={() => {
            setCard(target, null);
            setTarget(undefined);
          }}
          onClose={() => setTarget(undefined)}
        />
      )}
    </main>
  );
}
