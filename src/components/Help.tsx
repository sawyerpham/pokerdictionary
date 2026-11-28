import { useRef } from 'react';
import { Link } from 'react-router-dom';

/** A "?" button that opens a short note on what a tool is and why it's worth using. */
export function Help({ id, title, about }: { id: string; title: string; about: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        aria-label={`About ${title}`}
        title={`About ${title}`}
        onClick={(e) => {
          e.preventDefault(); // inside a link's row: open the note, don't follow the link
          e.stopPropagation();
          dialog.current?.showModal();
        }}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/[0.08]"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" />
          <circle cx="8" cy="11.6" r=".4" fill="currentColor" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()} // a click on the backdrop closes it
        onKeyDown={(e) => e.stopPropagation()} // Escape closes the note, not the menu it was opened from
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[12px] border border-[var(--line)] bg-[#0f1011] p-5 text-left text-[var(--text-primary)] shadow-2xl shadow-black/60 backdrop:bg-black/60"
      >
        <h2 className="mb-2 text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="text-[15px] leading-relaxed font-normal text-[var(--text-muted)]">{about}</p>
        <form method="dialog" className="mt-4 flex items-center justify-between gap-3">
          <Link to={`/about#${id}`} onClick={() => dialog.current?.close()} className="flex min-h-9 items-center text-[14px] text-[var(--accent-soft)] hover:underline">
            More in About
          </Link>
          <button className="min-h-9 rounded-[8px] bg-[var(--fill)] px-3 text-[14px] font-medium">Got it</button>
        </form>
      </dialog>
    </>
  );
}
