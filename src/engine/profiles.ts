// NPC personalities. Every knob is 0–100 except betSize (% of pot).

export interface Profile {
  id: string;
  name: string;
  group: 'Pros' | 'Entertainers' | 'Archetypes' | 'Custom';
  blurb: string;
  avatar: string; // initials or an emoji
  color: string;
  // Range & aggression
  vpip: number; // % of hands played preflop
  pfr: number; // % of hands raised preflop (≤ vpip)
  threeBet: number; // % of hands re-raised preflop
  aggression: number; // postflop: bet/raise vs check/call
  // Bluffing & calling
  bluff: number;
  callDown: number; // stubbornness facing bets
  trap: number; // slow-plays strong hands
  // Bet sizing & shoves
  betSize: number; // usual bet, % of pot
  overbet: number;
  shove: number; // appetite for all-ins
  // Tilt
  tilt: number; // how much big losses loosen them up
  random?: boolean; // made by the dice; dropped once nobody seats it
}

export type Knob = Exclude<keyof Profile, 'id' | 'name' | 'group' | 'blurb' | 'avatar' | 'color' | 'random'>;

export const KNOBS: { key: Knob; label: string; group: string; min: number; max: number; step: number; unit?: string; help: string }[] = [
  { key: 'vpip', label: 'Hands played (VPIP)', group: 'Range & aggression', min: 5, max: 100, step: 1, unit: '%', help: 'Share of hands a player chooses to put money in preflop. Under 15% is tight; over 35% is loose.' },
  { key: 'pfr', label: 'Preflop raise (PFR)', group: 'Range & aggression', min: 0, max: 100, step: 1, unit: '%', help: 'Share of hands a player raises preflop. Near VPIP means they raise what they play; far below means lots of limping.' },
  { key: 'threeBet', label: '3-bet', group: 'Range & aggression', min: 0, max: 50, step: 1, unit: '%', help: 'How often a player re-raises an earlier preflop raise.' },
  { key: 'aggression', label: 'Postflop aggression', group: 'Range & aggression', min: 0, max: 100, step: 1, help: 'After the flop, how often a player bets or raises rather than checks or calls.' },
  { key: 'bluff', label: 'Bluffing', group: 'Bluffing & calling', min: 0, max: 100, step: 1, help: 'How often a player bets or raises with a weak hand to make better hands fold.' },
  { key: 'callDown', label: 'Calling down', group: 'Bluffing & calling', min: 0, max: 100, step: 1, help: 'How stubbornly a player calls bets with medium hands instead of folding.' },
  { key: 'trap', label: 'Slow-playing', group: 'Bluffing & calling', min: 0, max: 100, step: 1, help: 'Checking or just calling with a very strong hand to let opponents bet into it.' },
  { key: 'betSize', label: 'Usual bet size', group: 'Bet sizing & shoves', min: 25, max: 150, step: 5, unit: '% pot', help: 'A player’s usual bet as a share of the pot.' },
  { key: 'overbet', label: 'Overbets', group: 'Bet sizing & shoves', min: 0, max: 100, step: 1, help: 'How often a bet is bigger than the pot, with the strongest hands or boldest bluffs.' },
  { key: 'shove', label: 'Shoving', group: 'Bet sizing & shoves', min: 0, max: 100, step: 1, help: 'Appetite for going all in, from short-stack shoves preflop to big all-ins later.' },
  { key: 'tilt', label: 'Tilt', group: 'Tilt', min: 0, max: 100, step: 1, help: 'How much a big loss throws a player off. Tilted players play more hands and bluff more until they cool down.' },
];

type Style = Omit<Profile, 'id' | 'name' | 'group' | 'blurb' | 'avatar' | 'color' | 'random'>;
const style = (s: Partial<Style>): Style => ({
  vpip: 24, pfr: 18, threeBet: 7, aggression: 55, bluff: 30, callDown: 45, trap: 20,
  betSize: 65, overbet: 10, shove: 20, tilt: 20, ...s,
});
const p = (id: string, name: string, group: Profile['group'], avatar: string, color: string, blurb: string, s: Partial<Style>): Profile => ({
  id, name, group, avatar, color, blurb, ...style(s),
});

