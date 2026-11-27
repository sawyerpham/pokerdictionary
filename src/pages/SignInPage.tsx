import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadAccount } from '../state/account';

/**
 * Where an emailed sign-in link lands. Signing in takes a press of the button, not just opening the link, so mail
 * scanners that open links can't use it up.
 */
export function SignInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    const res = await fetch('/api/auth/email/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.get('token') ?? '' }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(body.detail ?? 'Something went wrong. Ask for a new link.');
    }
    await loadAccount();
    navigate(body.next ?? '/', { replace: true });
  };

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-title-2">Sign in to Poker Dictionary</h1>
      <button
        type="button"
        onClick={finish}
        disabled={busy}
        className="flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-[17px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
      >
        Finish signing in
      </button>
      {error && <p className="text-[15px] text-rose-400">{error}</p>}
    </main>
  );
}
