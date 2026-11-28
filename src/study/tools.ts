// The study tools, for the nav menu and the /study page, grouped the way poker study sites do: preflop and postflop
// drills, the solver and its reference data, and reviewing your own play.
export const GROUPS = ['Preflop', 'Postflop', 'Solver', 'Review'] as const;

export const TOOLS: { slug: string; title: string; desc: string; group: (typeof GROUPS)[number]; premium?: boolean }[] = [
  { slug: 'preflop', title: 'Preflop drill', desc: 'Folded to you: raise or fold?', group: 'Preflop' },
  { slug: 'facing', title: 'Facing a raise', desc: 'Answer raises before you.', group: 'Preflop' },
  { slug: 'quiz', title: 'Range quiz', desc: 'Paint a chart from memory.', group: 'Preflop' },
  { slug: 'pushfold', title: 'Push/fold', desc: 'Short-stack shove charts.', group: 'Preflop' },
  { slug: 'daily', title: 'Daily flop', desc: 'One solver-graded flop a day.', group: 'Postflop' },
  { slug: 'trainer', title: 'Trainer', desc: 'Play flop to river vs solver.', group: 'Postflop' },
  { slug: 'sizing', title: 'Bet sizing', desc: 'Check, bet small or bet big?', group: 'Postflop' },
  { slug: 'equity', title: 'Equity drill', desc: 'Guess your equity vs a range.', group: 'Postflop' },
  { slug: 'potodds', title: 'Pot odds', desc: 'Count outs, price your calls.', group: 'Postflop' },
  { slug: 'solver', title: 'Solver', desc: 'Solve flops, turns and rivers.', group: 'Solver' },
  { slug: 'reports', title: 'Board reports', desc: 'How often to c-bet each flop.', group: 'Solver' },
  { slug: 'ranges', title: 'Range builder', desc: 'Paint and save hand ranges.', group: 'Solver' },
  { slug: 'history', title: 'Hand history', desc: 'Find leaks in your hands.', group: 'Review' },
  { slug: 'progress', title: 'Progress', desc: 'Your leaks and trends.', group: 'Review' },
  { slug: 'coach', title: 'AI coach', desc: 'Coaching from a screenshot.', group: 'Review', premium: true },
];