// Caricatures of public reputations, for fun. Not affiliated with or endorsed by anyone named.
export const PRESETS: Profile[] = [
  p('ivey', 'Phil Ivey', 'Pros', 'PI', '#0a84ff', 'Fearless, balanced aggression. Rarely gives anything away.',
    { vpip: 27, pfr: 22, threeBet: 10, aggression: 72, bluff: 42, callDown: 52, trap: 25, betSize: 70, overbet: 25, shove: 30, tilt: 5 }),
  p('negreanu', 'Daniel Negreanu', 'Pros', 'DN', '#30d158', 'Small-ball: plays lots of pots with small bets and reads.',
    { vpip: 34, pfr: 20, threeBet: 6, aggression: 50, bluff: 30, callDown: 55, trap: 30, betSize: 45, overbet: 5, shove: 12, tilt: 15 }),
  p('hellmuth', 'Phil Hellmuth', 'Pros', 'PH', '#ff9f0a', 'Tight, folds big hands on reads, and does not take bad beats quietly.',
    { vpip: 17, pfr: 12, threeBet: 5, aggression: 45, bluff: 15, callDown: 28, trap: 35, betSize: 60, overbet: 5, shove: 15, tilt: 90 }),
  p('dwan', 'Tom Dwan', 'Pros', 'TD', '#bf5af2', 'Hyper-aggressive. Huge bluffs and overbets in giant pots.',
    { vpip: 42, pfr: 34, threeBet: 16, aggression: 88, bluff: 72, callDown: 50, trap: 10, betSize: 85, overbet: 60, shove: 45, tilt: 15 }),
  p('brunson', 'Doyle Brunson', 'Pros', 'DB', '#a2845e', 'Old-school pressure. Raises, keeps betting, plays 10-2.',
    { vpip: 30, pfr: 23, threeBet: 8, aggression: 78, bluff: 45, callDown: 40, trap: 15, betSize: 80, overbet: 20, shove: 30, tilt: 10 }),
  p('hansen', 'Gus Hansen', 'Pros', 'GH', '#ff453a', 'Plays almost any two cards and attacks constantly.',
    { vpip: 55, pfr: 40, threeBet: 14, aggression: 85, bluff: 65, callDown: 55, trap: 10, betSize: 75, overbet: 30, shove: 40, tilt: 30 }),
  p('antonius', 'Patrik Antonius', 'Pros', 'PA', '#64d2ff', 'Calm, deep-stacked, and loves a big overbet.',
    { vpip: 30, pfr: 24, threeBet: 10, aggression: 75, bluff: 45, callDown: 45, trap: 20, betSize: 80, overbet: 50, shove: 30, tilt: 5 }),
  p('holz', 'Fedor Holz', 'Pros', 'FH', '#5e5ce6', 'Modern solver-style play: balanced and hard to exploit.',
    { vpip: 25, pfr: 21, threeBet: 9, aggression: 62, bluff: 35, callDown: 48, trap: 25, betSize: 60, overbet: 25, shove: 22, tilt: 5 }),
  p('polk', 'Doug Polk', 'Pros', 'DP', '#ffd60a', 'Aggressive heads-up specialist who never lets a pot go easily.',
    { vpip: 33, pfr: 28, threeBet: 13, aggression: 76, bluff: 48, callDown: 50, trap: 18, betSize: 70, overbet: 30, shove: 30, tilt: 20 }),
  p('keating', 'Alan Keating', 'Pros', 'AK', '#ff375f', 'High-stakes gambler. Calls light and plays huge pots.',
    { vpip: 58, pfr: 26, threeBet: 9, aggression: 60, bluff: 50, callDown: 78, trap: 15, betSize: 90, overbet: 40, shove: 45, tilt: 25 }),
  p('moneymaker', 'Chris Moneymaker', 'Pros', 'CM', '#32ade6', 'The amateur who won it all. Brave bluffs at the right time.',
    { vpip: 30, pfr: 17, threeBet: 6, aggression: 52, bluff: 40, callDown: 50, trap: 25, betSize: 65, overbet: 15, shove: 30, tilt: 30 }),
  p('matusow', 'Mike Matusow', 'Pros', 'MM', '#ff6482', 'Talks a lot, gambles a lot, tilts hardest of all.',
    { vpip: 36, pfr: 25, threeBet: 10, aggression: 70, bluff: 45, callDown: 55, trap: 10, betSize: 75, overbet: 25, shove: 45, tilt: 95 }),
  p('carlsen', 'Magnus Carlsen', 'Entertainers', 'MC', '#d1d1d6', 'Chess world champion. Calculates everything, then commits.',
    { vpip: 23, pfr: 19, threeBet: 8, aggression: 60, bluff: 32, callDown: 42, trap: 30, betSize: 65, overbet: 15, shove: 25, tilt: 35 }),
  p('affleck', 'Ben Affleck', 'Entertainers', 'BA', '#8e8e93', 'Former state champion: solid, patient, and well-studied.',
    { vpip: 22, pfr: 17, threeBet: 6, aggression: 58, bluff: 25, callDown: 40, trap: 25, betSize: 65, overbet: 10, shove: 20, tilt: 20 }),
  p('maguire', 'Tobey Maguire', 'Entertainers', 'TM', '#ff9500', 'Legendary home-game crusher. Tight, ruthless, waits for spots.',
    { vpip: 19, pfr: 16, threeBet: 7, aggression: 66, bluff: 22, callDown: 32, trap: 30, betSize: 70, overbet: 15, shove: 25, tilt: 10 }),
  p('tilly', 'Jennifer Tilly', 'Entertainers', 'JT', '#ff2d55', 'Actress and bracelet winner who loves to see flops.',
    { vpip: 38, pfr: 18, threeBet: 5, aggression: 45, bluff: 30, callDown: 60, trap: 25, betSize: 55, overbet: 10, shove: 20, tilt: 25 }),
  p('damon', 'Matt Damon', 'Entertainers', 'MD', '#34c759', 'Rounders energy. Reads souls, bets big when he does.',
    { vpip: 28, pfr: 20, threeBet: 8, aggression: 62, bluff: 38, callDown: 50, trap: 30, betSize: 75, overbet: 20, shove: 30, tilt: 30 }),
  p('romano', 'Ray Romano', 'Entertainers', 'RR', '#c7c7cc', 'Friendly recreational player. Calls a lot, bluffs rarely.',
    { vpip: 40, pfr: 10, threeBet: 3, aggression: 30, bluff: 12, callDown: 70, trap: 15, betSize: 50, overbet: 5, shove: 10, tilt: 20 }),
  p('rock', 'Rock', 'Archetypes', '🪨', '#8e8e93', 'Plays only premiums. When it bets, believe it.',
    { vpip: 11, pfr: 8, threeBet: 3, aggression: 40, bluff: 5, callDown: 20, trap: 30, betSize: 60, overbet: 0, shove: 10, tilt: 5 }),
  p('station', 'Calling Station', 'Archetypes', '📞', '#64d2ff', 'Calls anything, folds nothing, raises never.',
    { vpip: 60, pfr: 5, threeBet: 1, aggression: 10, bluff: 5, callDown: 95, trap: 10, betSize: 50, overbet: 0, shove: 5, tilt: 10 }),
  p('maniac', 'Maniac', 'Archetypes', '🔥', '#ff453a', 'Raises every pot and shoves at the slightest excuse.',
    { vpip: 70, pfr: 55, threeBet: 25, aggression: 95, bluff: 85, callDown: 60, trap: 0, betSize: 100, overbet: 60, shove: 75, tilt: 40 }),
  p('tag', 'TAG Regular', 'Archetypes', '🎯', '#0a84ff', 'Tight-aggressive grinder by the book.',
    { vpip: 21, pfr: 18, threeBet: 8, aggression: 65, bluff: 30, callDown: 40, trap: 20, betSize: 65, overbet: 10, shove: 20, tilt: 10 }),
  p('lag', 'LAG', 'Archetypes', '⚡', '#bf5af2', 'Loose-aggressive: wide ranges, constant pressure.',
    { vpip: 35, pfr: 29, threeBet: 13, aggression: 80, bluff: 55, callDown: 45, trap: 15, betSize: 75, overbet: 30, shove: 35, tilt: 15 }),
  p('nit', 'Nit', 'Archetypes', '🧊', '#d1d1d6', 'Folds until aces. Scared money.',
    { vpip: 8, pfr: 6, threeBet: 2, aggression: 25, bluff: 3, callDown: 15, trap: 40, betSize: 45, overbet: 0, shove: 5, tilt: 5 }),
  p('fish', 'Fish', 'Archetypes', '🐟', '#30d158', 'Plays too many hands and chases every draw.',
    { vpip: 50, pfr: 12, threeBet: 4, aggression: 35, bluff: 25, callDown: 75, trap: 10, betSize: 55, overbet: 10, shove: 20, tilt: 40 }),
];


