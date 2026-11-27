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

// Apple-style bar: translucent material, label vs secondary-label for the current page, 44 pt targets.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center px-2.5 text-[15px] transition-colors ${
    isActive ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
      className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgb(22_22_24/0.72)] backdrop-blur-xl backdrop-saturate-150"
    >
      <nav className="mx-auto flex max-w-6xl flex-col items-center px-4 sm:flex-row sm:justify-between">
        <NavLink to="/" className="text-headline flex min-h-11 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--accent)] text-sm text-white">
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
        <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-6rem)] overflow-y-auto border-b border-[var(--line)] bg-[rgb(22_22_24/0.97)] backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <ToolCards onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
