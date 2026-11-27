import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { deleteAccount, signOut, useAccount } from '../state/account';
import { INPUT } from './RuleControls';

const BUTTON = 'flex min-h-11 w-full items-center justify-center rounded-full px-5 text-[15px] font-semibold transition hover:brightness-110 disabled:opacity-40';

/** Sign in (Google or an emailed link) or, when signed in, your account. Hidden when no sign-in is set up. */
export function AccountMenu() {
  const { me, providers } = useAccount();
  const location = useLocation();
  const failed = new URLSearchParams(location.search).get('signin') === 'failed';
  const [open, setOpen] = useState(failed);
  if (me === undefined || (!me && !providers.google && !providers.email)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={me ? `Account: ${me.email}` : 'Sign in'}
        className="flex min-h-11 items-center px-2.5 text-[15px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        {me ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-semibold text-white">
            {(me.name ?? me.email)[0].toUpperCase()}
          </span>
        ) : (
          'Sign in'
        )}
      </button>
      {open && <AccountDialog failed={failed} next={location.pathname} onClose={() => setOpen(false)} />}
    </>
  );
}

function AccountDialog({ failed, next, onClose }: { failed: boolean; next: string; onClose: () => void }) {
  const { me, providers } = useAccount();
  const ref = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | undefined>(failed ? 'Google sign-in didn’t work. Try again.' : undefined);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const sendLink = async () => {
    setSending(true);
    const res = await fetch('/api/auth/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, next }) }).catch(() => undefined);
    setSending(false);
    setStatus(res?.ok ? `Check ${email} for a sign-in link. It works once, for 15 minutes.` : ((await res?.json().catch(() => undefined))?.detail ?? 'Something went wrong. Try again.'));
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="m-auto w-[min(24rem,calc(100%-2rem))] rounded-[14px] bg-[var(--bg-second)] p-5 text-[var(--text-primary)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {me ? (
        <div className="flex flex-col gap-3">
          <p className="text-headline">{me.name ?? 'Signed in'}</p>
          <p className="-mt-2 text-[15px] text-[var(--text-muted)]">{me.email}</p>
          <p className="text-[15px] text-[var(--text-muted)]">Your ranges, drill progress, settings and players sync to this account.</p>
          <button type="button" onClick={() => signOut().then(() => ref.current?.close())} className={`${BUTTON} bg-[var(--bg-third)]`}>
            Sign out
          </button>
          <button
            type="button"
            onClick={() => confirm('Delete your account and everything synced to it? What’s saved in this browser stays.') && deleteAccount().then(() => ref.current?.close())}
            className="min-h-11 text-[15px] text-rose-400"
          >
            Delete account
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-headline">Sign in</p>
          <p className="-mt-1 text-[15px] text-[var(--text-muted)]">Keep your ranges, drill progress, settings and players on every device.</p>
          {providers.google && (
            <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className={`${BUTTON} bg-white text-zinc-900`}>
              Continue with Google
            </a>
          )}
          {providers.google && providers.email && <p className="text-center text-[13px] text-[var(--text-muted)]">or</p>}
          {providers.email && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendLink();
              }}
              className="flex flex-col gap-2"
            >
              <input type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${INPUT} min-h-11`} />
              <button type="submit" disabled={sending} className={`${BUTTON} bg-[var(--accent)] text-white`}>
                Email me a sign-in link
              </button>
            </form>
          )}
          {status && <p className="text-[15px]">{status}</p>}
          <a href="/privacy" className="text-center text-[13px] text-[var(--text-muted)] hover:underline">
            Privacy
          </a>
        </div>
      )}
    </dialog>
  );
}
