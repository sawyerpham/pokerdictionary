import { Fragment, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AccountMenu } from './AccountMenu';
import { GearIcon } from './GearIcon';
import { MENUS } from './menus';
import { PremiumBadge } from './PremiumBadge';

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
      <nav className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center px-4 lg:min-h-16 lg:grid-cols-[1fr_auto_1fr]">
        <NavLink to="/" className="flex min-h-11 items-center gap-2 justify-self-start text-[17px] font-semibold tracking-[-0.02em]">
          <span aria-hidden className="text-[20px] leading-none">
            ♣
          </span>
          Poker Dictionary
        </NavLink>
        <div className="order-last col-span-2 flex flex-wrap items-center justify-center lg:order-none lg:col-span-1">
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
                </button>
                {open === m.label && (
                  <div
                    id={id}
                    className={`absolute inset-x-2 top-full max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[12px] border border-[var(--line)] bg-[#0f1011] p-2 shadow-2xl shadow-black/60 lg:inset-x-auto lg:left-1/2 lg:mt-2.5 lg:w-max lg:-translate-x-1/2`}
                  >
                    <div className="grid grid-cols-1 gap-x-1 gap-y-3 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none lg:auto-cols-[13rem]">
                      {m.sections.map((s, k) => (
                        <section key={k} aria-label={s.title ?? m.label}>
                          {s.title && <h2 className="px-2.5 pt-1 pb-1.5 text-[12px] font-medium text-[var(--text-muted)]">{s.title}</h2>}
                          <ul>
                            {s.items.map((it) => (
                              <li key={it.to} className="flex items-center gap-1">
                                {it.soon ? (
                                  <span aria-disabled className="flex min-h-9 flex-1 items-center gap-1.5 px-2.5 text-[14px] font-medium text-[var(--text-muted)]">
                                    {it.title}
                                    <span className="rounded-full bg-white/[0.08] px-1.5 text-[10px] font-semibold">Soon</span>
                                  </span>
                                ) : (
                                <NavLink
                                  to={it.to}
                                  onClick={close}
                                  className={({ isActive }) =>
                                    `flex min-h-9 flex-1 items-center gap-1.5 rounded-[8px] px-2.5 text-[14px] font-medium transition-colors hover:bg-white/[0.06] ${isActive ? 'bg-white/[0.06]' : ''}`
                                  }
                                >
                                  {it.title}
                                  {it.premium && <PremiumBadge />}
                                </NavLink>
                                )}
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
        </div>
        <div className="flex items-center justify-self-end">
          <AccountMenu />
          <NavLink
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className={({ isActive }) => `${linkClass(isActive)} min-w-11 justify-center`}
            onPointerEnter={(e) => isMouse(e) && close()}
          >
            <GearIcon />
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
