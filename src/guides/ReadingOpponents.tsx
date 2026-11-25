import type { Guide } from './registry';
import { SRC } from './sources';
import { PlayerTypes } from './diagrams';
import { Cite, GuideH2, GuideP, GuideTable, Sources } from './ui';

const SOURCES = [SRC.strategy, SRC.vpip, SRC.hud];
const STRATEGY = 1, VPIP = 2, HUD = 3;

function Content() {
  return (
    <>
      <GuideH2 id="two-axes">Player types</GuideH2>
      <GuideP>
        Two questions: tight or loose (how many hands), passive or aggressive (call or raise).<Cite n={STRATEGY} />
      </GuideP>
      <PlayerTypes />
      <GuideTable
        rows={[
          ['Type', 'Against them'],
          ['Tight-passive (Rock, Nit)', 'Steal blinds; believe their raises.'],
          ['Tight-aggressive (TAG)', 'Avoid marginal spots.'],
          ['Loose-passive (Calling Station, Fish)', 'Value bet often; rarely bluff.'],
          ['Loose-aggressive (LAG, Maniac)', 'Call down lighter; let them bluff.'],
        ]}
      />

      <GuideH2 id="stats">VPIP and PFR</GuideH2>
      <GuideP>
        VPIP is how often a player puts money in preflop (blinds excluded).<Cite n={VPIP} /> PFR is how often they raise. The
        gap between them is how often they just call: at 30 / 10, expect lots of calls.<Cite n={HUD} />
      </GuideP>

      <Sources list={SOURCES} />
    </>
  );
}

export const readingGuide: Guide = {
  slug: 'reading-opponents',
  title: 'Reading Opponents',
  description: 'Player types and what VPIP and PFR show.',
  sections: [
    { id: 'two-axes', title: 'Player types' },
    { id: 'stats', title: 'VPIP and PFR' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
