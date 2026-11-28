import { seeded } from '../engine/cards';

// A full deck streaming in from the left to meet the fingertip of a hand reaching in from the right.
// The viewBox's middle is the page's middle: the nearest card and the fingertip sit GAP to either side of it.
const W = 1200, H = 560;
const MID = { x: W / 2, y: 290 };
const GAP = 15;
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

const rng = seeded(21);
// Places for the cards: a funnel that thickens toward the middle. A place that would cover much of another card is
// drawn again. The first one is the leading card, level with the fingertip.
const PLACES = [{ t: 1, x: MID.x - 30, y: MID.y }];
while (PLACES.length < RANKS.length * SUITS.length) {
  const t = Math.sqrt(rng()); // 0 at the left edge, 1 at the middle: denser near the hand
  const x = 30 + t * (MID.x - 60) + (rng() - 0.5) * 40;
  // Wide screens crop the top and bottom of the art, so the spread stays inside the middle band.
  const y = MID.y + (rng() + rng() - 1) * ((1 - t) ** 1.15 * 175 + 14);
  if (PLACES.every((p) => Math.hypot((p.x - x) / 17, (p.y - y) / 22) >= 0.95)) PLACES.push({ t, x, y });
}
const SPOTS = PLACES.map(({ t, x, y }) => {
  const rot = ((Math.atan2(MID.y - y, MID.x - x) * 180) / Math.PI) * 0.7 + (rng() - 0.5) * 24;
  const scale = 0.85 + rng() * 0.3;
  const rad = (rot * Math.PI) / 180;
  const right = x + scale * (8 * Math.abs(Math.cos(rad)) + 11 * Math.abs(Math.sin(rad)));
  return { x, y, rot, scale, right, opacity: 0.45 + t * 0.55, delay: -rng() * 6, lag: rng() * 0.35, far: Math.hypot(x - MID.x, y - MID.y) };
});
const SHIFT = MID.x - GAP - Math.max(...SPOTS.map((c) => c.right));
// The deck from the meeting point outward: aces, face cards, then 8-10, 5-7 and 2-4. Within a zone the
// order is shuffled on each visit; the aces stay put.
const DECK = RANKS.flatMap((rank) => SUITS.map((suit) => ({ rank, suit })));
const zone = (from: number, to: number) => shuffle(DECK.slice(from, to));
const ORDER = [...DECK.slice(0, 4), ...zone(4, 16), ...zone(16, 28), ...zone(28, 40), ...zone(40, 52)];
// Nearest spot first; drawn farthest first, so the high cards lie on top.
const SWARM = [...SPOTS]
  .sort((a, b) => a.far - b.far)
  .map((c, i) => ({ ...c, x: c.x + SHIFT, ...ORDER[i] }))
  .reverse();

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// God's hand from Michelangelo's Creation of Adam (public domain, Wikimedia Commons), upscaled 4x with Real-ESRGAN and cut
// out in grayscale: public/hand.webp (1700 x 760, drawn in 850 x 380 units), with the fingertip's end at (40, 202).
const HAND_SCALE = 720 / 850;

export function CardSwarm() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className="block h-[420px] w-full -mt-12 sm:-mt-16 sm:h-[min(46vw,600px)]">
      {/* Outer group: the flight in from the left. Inner: the idle bob. */}
      {SWARM.map((c, i) => (
        <g key={i} className="swarm-in" style={{ animationDelay: `${1 + c.lag}s`, animationDuration: `${1.7 - c.lag}s` }}>
        <g className="swarm-card" style={{ animationDelay: `${c.delay}s` }} opacity={c.opacity}>
          <g transform={`translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${c.scale})`}>
            <rect x={-8} y={-11} width={16} height={22} rx={2.4} fill="#ededee" />
            <g fill={c.suit === '♥' || c.suit === '♦' ? '#c62828' : '#0b0b0c'} textAnchor="middle">
              <text x={0} y={-0.5} fontSize={c.rank === '10' ? 7.5 : 9} fontWeight={700} letterSpacing={c.rank === '10' ? -0.6 : 0}>
                {c.rank}
              </text>
              <text x={0} y={8} fontSize={7.5}>
                {c.suit}
              </text>
            </g>
          </g>
        </g>
        </g>
      ))}
      <image
        className="hand-in"
        href="/hand.webp"
        x={MID.x + GAP - 40 * HAND_SCALE}
        y={MID.y - 202 * HAND_SCALE}
        width={850 * HAND_SCALE}
        height={380 * HAND_SCALE}
      />
    </svg>
  );
}
