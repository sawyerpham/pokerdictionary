// Upswing's six-max opening ranges (see SRC.upswingRfi), and the shorthand they're written in.
const RANKS = 'AKQJT98765432';
const r = (c: string) => RANKS.indexOf(c);

/** Expands range shorthand ("55+, A2s+, KQo") into hand names ("AKs", "QJo", "77"). */
export function expandRange(text: string): Set<string> {
  const out = new Set<string>();
  for (const tok of text.split(',').map((t) => t.trim())) {
    const plus = tok.endsWith('+');
    const t = plus ? tok.slice(0, -1) : tok;
    if (t.length === 2 && t[0] === t[1]) {
      for (let k = r(t[0]); k >= (plus ? 0 : r(t[0])); k--) out.add(RANKS[k] + RANKS[k]);
    } else {
      const [hi, lo, kind] = t;
      for (let k = r(lo); k > (plus ? r(hi) : r(lo) - 1); k--) out.add(hi + RANKS[k] + kind);
    }
  }
  return out;
}

export const RFI: { seat: string; range: string; color: string; ink: string }[] = [
  { seat: 'UTG', color: '#9ec5f4', ink: '#0d366b', range: '55+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, AJo+, KQo' },
  { seat: 'HJ', color: '#6da7ec', ink: '#0d366b', range: '44+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, ATo+, KJo+, QJo' },
  { seat: 'CO', color: '#3987e5', ink: '#ffffff', range: '22+, A2s+, K8s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, ATo+, KTo+, QTo+, JTo' },
  { seat: 'BTN', color: '#256abf', ink: '#ffffff', range: '22+, A2s+, K3s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, 43s, A2o+, K9o+, Q9o+, J9o+, T9o' },
  { seat: 'SB', color: '#184f95', ink: '#ffffff', range: '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 95s+, 84s+, 74s+, 63s+, 53s+, 43s, 32s, A2o+, K8o+, Q8o+, J8o+, T8o+, 98o' },
];

// Seats that can be first into the pot, in acting order, named as on the table. The big blind never opens.
export const SEATS: Record<number, string[]> = {
  2: ['BTN'],
  3: ['BTN', 'SB'],
  4: ['UTG', 'BTN', 'SB'],
  5: ['UTG', 'CO', 'BTN', 'SB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
};