/** A new custom player, "NPC n", with the default style. */
export const blankProfile = (n: number): Profile =>
  p(`custom-${Date.now().toString(36)}`, `NPC ${n}`, 'Custom', `N${n}`.slice(0, 3), COLORS[(n - 1) % COLORS.length], 'Custom player.', {});

const FIRST = ['Lucky', 'Big', 'Slim', 'Lefty', 'Doc', 'Fast', 'Sunny', 'Honest', 'Tiny', 'Smooth', 'Wild', 'Quiet', 'Cool', 'Old'];
const LAST = ['Lou', 'Sal', 'Eddie', 'Rosa', 'Vinnie', 'Mae', 'Jules', 'Frankie', 'Dot', 'Gus', 'Nina', 'Ray', 'Benny', 'Kat'];
const COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#ff453a', '#64d2ff', '#ffd60a', '#ff375f', '#5e5ce6', '#a2845e'];

/** A new player with a random name and a random but coherent style (PFR ≤ VPIP, 3-bet ≤ PFR). */
export function randomProfile(rng: () => number = Math.random): Profile {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  const r = (lo: number, hi: number, step = 1) => Math.round((lo + rng() * (hi - lo)) / step) * step;
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const vpip = r(10, 60);
  const pfr = r(vpip * 0.3, vpip * 0.9);
  return {
    ...p(`rand-${Date.now().toString(36)}${Math.floor(rng() * 1e4)}`, name, 'Custom', name.split(' ').map((w) => w[0]).join(''), pick(COLORS), 'Randomly generated.', {
      vpip, pfr, threeBet: r(1, Math.max(2, pfr * 0.5)), aggression: r(10, 95), bluff: r(0, 80), callDown: r(10, 90), trap: r(0, 50),
      betSize: r(40, 110, 5), overbet: r(0, 50), shove: r(0, 60), tilt: r(0, 90)
    }),
    random: true,
  };
}

