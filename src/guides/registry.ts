import type { ComponentType } from 'react';
import { overviewGuide } from './PokerOverview';
import { handRankingsGuide } from './HandRankings';
import { preflopGuide } from './Preflop';
import { fundamentalsGuide } from './Fundamentals';
import { positionsGuide } from './Positions';
import { bluffingGuide } from './ArtOfBluffing';
import { betSizingGuide } from './BetSizing';
import { readingGuide } from './ReadingOpponents';
import { mentalGameGuide } from './MentalGame';
import { tournamentGuide } from './TournamentVsCash';
import { homeGamesGuide } from './HomeGames';

export interface GuideSection {
  /** Anchor id of the h2 this entry links to. */
  id: string;
  title: string;
}

export interface Guide {
  slug: string;
  title: string;
  /** One-liner shown under the title in the article header. */
  description: string;
  /** Drives the "On this page" outline; ids must match the GuideH2 ids in Content. */
  sections: GuideSection[];
  Content: ComponentType;
}

/** Sidebar shelves by level, in reading order. */
export const SHELVES: { title: string; items: Guide[] }[] = [
  { title: 'Beginner', items: [overviewGuide, handRankingsGuide, preflopGuide, homeGamesGuide] },
  { title: 'Intermediate', items: [fundamentalsGuide, positionsGuide, tournamentGuide, readingGuide, mentalGameGuide] },
  { title: 'Advanced', items: [bluffingGuide, betSizingGuide] },
];

export const GUIDES = SHELVES.flatMap((s) => s.items);
