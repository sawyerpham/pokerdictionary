import { Link } from 'react-router-dom';
import { SHELVES } from '../guides/registry';
import { MENUS } from './menus';

// Every tab and subtab again, then the pages about the site. Guides are listed by level, each opening its first one.
const COLUMNS = [
  ...MENUS.filter((m) => m.label !== 'Guides').map((m) => ({
    title: m.label,
    // Daily flop is a link of its own in the top bar; here it sits with the other ways to play. Unbuilt pages are left out.
    items: [...m.sections.flatMap((s) => s.items).filter((it) => !it.soon), ...(m.label === 'Play' ? [{ to: '/study/daily', title: 'Daily flop' }] : [])],
  })),
  { title: 'Guides', items: SHELVES.map((s) => ({ to: `/guides/${s.items[0].slug}`, title: s.title })) },
  { title: 'Site', items: [{ to: '/about', title: 'About' }, { to: '/privacy', title: 'Privacy' }, { to: '/settings', title: 'Settings' }] },
];

export function Footer() {
  return (
    <footer className="mt-[45dvh] border-t border-[var(--line)] text-[13px] leading-snug sm:mt-24">
      <nav aria-label="Footer" className="mx-auto grid max-w-6xl grid-cols-[auto_auto] justify-center gap-x-16 gap-y-4 px-4 py-6 sm:flex sm:flex-wrap">
        {COLUMNS.map((c) => {
          const long = c.items.length > 5; // two columns, so the footer stays short
          return (
            <section key={c.title} className={long ? 'col-span-2' : ''}>
              <h2 className="mb-0.5 font-medium">{c.title}</h2>
              <ul className={long ? 'columns-2 gap-x-4' : ''}>
                {c.items.map((it) => (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      onClick={() => window.scrollTo(0, 0)}
                      className="flex min-h-6 items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] pointer-coarse:min-h-9"
                    >
                      {it.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
    </footer>
  );
}
