import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { NavLink } from 'react-router-dom';
import { AccountMenu } from './AccountMenu';
import { ToolCards } from './ToolCards';

const LINKS = [
  { to: '/table', label: 'Table' },
  { to: '/evaluator', label: 'Evaluator' },
  { to: '/study', label: 'Study' },
  { to: '/guides', label: 'Guides' },
  { to: '/chips', label: 'Chips' },
  { to: '/settings', label: 'Settings' },
];

// Linear-style bar: small muted links, the current page in full white, 44 px targets.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center px-2.5 text-[14px] transition-colors ${
    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
  }`;

export function NavBar() {
  // The Study menu: a mouse opens it by hovering (and a click goes to /study); a tap opens and closes it.
  const [open, setOpen] = useState(false);
  const mouse = useRef(false);
  const header = useRef<HTMLElement>(null);
  const isMouse = (e: ReactPointerEvent) => (mouse.current = e.pointerType === 'mouse');

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !header.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <header
      ref={header}
      onPointerLeave={(e) => isMouse(e) && setOpen(false)}
      className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgb(8_9_10/0.8)] backdrop-blur-xl backdrop-saturate-150"
    >
      <nav className="mx-auto flex max-w-6xl flex-col items-center px-4 sm:min-h-16 sm:flex-row sm:justify-between">
        <NavLink to="/" className="flex min-h-11 items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
          <span aria-hidden className="text-[20px] leading-none">
            ♣
          </span>
          Poker Dictionary
        </NavLink>
        <div className="flex flex-wrap justify-center">
          {LINKS.map((l) =>
            l.to === '/study' ? (
              <NavLink
                key={l.to}
                to={l.to}
                className={linkClass}
                aria-haspopup="true"
                aria-expanded={open}
                onPointerEnter={(e) => isMouse(e) && setOpen(true)}
                onPointerDown={isMouse}
                onClick={(e) => {
                  // Keyboard (detail 0) and mouse clicks go to /study; a tap toggles the menu instead.
                  if (e.detail !== 0 && !mouse.current) {
                    e.preventDefault();
                    setOpen((o) => !o);
                  } else setOpen(false);
                }}
              >
                {l.label}
              </NavLink>
            ) : (
              <NavLink key={l.to} to={l.to} className={linkClass} onPointerEnter={(e) => isMouse(e) && setOpen(false)} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ),
          )}
          <AccountMenu />
        </div>
      </nav>
      {open && (
        <div className="absolute inset-x-0 top-full mx-auto flex max-w-6xl justify-center px-2 sm:justify-end sm:px-4">
          <div className="max-h-[calc(100dvh-6rem)] w-full overflow-y-auto rounded-b-[12px] border border-t-0 border-[var(--line)] bg-[rgb(15_16_17/0.97)] p-1.5 backdrop-blur-xl sm:w-[34rem]">
            <ToolCards onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
