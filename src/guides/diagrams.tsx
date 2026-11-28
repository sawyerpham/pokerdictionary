// Pictures for the guides: the table and its seats, a hand's streets, side pots, opening ranges, bluff math,
// board textures and player types. Plain SVG/HTML, colors from the dataviz reference palette (dark steps,
// validated on this surface).
import { useState } from 'react';
import type { ReactNode } from 'react';
import { PRESETS } from '../engine/profiles';
import { expandRange, RFI } from './rfi';

const CAT = { blue: '#3987e5', orange: '#d95926', aqua: '#199e70', yellow: '#c98500' };
const INK = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';

function Figure({ title, caption, children }: { title: string; caption: ReactNode; children: ReactNode }) {
  return (
    <figure className="mb-6 rounded-[12px] bg-[var(--bg-main)]/50 p-4 ring-1 ring-white/5">
      <h3 className="card-title">{title}</h3>
      {children}
      <figcaption className="text-footnote mt-3 text-[var(--text-muted)]">{caption}</figcaption>
    </figure>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="text-footnote mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[var(--text-primary)]">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ cards */

const SUIT: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

/** Small inline cards from shorthand like "As Kd 7c". */
export function MiniCards({ cards }: { cards: string }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {cards.split(' ').map((c, i) => {
        const rank = c.slice(0, -1).replace('T', '10');
        const suit = c.slice(-1);
        return (
          <span
            key={i}
            className={`inline-flex h-7 w-5 flex-col items-center justify-center rounded-[4px] bg-white text-[11px] leading-none font-semibold shadow-sm ${
              suit === 'h' || suit === 'd' ? 'text-rose-600' : 'text-zinc-900'
            }`}
          >
            <span>{rank}</span>
            <span>{SUIT[suit]}</span>
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------- the table */

// Clockwise from the button.
const SEATS: Record<6 | 9, string[]> = {
  9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'],
  6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
};
// Spelled out under the seats whose abbreviations don't explain themselves.
export const FULL: Record<string, string> = { LJ: 'Lojack', HJ: 'Hijack', CO: 'Cutoff' };

export const GROUPS = {
  early: { label: 'Early', color: CAT.blue },
  middle: { label: 'Middle', color: CAT.orange },
  late: { label: 'Late', color: CAT.aqua },
  blinds: { label: 'Blinds', color: CAT.yellow },
};
export const groupOf = (seat: string): keyof typeof GROUPS =>
  seat.startsWith('UTG') ? 'early' : seat === 'LJ' || seat === 'HJ' ? 'middle' : seat === 'CO' || seat === 'BTN' ? 'late' : 'blinds';

/**
 * `seats` (clockwise from the button, 2 to 9 of them) around a table, colored by position group, numbered by the
 * order they act preflop or, with `post`, after the flop. `you` gets a white border that blinks: it's your turn.
 * `tags` mark what a seat has done: folded seats fade out under a FOLD tag, bets get an amber tag.
 */
export function SeatTable({ seats, post = false, you, tags = {} }: { seats: string[]; post?: boolean; you?: string; tags?: Record<string, string> }) {
  const W = 360, H = 262, cx = W / 2, cy = 125;
  const at = (i: number, r = 1) => {
    const a = ((90 + (i * 360) / seats.length) * Math.PI) / 180;
    return { x: cx + 150 * r * Math.cos(a), y: cy + 98 * r * Math.sin(a) };
  };
  // Preflop UTG (index 3) acts first, or the button with three or fewer players (heads-up it posts the small blind);
  // after the flop the seat left of the button does.
  const first = post ? 1 : seats.length <= 3 ? 0 : 3;
  const order = (i: number) => ((i - first + seats.length) % seats.length) + 1;
  const when = post ? 'after the flop' : 'preflop';
  const btn = at(0); // the dealer chip sits up and left of the button's seat, opposite its order number
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[440px]" role="img" aria-label={`${seats.length}-handed table: ${seats.join(', ')}${you ? `; you are ${you}` : ''}`}>
        <ellipse cx={cx} cy={cy} rx={124} ry={70} fill="#0e1828" stroke="#2c2c2e" strokeWidth={8} />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={11} fill={MUTED} letterSpacing={2}>
          ACTION MOVES
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize={11} fill={MUTED} letterSpacing={2}>
          CLOCKWISE ↻
        </text>
        <circle cx={btn.x - 20} cy={btn.y - 19} r={9} fill="#fff" />
        <text x={btn.x - 20} y={btn.y - 15.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#000">
          D
        </text>
        {seats.map((name, i) => {
          const p = at(i);
          const group = GROUPS[groupOf(name)];
          const tag = tags[name], folded = tag === 'Fold';
          const tagW = tag ? tag.length * 6.2 + 14 : 0;
          return (
            <g key={name}>
              <title>{`${name}: ${group.label.toLowerCase()} position, acts ${order(i)} of ${seats.length} ${when}${tag ? `; ${folded ? 'folded' : tag}` : ''}`}</title>
              <g opacity={folded ? 0.3 : 1}>
                <circle cx={p.x} cy={p.y} r={25} fill={group.color} stroke="var(--bg-second)" strokeWidth={2} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={name.length > 3 ? 11 : 13} fontWeight={700} fill="#fff">
                  {name}
                </text>
              </g>
              {name === you && <circle className="turn-blink" cx={p.x} cy={p.y} r={26} fill="none" stroke="#fff" strokeWidth={3.5} />}
              {tag && (
                <g>
                  <rect x={p.x - tagW / 2} y={p.y + 17} width={tagW} height={16} rx={8} fill={folded ? '#2c2c2e' : '#3a2f12'} stroke={folded ? '#636366' : '#fbbf24'} strokeWidth={1} />
                  <text x={p.x} y={p.y + 28.5} textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing={0.6} fill={folded ? '#aeaeb2' : '#fcd34d'}>
                    {tag.toUpperCase()}
                  </text>
                </g>
              )}
              {FULL[name] && (
                <text x={p.x} y={p.y + (tag ? 46 : 38)} textAnchor="middle" fontSize={11} fill={INK} opacity={folded ? 0.5 : 1}>
                  {FULL[name]}
                </text>
              )}
              <circle cx={p.x + 20} cy={p.y - 19} r={9} fill="var(--bg-second)" />
              <text x={p.x + 20} y={p.y - 15.5} textAnchor="middle" fontSize={10} fontWeight={600} fill={INK}>
                {order(i)}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend items={Object.values(GROUPS).map((g) => ({ color: g.color, label: g.label }))} />
    </>
  );
}

/** The guides' version: 6 or 9 handed, preflop or postflop order. */
export function TableDiagram({ initial = 9 }: { initial?: 6 | 9 }) {
  const [n, setN] = useState<6 | 9>(initial);
  const [post, setPost] = useState(false);
  const toggle = (on: boolean) => `min-h-8 rounded-[8px] px-3 text-[13px] font-medium pointer-coarse:min-h-11 ${on ? 'bg-[#636366] text-white' : 'bg-[var(--fill)]'}`;
  return (
    <Figure title="Seats and acting order"
      caption={
        <>
          Seats clockwise from the button. The number is the order each seat acts {post ? 'on the flop, turn and river' : 'before the flop'}.
        </>
      }
    >
      <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <div className="flex gap-1">
        {([9, 6] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setN(k)}
            aria-pressed={n === k}
            className={toggle(n === k)}
          >
            {k}-handed
          </button>
        ))}
        </div>
        <div className="flex gap-1">
          {[false, true].map((v) => (
            <button key={String(v)} type="button" onClick={() => setPost(v)} aria-pressed={post === v} className={toggle(post === v)}>
              {v ? 'Postflop' : 'Preflop'}
            </button>
          ))}
        </div>
      </div>
      <SeatTable seats={SEATS[n]} post={post} />
    </Figure>
  );
}

/* ------------------------------------------------------- a hand's streets */

/** A blind chip with its label on it. */
function BlindChip({ label }: { label: 'SB' | 'BB' }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-white/70 bg-[#d42a2a] text-[11px] font-bold text-white">
      {label}
    </span>
  );
}

/** The board so far: earlier streets' cards dimmed, this street's cards bright. */
function BoardSoFar({ cards, fresh }: { cards: string[]; fresh: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {cards.map((c, i) => (
        <span key={c} className={i < cards.length - fresh ? 'opacity-35' : ''}>
          <MiniCards cards={c} />
        </span>
      ))}
    </span>
  );
}

export function HandFlow() {
  const board = ['Kh', '9s', '4d', 'Jc', '2h'];
  const steps: { name: string; show: ReactNode; note: string }[] = [
    {
      name: 'Blinds',
      show: (
        <span className="flex gap-1">
          <BlindChip label="SB" />
          <BlindChip label="BB" />
        </span>
      ),
      note: 'small and big blind post',
    },
    {
      name: 'Preflop',
      show: (
        <span className="flex gap-0.5">
          {[0, 1].map((k) => (
            <span key={k} className="h-7 w-5 rounded-[4px] border border-white/30 bg-[var(--accent-strong)]" />
          ))}
        </span>
      ),
      note: 'two private hole cards each, then a betting round',
    },
    { name: 'Flop', show: <BoardSoFar cards={board.slice(0, 3)} fresh={3} />, note: '3 shared cards face up, betting round' },
    { name: 'Turn', show: <BoardSoFar cards={board.slice(0, 4)} fresh={1} />, note: 'a 4th shared card, betting round' },
    { name: 'River', show: <BoardSoFar cards={board} fresh={1} />, note: 'the 5th and last shared card, betting round' },
    { name: 'Showdown', show: <span className="text-lg">🏆</span>, note: 'best five cards from your 2 plus the 5 shared' },
  ];
  return (
    <Figure title="Steps of a hand" caption="The steps of a hand. The bright cards are the ones each street adds; the board keeps the earlier ones. One card is burned before each street.">
      <ol className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.name} className="flex flex-col items-center gap-1.5 rounded-[10px] bg-[var(--bg-second)] p-2 text-center">
            <span className="text-caption text-[var(--text-muted)] tabular-nums">{i + 1}</span>
            <span className="flex h-8 items-center">{s.show}</span>
            <span className="text-[13px] font-semibold">{s.name}</span>
            <span className="text-caption text-[var(--text-muted)]">{s.note}</span>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

/* ----------------------------------------------------- the table, labelled */

/** One card drawn in SVG: a face ("Kh") or a back ("back"). */
function SvgCard({ x, y, c, w = 30, h = 42 }: { x: number; y: number; c: string; w?: number; h?: number }) {
  if (c === 'back')
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={4} fill="var(--accent-strong)" stroke="rgb(255 255 255 / 0.5)" />
        <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={2} fill="none" stroke="rgb(255 255 255 / 0.35)" />
      </g>
    );
  const red = c.endsWith('h') || c.endsWith('d');
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#fff" />
      <text x={x + 4} y={y + 13} fontSize={11} fontWeight={700} fill={red ? '#e11d48' : '#18181b'}>
        {c.slice(0, -1).replace('T', '10')}
      </text>
      <text x={x + w / 2} y={y + h - 8} textAnchor="middle" fontSize={15} fill={red ? '#e11d48' : '#18181b'}>
        {SUIT[c.slice(-1)]}
      </text>
    </g>
  );
}

function SvgChip({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={13} fill="#d42a2a" stroke="#fff" strokeWidth={2} strokeDasharray="4 3" />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
        {label}
      </text>
    </g>
  );
}

/** A table after the river with every part named: hole cards, blinds, the button, and the flop, turn and river. */
export function TableAnatomy() {
  const board = ['Kh', '9s', '4d', 'Jc', '2h'];
  const bx = 147, by = 118, cw = 34, gap = 6;
  const cardX = (i: number) => bx + i * (cw + gap);
  const bracket = (from: number, to: number, label: string) => {
    const x1 = cardX(from), x2 = cardX(to) + cw;
    return (
      <g>
        <path d={`M${x1} ${by - 6} V${by - 11} H${x2} V${by - 6}`} fill="none" stroke="rgb(235 235 245 / 0.6)" strokeWidth={1.2} />
        <text x={(x1 + x2) / 2} y={by - 16} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} letterSpacing={1}>
          {label}
        </text>
      </g>
    );
  };
  const pill = (x: number, y: number, text: string) => (
    <g>
      <rect x={x - text.length * 3.4 - 8} y={y - 10} width={text.length * 6.8 + 16} height={20} rx={10} fill="#2c2c2e" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={INK}>
        {text}
      </text>
    </g>
  );
  return (
    <Figure title="The table" caption="A four-player table after the river. Everyone has two private hole cards. The five board cards in the middle are shared, and each player makes their best five-card hand from their two plus the board.">
      <svg viewBox="0 0 480 330" className="mx-auto block w-full max-w-[560px]" role="img" aria-label="Poker table with hole cards, blinds, dealer button, and the flop, turn and river labelled">
        <ellipse cx={240} cy={160} rx={205} ry={118} fill="#0e1828" stroke="#2c2c2e" strokeWidth={10} />
        {board.map((c, i) => (
          <SvgCard key={c} x={cardX(i)} y={by} c={c} w={cw} h={48} />
        ))}
        {bracket(0, 2, 'FLOP')}
        {bracket(3, 3, 'TURN')}
        {bracket(4, 4, 'RIVER')}
        <text x={240} y={by + 64} textAnchor="middle" fontSize={11} fill={MUTED} className="max-sm:hidden">
          The board: shared by everyone
        </text>

        <SvgCard x={208} y={14} c="back" />
        <SvgCard x={242} y={14} c="back" />
        {pill(240, 70, 'UTG')}
        <text x={282} y={34} fontSize={11} fill={MUTED} className="max-sm:hidden">
          ← hole cards: two each, face down
        </text>

        <SvgCard x={18} y={130} c="back" />
        <SvgCard x={52} y={130} c="back" />
        {pill(52, 186, 'BB')}
        <SvgChip x={110} y={152} label="BB" />

        <SvgCard x={398} y={130} c="back" />
        <SvgCard x={432} y={130} c="back" />
        {pill(428, 186, 'BTN')}
        <circle cx={376} cy={160} r={10} fill="#fff" />
        <text x={376} y={164} textAnchor="middle" fontSize={10} fontWeight={700} fill="#000">
          D
        </text>
        <text x={376} y={214} textAnchor="middle" fontSize={10} fill={MUTED} className="max-sm:hidden">
          dealer button
        </text>

        <SvgCard x={206} y={232} c="As" w={32} h={46} />
        <SvgCard x={242} y={232} c="Ks" w={32} h={46} />
        {pill(240, 298, 'You · SB')}
        <SvgChip x={302} y={250} label="SB" />
        <text x={198} y={262} textAnchor="end" fontSize={11} fill={MUTED} className="max-sm:hidden">
          your hole cards: only you see them →
        </text>
      </svg>
    </Figure>
  );
}

/* --------------------------------------------------------------- side pots */

export function SidePotDiagram() {
  // A is all in for $50, B all in for $100, C calls $100.
  const players = [
    { name: 'A', put: 50, note: 'all in $50' },
    { name: 'B', put: 100, note: 'all in $100' },
    { name: 'C', put: 100, note: 'calls $100' },
  ];
  const scale = 1.3, base = 150, colW = 56, gap = 40, left = 30;
  return (
    <Figure title="Side pots" caption="Each player matches the all-in amounts in layers. The bottom layer is the main pot, the layer above it a side pot that A can't win.">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <svg viewBox="0 0 290 190" className="w-full max-w-[320px]" role="img" aria-label="Side pot: main pot $150 from all three players, side pot $100 from B and C">
          <line x1={left - 10} x2={260} y1={base} y2={base} stroke="#3a3a3c" strokeWidth={1} />
          {players.map((p, i) => {
            const x = left + i * (colW + gap);
            const main = Math.min(p.put, 50) * scale;
            const side = Math.max(0, p.put - 50) * scale;
            return (
              <g key={p.name}>
                <rect x={x} y={base - main} width={colW} height={main} fill={CAT.blue}>
                  <title>{`${p.name}: $${Math.min(p.put, 50)} in the main pot`}</title>
                </rect>
                {side > 0 && (
                  <rect x={x} y={base - main - side - 2} width={colW} height={side} rx={4} fill={CAT.orange}>
                    <title>{`${p.name}: $${p.put - 50} in the side pot`}</title>
                  </rect>
                )}
                <text x={x + colW / 2} y={base + 16} textAnchor="middle" fontSize={13} fontWeight={600} fill={INK}>
                  {p.name}
                </text>
                <text x={x + colW / 2} y={base + 31} textAnchor="middle" fontSize={10} fill={MUTED}>
                  {p.note}
                </text>
              </g>
            );
          })}
        </svg>
        <dl className="space-y-2 text-[15px]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: CAT.blue }} />
            <dt className="font-semibold">Main pot $150</dt>
            <dd className="text-[var(--text-muted)]">A, B or C can win</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: CAT.orange }} />
            <dt className="font-semibold">Side pot $100</dt>
            <dd className="text-[var(--text-muted)]">only B or C</dd>
          </div>
        </dl>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------- opening range grid */

const RANKS = 'AKQJT98765432';

const RFI_SETS = RFI.map((x) => expandRange(x.range));

/** 13×13 starting-hand grid shaded by the earliest seat that opens each hand (Upswing's 6-max ranges). */
export function RangeGrid() {
  const [hover, setHover] = useState<string>();
  const cell = (i: number, j: number) => (i === j ? RANKS[i] + RANKS[j] : i < j ? RANKS[i] + RANKS[j] + 's' : RANKS[j] + RANKS[i] + 'o');
  const first = (h: string) => RFI_SETS.findIndex((s) => s.has(h));
  const info = hover && (first(hover) >= 0 ? `${hover}: open from ${RFI[first(hover)].seat} and every later seat` : `${hover}: fold from every seat`);
  return (
    <Figure title="Opening ranges" caption="Suited hands above the diagonal, offsuit below, pairs on it. Each hand is shaded by the earliest seat that opens it. A hand opened from UTG is also opened from every seat after it.">
      <div className="mx-auto grid max-w-[420px] gap-px" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }} onMouseLeave={() => setHover(undefined)}>
        {RANKS.split('').flatMap((_, i) =>
          RANKS.split('').map((__, j) => {
            const h = cell(i, j);
            const k = first(h);
            return (
              <span
                key={h}
                onMouseEnter={() => setHover(h)}
                title={k >= 0 ? `${h}: opens from ${RFI[k].seat}` : `${h}: fold`}
                className="flex aspect-square items-center justify-center rounded-[2px] text-[11px] font-semibold tracking-tighter"
                style={{ background: k >= 0 ? RFI[k].color : '#2c2c2e', color: k >= 0 ? RFI[k].ink : 'rgb(235 235 245 / 0.35)' }}
              >
                {h.slice(0, i === j ? 2 : 3)}
              </span>
            );
          }),
        )}
      </div>
      <p className="text-footnote mt-2 h-5 text-center text-[var(--text-primary)]">{info ?? 'Hover a hand.'}</p>
      <Legend items={[...RFI.map((x) => ({ color: x.color, label: `${x.seat} and later` })), { color: '#2c2c2e', label: 'Fold' }]} />
    </Figure>
  );
}

/* ---------------------------------------------------------------- bluff math */

/** For each bet size: the share of the time a bluff must work, and the share a caller must defend (they sum to 100%). */
export function BluffChart() {
  const sizes = [
    ['⅓ pot', 1 / 3],
    ['½ pot', 1 / 2],
    ['⅔ pot', 2 / 3],
    ['Pot', 1],
    ['2× pot', 2],
  ] as const;
  return (
    <Figure title="Bluff and defense" caption="A bluff of bet B into pot P needs folds B ÷ (P + B) of the time. The rest, P ÷ (P + B), is how much of their range the caller has to keep. Exact values are in the table below.">
      <div className="space-y-2">
        {sizes.map(([label, b]) => {
          const folds = b / (1 + b);
          return (
            <div key={label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-right text-[13px] text-[var(--text-muted)]">{label}</span>
              <div className="flex h-6 flex-1 gap-[2px]">
                <div
                  className="flex items-center rounded-l-[4px] pl-2 text-[12px] font-semibold text-white tabular-nums"
                  style={{ width: `${folds * 100}%`, background: CAT.blue }}
                  title={`${label}: bluff must work ${Math.round(folds * 100)}%`}
                >
                  {Math.round(folds * 100)}%
                </div>
                <div
                  className="flex items-center justify-end rounded-r-[4px] pr-2 text-[12px] font-semibold text-white tabular-nums"
                  style={{ width: `${(1 - folds) * 100}%`, background: CAT.orange }}
                  title={`${label}: caller must defend ${Math.round((1 - folds) * 100)}%`}
                >
                  {Math.round((1 - folds) * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Legend
        items={[
          { color: CAT.blue, label: 'Folds a bluff needs' },
          { color: CAT.orange, label: 'Range the caller must defend' },
        ]}
      />
    </Figure>
  );
}

/* ------------------------------------------------------------- pot odds bar */

export function PotOddsBar() {
  return (
    <Figure title="Pot odds" caption="Example: call $10 to win the $50 already in the pot. The call is 10 ÷ 60, about 17% of the final pot, so you need to win at least that often.">
      <div className="flex h-8 gap-[2px] text-[12px] font-semibold text-white tabular-nums">
        <div className="flex items-center justify-center rounded-l-[4px]" style={{ width: `${(10 / 60) * 100}%`, background: CAT.orange }}>
          $10
        </div>
        <div className="flex flex-1 items-center justify-center rounded-r-[4px]" style={{ background: CAT.blue }}>
          $50 pot (with their bet)
        </div>
      </div>
      <Legend
        items={[
          { color: CAT.orange, label: 'Your call (17%)' },
          { color: CAT.blue, label: 'What you can win' },
        ]}
      />
    </Figure>
  );
}

/* ------------------------------------------------------------ board texture */

export function BoardTextures({ cite }: { cite?: ReactNode }) {
  const boards = [
    { cards: 'Ks 7d 2c', name: 'Dry', why: 'No flush or straight draws, little changes by the river.', size: 'Bet 25–35% of the pot' },
    { cards: '9h 8h 6s', name: 'Wet', why: 'Flush and straight draws everywhere; most turns change something.', size: 'Bet 55–80% of the pot' },
  ];
  return (
    <Figure title="Board texture" caption={<>How big to continuation bet on each kind of flop.{cite}</>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {boards.map((b) => (
          <div key={b.name} className="rounded-[10px] bg-[var(--bg-second)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[15px] font-semibold">{b.name}</span>
              <MiniCards cards={b.cards} />
            </div>
            <p className="text-footnote text-[var(--text-muted)]">{b.why}</p>
            <p className="mt-1 text-[13px] font-semibold">{b.size}</p>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------- player types */

/** The pro and celebrity presets placed by VPIP (tight→loose) and postflop aggression (passive→aggressive). */
export function PlayerTypes() {
  const W = 420, H = 280, L = 40, B = 30, T = 10, R = 10;
  const x = (v: number) => L + (v / 70) * (W - L - R);
  const y = (v: number) => H - B - (v / 100) * (H - B - T);
  const shown = PRESETS.filter((p) => p.group !== 'Archetypes');
  const labelled = new Set(['ivey', 'dwan', 'hellmuth', 'hansen', 'keating', 'romano', 'negreanu', 'carlsen']);
  const corner = (cxv: number, cyv: number, text: string, anchor: 'start' | 'end') => (
    <text x={x(cxv)} y={y(cyv)} textAnchor={anchor} fontSize={11} fill={MUTED} letterSpacing={1}>
      {text}
    </text>
  );
  return (
    <Figure title="Player styles" caption="Each dot is one of the table's pro or celebrity players, placed by their sliders. Hover a dot for its name.">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[480px]" role="img" aria-label="Scatter of player styles by VPIP and aggression">
        <line x1={x(25)} x2={x(25)} y1={T} y2={H - B} stroke="#3a3a3c" />
        <line x1={L} x2={W - R} y1={y(50)} y2={y(50)} stroke="#3a3a3c" />
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#48484a" />
        <line x1={L} x2={L} y1={T} y2={H - B} stroke="#48484a" />
        {corner(1, 96, 'TIGHT-AGGRESSIVE', 'start')}
        {corner(69, 96, 'LOOSE-AGGRESSIVE', 'end')}
        {corner(1, 3, 'TIGHT-PASSIVE', 'start')}
        {corner(69, 3, 'LOOSE-PASSIVE', 'end')}
        {[0, 25, 50, 70].map((v) => (
          <text key={v} x={x(v)} y={H - B + 14} textAnchor="middle" fontSize={10} fill={MUTED}>
            {v}%
          </text>
        ))}
        <text x={(L + W) / 2} y={H - 2} textAnchor="middle" fontSize={11} fill={INK}>
          VPIP: hands played →
        </text>
        <text transform={`translate(12 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={INK}>
          Aggression →
        </text>
        {shown.map((p) => (
          <g key={p.id}>
            <title>{`${p.name}: VPIP ${p.vpip}%, aggression ${p.aggression}`}</title>
            <circle cx={x(p.vpip)} cy={y(p.aggression)} r={9} fill="transparent" />
            <circle cx={x(p.vpip)} cy={y(p.aggression)} r={4.5} fill={CAT.blue} stroke="var(--bg-second)" strokeWidth={2} />
            {labelled.has(p.id) && (
              <text x={x(p.vpip) + 7} y={y(p.aggression) + 3.5} fontSize={10} fill={INK}>
                {p.name.split(' ').slice(-1)[0]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </Figure>
  );
}
