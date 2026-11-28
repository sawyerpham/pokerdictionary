import { Fragment, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SHELVES } from '../guides/registry';
import { PAGES_ABOUT, TOOLS } from '../study/tools';
import { AccountMenu } from './AccountMenu';
import { Help } from './Help';

interface Item {
  id: string;
  to: string;
  title: string;
  about?: string;
  premium?: boolean;
}
interface Menu {
  label: string;
  sections: { title?: string; items: Item[] }[];
}

const tools = (group: string): Item[] =>
  TOOLS.filter((t) => t.group === group && t.slug !== 'daily').map((t) => ({ id: t.slug, to: `/study/${t.slug}`, title: t.title, about: t.about, premium: t.premium }));

const pages = (...ids: string[]): Item[] => PAGES_ABOUT.filter((p) => ids.includes(p.id));

// Grouped by what you came to do, the way poker study sites lay out their menus. Daily flop is its own link.
const MENUS: Menu[] = [
  { label: 'Practice', sections: [{ title: 'Preflop', items: tools('Preflop') }, { title: 'Postflop', items: tools('Postflop') }] },
  {
    label: 'Tools',
    sections: [
      { title: 'Play', items: pages('table') },
      { title: 'Solver', items: tools('Solver') },
      { title: 'Calculators', items: pages('evaluator', 'chips') },
    ],
  },
  { label: 'Review', sections: [{ items: tools('Review') }] },
  { label: 'Guides', sections: SHELVES.map((s) => ({ title: s.title, items: s.items.map((g) => ({ id: g.slug, to: `/guides/${g.slug}`, title: g.title })) })) },
];

const linkClass = (active: boolean) =>
  `flex min-h-11 items-center gap-1 px-2.5 text-[14px] transition-colors ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`;

export function NavBar() {
  // Menus: a mouse opens one by hovering; a tap or a key press opens and closes it.
  const [open, setOpen] = useState<string>();
  const mouse = useRef(false);
  const header = useRef<HTMLElement>(null);
  const { pathname, key } = useLocation();
  const isMouse = (e: ReactPointerEvent) => (mouse.current = e.pointerType === 'mouse');
  const close = () => setOpen(undefined);

  useEffect(close, [key]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !header.current?.contains(e.target as Node) && close();
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const plain = (to: string, label: string) => (
    <NavLink to={to} end className={({ isActive }) => linkClass(isActive)} onPointerEnter={(e) => isMouse(e) && close()}>
      {label}
    </NavLink>
  );

  return (
    <header
      ref={header}
      onPointerLeave={(e) => isMouse(e) && close()}
      className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgb(8_9_10/0.8)] backdrop-blur-xl backdrop-saturate-150"
    >
      <nav className="mx-auto flex max-w-6xl flex-col items-center px-4 sm:min-h-16 sm:flex-row sm:justify-between">
        <NavLink to="/" className="flex min-h-11 items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
          <span aria-hidden className="text-[20px] leading-none">
            ♣
          </span>
          Poker Dictionary
        </NavLink>
        <div className="flex flex-wrap items-center justify-center">
          {MENUS.map((m) => {
            const items = m.sections.flatMap((s) => s.items);
            const here = items.some((it) => pathname === it.to) || (m.label === 'Guides' && pathname.startsWith('/guides'));
            const id = `menu-${m.label.toLowerCase()}`;
            const menu = (
              <div key={m.label} className="lg:relative">
                <button
                  type="button"
                  aria-expanded={open === m.label}
                  aria-controls={id}
                  className={linkClass(here || open === m.label)}
                  onPointerEnter={(e) => isMouse(e) && setOpen(m.label)}
                  onPointerDown={isMouse}
                  onClick={() => (mouse.current ? setOpen(m.label) : setOpen((o) => (o === m.label ? undefined : m.label)))}
                >
                  {m.label}
                  <svg viewBox="0 0 10 6" aria-hidden className={`h-1.5 w-2.5 transition-transform ${open === m.label ? 'rotate-180' : ''}`}>
                    <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {open === m.label && (
                  <div
                    id={id}
                    className={`absolute inset-x-2 top-full max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[12px] border border-[var(--line)] bg-[#0f1011] p-2 shadow-2xl shadow-black/60 lg:inset-x-auto lg:right-0 lg:mt-1 lg:w-max`}
                  >
                    <div className="grid grid-cols-1 gap-x-1 gap-y-3 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none lg:auto-cols-[13rem]">
                      {m.sections.map((s, k) => (
                        <section key={k} aria-label={s.title ?? m.label}>
                          {s.title && <h2 className="px-2.5 pt-1 pb-1.5 text-[12px] font-medium text-[var(--text-muted)]">{s.title}</h2>}
                          <ul>
                            {s.items.map((it) => (
                              <li key={it.to} className="flex items-center gap-1">
                                <NavLink
                                  to={it.to}
                                  onClick={close}
                                  className={({ isActive }) =>
                                    `flex min-h-9 flex-1 items-center gap-1.5 rounded-[8px] px-2.5 text-[14px] font-medium transition-colors hover:bg-white/[0.06] ${isActive ? 'bg-white/[0.06]' : ''}`
                                  }
                                >
                                  {it.title}
                                  {it.premium && <span className="rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-300">Premium</span>}
                                </NavLink>
                                {it.about && <Help id={it.id} title={it.title} about={it.about} />}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
            // Daily flop sits right after Practice.
            return m.label === 'Practice' ? [menu, <Fragment key="daily">{plain('/study/daily', 'Daily flop')}</Fragment>] : menu;
          })}
          {plain('/about', 'About')}
          <NavLink
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className={({ isActive }) => `${linkClass(isActive)} min-w-11 justify-center`}
            onPointerEnter={(e) => isMouse(e) && close()}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </NavLink>
          <AccountMenu />
        </div>
      </nav>
    </header>
  );
}
