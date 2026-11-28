// The study tools, for the nav menu and the /study page, grouped the way poker study sites do: preflop and postflop
// drills, the solver and its reference data, and reviewing your own play. `about` is the "?" note: what it is, why use it.
export const GROUPS = ['Preflop', 'Postflop', 'Solver', 'Review'] as const;

export const TOOLS: { slug: string; title: string; about: string; group: (typeof GROUPS)[number]; premium?: boolean }[] = [
  {
    slug: 'preflop',
    title: 'Preflop drill',
    about: 'It’s folded to you: raise or fold, graded against solved opening charts. Opening ranges are the base of every hand, and once they’re automatic you can spend your thinking on the hard spots.',
    group: 'Preflop',
  },
  {
    slug: 'facing',
    title: 'Facing a raise',
    about: 'Someone raised before you: fold, call or 3-bet, graded against solved charts for each seat and stack depth. Most preflop money is lost facing raises, so this is where knowing the charts pays most.',
    group: 'Preflop',
  },
  {
    slug: 'quiz',
    title: 'Range quiz',
    about: 'Paint a whole chart from memory, then see what you missed and what you added. Recalling the full range, not single hands, shows which edges of it you only half know.',
    group: 'Preflop',
  },
  {
    slug: 'pushfold',
    title: 'Push/fold',
    about: 'Charts for shoving all-in or folding with a short stack, and a drill graded against them. With few chips left, push/fold is close to perfect play, so knowing it stops costly guesses late in tournaments.',
    group: 'Preflop',
  },
  {
    slug: 'daily',
    title: 'Daily flop',
    about: 'One solved flop a day, the same for everyone: pick your move and see what each option is worth. A small daily habit keeps your postflop instincts sharp.',
    group: 'Postflop',
  },
  {
    slug: 'trainer',
    title: 'Trainer',
    about: 'Play hands from flop to river against an opponent that follows the solver. Each decision is graded by the share of the pot it gives up, so you learn which mistakes are big and which barely matter.',
    group: 'Postflop',
  },
  {
    slug: 'sizing',
    title: 'Bet sizing',
    about: 'Flop spots where you choose check, bet small or bet big, graded by the solver. The right size wins more with strong hands and loses less with bluffs, and few players ever practice it.',
    group: 'Postflop',
  },
  {
    slug: 'equity',
    title: 'Equity drill',
    about: 'Guess how often your hand wins against an opponent’s range, then see the exact number. A feel for equity tells you when betting, calling or folding pays, without a calculator.',
    group: 'Postflop',
  },
  {
    slug: 'potodds',
    title: 'Pot odds',
    about: 'Count outs and work out how often a call needs to win. Comparing your chance to win with the price of the call is poker’s most basic math, and fast estimates stop losing calls.',
    group: 'Postflop',
  },
  {
    slug: 'solver',
    title: 'Solver',
    about: 'Set ranges, a board, stacks and bet sizes, and solve the spot in your browser. A solver finds the strategy that can’t be exploited, so you can check your own plans against it.',
    group: 'Solver',
  },
  {
    slug: 'reports',
    title: 'Board reports',
    about: 'How often the solver bets each kind of flop, and at what size, across the whole flop library. Patterns across boards teach you which flops favor you without solving each one.',
    group: 'Solver',
  },
  {
    slug: 'ranges',
    title: 'Range builder',
    about: 'Paint hand ranges on the grid and save them for the solver and drills. Thinking in ranges rather than single hands is how strong players read spots and plan bets.',
    group: 'Solver',
  },
  {
    slug: 'history',
    title: 'Hand history',
    about: 'Paste or upload hand histories for your results, HUD stats and preflop choices checked against the charts. Your own hands show the leaks you actually have, not the ones in a textbook.',
    group: 'Review',
  },
  {
    slug: 'progress',
    title: 'Progress',
    about: 'Every drill answer and trainer decision in one place: where you’re improving and where you lose the most. It shows whether study is working and what to practice next.',
    group: 'Review',
  },
  {
    slug: 'coach',
    title: 'AI coach',
    about: 'Send screenshots of a hand and talk it through with an AI coach. A second opinion on real hands helps when you can’t tell why a play went wrong.',
    group: 'Review',
    premium: true,
  },
];

// The pages outside /study that have "?" notes and About sections too.
export const PAGES_ABOUT = [
  { id: 'table', to: '/table', title: 'Table', about: 'Play no-limit hold’em against computer players you can customize, or watch them play each other. A free place to try ideas, with an equity hint to check your reads.' },
  { id: 'evaluator', to: '/evaluator', title: 'Evaluator', about: 'Enter the cards at a table and see each player’s chance to win as the hand runs out. Good for settling arguments and for a feel of how far ahead or behind a hand is.' },
  { id: 'chips', to: '/chips', title: 'Chip calculator', about: 'Chip colors, values and how many of each every player starts with, for a home game. A good split keeps the game moving and makes raising the blinds simple.' },
];
