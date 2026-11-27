import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { SRC } from './sources';
import { EQUITY } from './preflopEquity';
import { FULL, groupOf, GROUPS } from './diagrams';
import { expandRange, RFI, SEATS } from './rfi';
import { Cite, GuideH2, GuideP, Sources, withFraction } from './ui';

const SOURCES = [SRC.upswingRfi, SRC.engine];
const OPEN = 1, ENGINE = 2;

const RANKS = 'AKQJT98765432';
const HANDS = RANKS.split('').flatMap((_, i) =>
  RANKS.split('').map((__, j) => (i === j ? RANKS[i] + RANKS[j] : i < j ? RANKS[i] + RANKS[j] + 's' : RANKS[j] + RANKS[i] + 'o')),
);
const show = (h: string) => h.replace(/T/g, '10');
const combos = (h: string) => (h.length === 2 ? 6 : h[2] === 's' ? 4 : 12);

// Light to deep reds and greens.
const REDS = ['#e8a19b', '#df7f77', '#d25f56', '#bd4238', '#a1221b'];
const GREENS = ['#8cc79a', '#5fae71', '#3a9450', '#1f7d37', '#0b6b23'];
const LIGHT = [REDS[0], REDS[1], GREENS[0], GREENS[1]];
const step = (t: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(t * n)));

/** The 13×13 grid of starting hands; each cell is colored and described by the caller. */
export function Grid({ cell, onHover, mark }: { cell: (h: string) => { bg: string; ink: string; small?: string; title: string }; onHover: (h?: string) => void; mark?: string }) {
  return (
    <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }} onMouseLeave={() => onHover(undefined)}>
      {HANDS.map((h) => {
        const c = cell(h);
        return (
          <span
            key={h}
            data-hand={h}
            onMouseEnter={() => onHover(h)}
            onClick={() => onHover(h)}
            title={c.title}
            className={`flex aspect-square flex-col items-center justify-center rounded-[2px] leading-none ${h === mark ? 'relative z-10 ring-[3px] ring-white' : ''}`}
            style={{ background: c.bg, color: c.ink }}
          >
            <span className="text-[11px] font-semibold tracking-tighter max-[359px]:text-[8px] sm:text-[13px] sm:tracking-normal">{h}</span>
            {c.small && <span className="mt-0.5 text-[8px] font-normal tracking-tighter tabular-nums opacity-65 max-[359px]:text-[6px] sm:text-[10px] sm:tracking-normal">{c.small}</span>}
          </span>
        );
      })}
    </div>
  );
}


// Published ranges go by how many players are left to act behind you (1 = small blind ... 5 = six-max UTG).
const BY_BEHIND: Record<number, Set<string>> = Object.fromEntries(
  ['SB', 'BTN', 'CO', 'HJ', 'UTG'].map((seat, i) => [i + 1, expandRange(RFI.find((r) => r.seat === seat)!.range)]),
);
// More than five behind has no published range here: keep the strongest part of the five-behind range.
const TIGHTER: Record<number, number> = { 6: 14, 7: 12, 8: 10 };
export function openingRange(players: number, behind: number): Set<string> {
  if (behind <= 5) return BY_BEHIND[behind];
  const strongest = [...BY_BEHIND[5]].sort((a, b) => EQUITY[players][b] - EQUITY[players][a]);
  const out = new Set<string>();
  let total = 0;
  for (const h of strongest) {
    if ((total / 1326) * 100 >= TIGHTER[behind]) break;
    out.add(h);
    total += combos(h);
  }
  return out;
}

// Where each seat sits on the picture, clockwise from the button.
export const around = (players: number) => (players === 2 ? ['BTN', 'BB'] : ['BTN', 'SB', 'BB', ...SEATS[players].slice(0, -2)]);

