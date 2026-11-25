// Home-game chip split: given a chip set (count and value of each color), the number of players and the buy-in,
// find how many of each color every player starts with so each stack is worth exactly the buy-in.

export interface ChipColor {
  name: string;
  color: string;
  count: number; // in the whole set
  cents: number; // value of one chip
}

export interface Split {
  perPlayer: number[]; // chips of each color (same order as the input)
  value: number; // cents per player
  exact: boolean; // value === buy-in
}

const MAX_STATES = 200_000;
const COLUMN = 20; // chips per color that count as useful; more than this is clutter

/**
 * Exact-value split that favours small chips (they make change) and using every color, without piling up chips.
 * Scored per color, so a knapsack DP over value finds the best. If the buy-in can't be made exactly, returns the
 * best split for the largest value below it. Null when nothing fits at all.
 */
export function splitChips(colors: ChipColor[], players: number, buyInCents: number, cheapestFirst = false): Split | null {
  if (cheapestFirst) return splitCheapestFirst(colors, players, buyInCents);
  if (players < 1 || buyInCents <= 0) return null;
  const usable = colors
    .map((c, i) => ({ ...c, i, max: Math.floor(c.count / players) }))
    .filter((c) => c.cents > 0 && c.max > 0 && c.cents <= buyInCents)
    .sort((a, b) => a.cents - b.cents);
  if (!usable.length) return null;

  // Work in units of the chips' greatest common value to keep the table small.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const unit = usable.reduce((g, c) => gcd(g, c.cents), 0);
  const target = Math.floor(buyInCents / unit);
  if (target > MAX_STATES) return null;

  // Smaller chips score more per chip; using a color at all earns a bonus; every chip costs a little.
  const score = (rank: number, n: number) => (n > 0 ? 30 : 0) + Math.min(n, COLUMN) * (usable.length - rank) - 0.3 * n;

  let best = new Float64Array(target + 1).fill(-Infinity);
  best[0] = 0;
  const choice: Int32Array[] = [];
  usable.forEach((c, rank) => {
    const v = c.cents / unit;
    const next = new Float64Array(target + 1).fill(-Infinity);
    const pick = new Int32Array(target + 1).fill(-1);
    for (let s = 0; s <= target; s++) {
      if (best[s] === -Infinity) continue;
      for (let n = 0; n <= c.max && s + n * v <= target; n++) {
        const sc = best[s] + score(rank, n);
        if (sc > next[s + n * v]) {
          next[s + n * v] = sc;
          pick[s + n * v] = n;
        }
      }
    }
    choice.push(pick);
    best = next;
  });

  let reach = target;
  while (reach > 0 && best[reach] === -Infinity) reach--;
  if (reach === 0) return null;
  const perPlayer = new Array(colors.length).fill(0);
  for (let k = usable.length - 1, s = reach; k >= 0; k--) {
    const n = choice[k][s];
    perPlayer[usable[k].i] = n;
    s -= n * (usable[k].cents / unit);
  }
  const value = perPlayer.reduce((sum, n, i) => sum + n * colors[i].cents, 0);
  return { perPlayer, value, exact: value === buyInCents };
}

/**
 * Strict mode: as many of the cheapest color as possible, then as many of the next, and so on, while still
 * hitting the buy-in exactly (or the largest value below it that any split can reach).
 */
function splitCheapestFirst(colors: ChipColor[], players: number, buyInCents: number): Split | null {
  if (players < 1 || buyInCents <= 0) return null;
  const usable = colors
    .map((c, i) => ({ ...c, i, max: Math.floor(c.count / players) }))
    .filter((c) => c.cents > 0 && c.max > 0 && c.cents <= buyInCents)
    .sort((a, b) => a.cents - b.cents);
  if (!usable.length) return null;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const unit = usable.reduce((g, c) => gcd(g, c.cents), 0);
  const target = Math.floor(buyInCents / unit);
  if (target > MAX_STATES) return null;

  // reach[k][s]: can colors k.. (cheap to dear) make exactly s units?
  const reach: Uint8Array[] = new Array(usable.length + 1);
  reach[usable.length] = new Uint8Array(target + 1);
  reach[usable.length][0] = 1;
  for (let k = usable.length - 1; k >= 0; k--) {
    const v = usable[k].cents / unit;
    const r = new Uint8Array(target + 1);
    const after = reach[k + 1];
    for (let s = 0; s <= target; s++) {
      if (!after[s]) continue;
      for (let n = 0; n <= usable[k].max && s + n * v <= target; n++) r[s + n * v] = 1;
    }
    reach[k] = r;
  }
  let goal = target;
  while (goal > 0 && !reach[0][goal]) goal--;
  if (goal === 0) return null;

  const perPlayer = new Array(colors.length).fill(0);
  let left = goal;
  usable.forEach((c, k) => {
    const v = c.cents / unit;
    for (let n = Math.min(c.max, Math.floor(left / v)); n >= 0; n--) {
      if (reach[k + 1][left - n * v]) {
        perPlayer[c.i] = n;
        left -= n * v;
        return;
      }
    }
  });
  const value = perPlayer.reduce((sum, n, i) => sum + n * colors[i].cents, 0);
  return { perPlayer, value, exact: value === buyInCents };
}
