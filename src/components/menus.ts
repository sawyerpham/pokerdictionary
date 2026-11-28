// The site's pages by menu, for the top bar and the footer.
import { SHELVES } from '../guides/registry';
import { PAGES_ABOUT, TOOLS } from '../study/tools';

interface Item {
  id: string;
  to: string;
  title: string;
  premium?: boolean;
}
interface Menu {
  label: string;
  sections: { title?: string; items: Item[] }[];
}

const tools = (group: string): Item[] =>
  TOOLS.filter((t) => t.group === group && t.slug !== 'daily').map((t) => ({ id: t.slug, to: `/study/${t.slug}`, title: t.title, premium: t.premium }));

const pages = (...ids: string[]): Item[] => PAGES_ABOUT.filter((p) => ids.includes(p.id));

// Grouped by what you came to do, the way poker study sites lay out their menus. Daily flop is its own link.
export const MENUS: Menu[] = [
  { label: 'Practice', sections: [{ title: 'Preflop', items: tools('Preflop') }, { title: 'Postflop', items: tools('Postflop') }] },
  {
    label: 'Tools',
    sections: [
      { title: 'Solver', items: tools('Solver') },
      { title: 'Calculators', items: pages('evaluator', 'chips') },
    ],
  },
  { label: 'Review', sections: [{ items: tools('Review') }] },
  { label: 'Guides', sections: SHELVES.map((s) => ({ title: s.title, items: s.items.map((g) => ({ id: g.slug, to: `/guides/${g.slug}`, title: g.title })) })) },
];