/** The table drawn from above. Tap a seat to say that's you; its border turns white. */
function SeatPicker({ players, seat, onPick }: { players: number; seat: string; onPick: (seat: string) => void }) {
  const seats = around(players);
  const W = 352, H = 248, cx = W / 2, cy = H / 2;
  const at = (i: number, r = 1) => {
    const a = ((90 + (i * 360) / seats.length) * Math.PI) / 180;
    return { x: cx + 150 * r * Math.cos(a), y: cy + 98 * r * Math.sin(a) };
  };
  const button = at(0, 0.62);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[640px] select-none" role="group" aria-label="Your seat">
      <ellipse cx={cx} cy={cy} rx={144} ry={90} fill="#0e1828" stroke="#2c2c2e" strokeWidth={8} />
      <circle cx={button.x + 18} cy={button.y} r={9} fill="#fff" />
      <text x={button.x + 18} y={button.y + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#000">
        D
      </text>
      {seats.map((name, i) => {
        const p = at(i);
        const on = name === seat;
        return (
          <g
            key={name}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={FULL[name] ? `${name}, ${FULL[name]}` : name}
            onClick={() => onPick(name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(name);
              }
            }}
            className="cursor-pointer outline-none focus-visible:opacity-80"
          >
            <circle cx={p.x} cy={p.y} r={26} fill={GROUPS[groupOf(name)].color} stroke={on ? '#fff' : 'transparent'} strokeWidth={3.5} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={name.length > 3 ? 11 : 13} fontWeight={700} fill="#fff">
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const FRAME = '-mx-2 mb-6 rounded-[12px] bg-[var(--bg-main)]/50 p-3 ring-1 ring-white/5 sm:mx-0 sm:p-5';

/**
 * Every starting hand for a table of `players` with you in `seat`. `mark` outlines one hand; `engine` and
 * `open` are the citations for the win rates and the opening ranges.
 */
export function HandRangeGrid({ players, seat, mark, engine, open }: { players: number; seat: string; mark?: string; engine: ReactNode; open: ReactNode }) {
  const [hover, setHover] = useState<string>();
  const eq = EQUITY[players];
  const fair = 100 / players;
  const lo = Math.min(...Object.values(eq)), hi = Math.max(...Object.values(eq));

  const opens = seat !== 'BB';
  const behind = SEATS[players].length - SEATS[players].indexOf(seat);
  const range = opens ? openingRange(players, behind) : undefined;
  const share = range ? Math.round(([...range].reduce((n, h) => n + combos(h), 0) / 1326) * 1000) / 10 : 0;

  // Green = raise, red = fold, shaded by the hand's strength. The big blind has no opening decision, so it
  // shows above / below an even share instead.
  const shade = (h: string) => {
    const good = range ? range.has(h) : eq[h] >= fair;
    const strength = (eq[h] - lo) / (hi - lo);
    return good ? GREENS[1 + step(strength, 4)] : REDS[1 + step(1 - strength, 4)];
  };
  const text = (h: string) =>
    `${show(h[0])}-${show(h[1])}${h.length === 3 ? (h[2] === 's' ? ' suited' : ' offsuit') : ''}: wins ${withFraction(eq[h])}${range ? `, ${range.has(h) ? 'raise' : 'fold'}` : ''}`;

  return (
    <>
      {/* One line: the hovered hand, or else what this seat opens (and your own hand when it's marked). */}
      <p className="mb-3 flex min-h-11 items-center justify-center text-center text-[15px] tabular-nums sm:min-h-6">
        {hover
          ? text(hover)
          : `${opens ? `${seat}: raise ${withFraction(share)} of hands` : 'BB: if everyone folds, you win.'}${mark ? ` · ${text(mark)}` : ''}`}
      </p>
      <Grid
        mark={mark}
        onHover={setHover}
        cell={(h) => ({ bg: shade(h), ink: LIGHT.includes(shade(h)) ? '#1c1c1e' : '#ffffff', small: `${eq[h].toFixed(1)}%`, title: text(h) })}
      />
      <p className="text-footnote mt-2 px-2 pb-1 text-[var(--text-muted)]">
        {opens ? 'Green: raise if everyone before you folded. Red: fold.' : 'Green: above an even share of the pot. Red: below.'} The
        number is the win % against {players - 1} random hand{players > 2 ? 's' : ''}.{engine} Ranges follow the players left behind
        you, at 100 bb.{open}
        {opens && behind > 5 && ' Six or more behind is this site’s tighter estimate, not a published range.'}
        {players === 2 && seat === 'BTN' && ' Heads-up you can go wider than shown.'}
      </p>
    </>
  );
}

/** The guide's version: set how many are playing and which seat is yours. */
function HandChart() {
  const [players, setPlayers] = useState(6);
  const [picked, setPicked] = useState('UTG');
  const seat = around(players).includes(picked) ? picked : SEATS[players][0];
  return (
    <figure className={FRAME}>
      <h3 className="card-title">Preflop hands</h3>
      <label className="mx-auto mt-1 mb-1 flex max-w-[640px] items-center gap-3 px-2 text-[15px]">
        <span className="whitespace-nowrap">
          Players <strong className="tabular-nums">{players}</strong>
        </span>
        <input type="range" min={2} max={9} value={players} onChange={(e) => setPlayers(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
      </label>
      <SeatPicker players={players} seat={seat} onPick={setPicked} />
      <HandRangeGrid players={players} seat={seat} engine={<Cite n={ENGINE} />} open={<Cite n={OPEN} />} />
    </figure>
  );
}

function Content() {
  return (
    <>
      <GuideH2 id="all-hands">Every starting hand</GuideH2>
      <HandChart />
      <GuideP>
        More detail in the{' '}
        <Link to="/guides/positions" className="text-[var(--accent)] hover:underline">
          positions guide
        </Link>
        .
      </GuideP>

      <Sources list={SOURCES} />
    </>
  );
}

export const preflopGuide: Guide = {
  slug: 'preflop',
  title: 'Preflop Hands',
  description: 'How often each starting hand wins, and what to open from your seat.',
  sections: [
    { id: 'all-hands', title: 'Every starting hand' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
