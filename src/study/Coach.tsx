import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { atLeast, useAccount } from '../state/account';
import { BUTTON, PANEL } from './ui';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  images: string[]; // data URLs
}

const MAX_IMAGES = 6;

/** A screenshot shrunk to at most 1600 px on its long side, as a JPEG data URL (DeepSeek scales to ~1300 anyway). */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** **bold** inside a line. */
const inline = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i} className="text-[var(--text-primary)]">{part}</strong> : part));

/** The coach's reply: "##" headings, "-" bullets, numbered lines and **bold**; everything else as paragraphs. */
function Reply({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={out.length} className="ml-5 list-disc space-y-1">{bullets}</ul>);
    bullets = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*] (.*)/);
    if (bullet) {
      bullets.push(<li key={bullets.length}>{inline(bullet[1])}</li>);
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,4} (.*)/);
    out.push(
      heading ? (
        <h3 key={out.length} className="text-headline mt-2 text-[var(--text-primary)]">
          {inline(heading[1])}
        </h3>
      ) : (
        <p key={out.length}>{inline(line)}</p>
      ),
    );
  }
  flush();
  return <div className="space-y-2 text-[15px] leading-relaxed text-[var(--text-muted)]">{out}</div>;
}

/** Send screenshots of a hand and talk it through with an AI coach (DeepSeek, through this site's server). Premium. */
export function Coach() {
  const { me, providers } = useAccount();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [left, setLeft] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const allowed = atLeast(me, 'premium') && providers.coach;

  const add = async (files: Iterable<File>) => {
    const picked = [...files].filter((f) => f.type.startsWith('image/'));
    const shrunk = await Promise.all(picked.map(shrink));
    setImages((old) => [...old, ...shrunk].slice(0, MAX_IMAGES));
  };

  // Paste a screenshot anywhere on the page (Ctrl+V / ⌘V).
  useEffect(() => {
    if (!allowed) return;
    const onPaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files.length) {
        e.preventDefault();
        void add(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [allowed]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); // (newer browsers return a Promise; an effect mustn't)
  }, [msgs, busy]);

  if (me === undefined) return null;
  if (!allowed) {
    return (
      <section className={PANEL}>
        <p className="text-headline">AI coach is a Premium feature</p>
        <p className="mt-1 text-[15px] text-[var(--text-muted)]">
          {!me
            ? 'Sign in (top right) with a Premium account to send hands to your coach.'
            : !providers.coach
              ? 'The coach isn’t set up on this server yet.'
              : 'Your account is Default. Ask the site’s owner or an admin to make it Premium.'}
        </p>
      </section>
    );
  }

  const send = async () => {
    if (busy || (!text.trim() && !images.length)) return;
    const next: Msg[] = [...msgs, { role: 'user', text: text.trim(), images }];
    setMsgs(next);
    setText('');
    setImages([]);
    setBusy(true);
    setError(undefined);
    const res = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) }).catch(() => undefined);
    const body = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      setMsgs(msgs); // put the question back so it can be sent again
      setText(next.at(-1)!.text);
      setImages(next.at(-1)!.images);
      return setError(body?.detail ?? 'The coach couldn’t answer. Check your connection and try again.');
    }
    setMsgs([...next, { role: 'assistant', text: body.reply, images: [] }]);
    setLeft(body.left);
  };

  return (
    <>
      {msgs.length > 0 && (
        <section className={`${PANEL} mb-4 space-y-4`}>
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-[14px] bg-[var(--accent)]/20 p-3">
                {m.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {m.images.map((src, k) => (
                      <img key={k} src={src} alt={`Screenshot ${k + 1}`} className="max-h-48 rounded-[8px]" />
                    ))}
                  </div>
                )}
                {m.text && <p className="text-[15px] whitespace-pre-wrap">{m.text}</p>}
              </div>
            ) : (
              <div key={i} className="max-w-[95%]">
                <p className="mb-1 text-[13px] font-semibold text-[var(--text-primary)]">Coach</p>
                <Reply text={m.text} />
              </div>
            ),
          )}
          {busy && <p className="text-[15px] text-[var(--text-muted)]">Coach is reading the hand…</p>}
          <div ref={end} />
        </section>
      )}

      <section
        className={PANEL}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void add(e.dataTransfer.files);
        }}
      >
        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {images.map((src, k) => (
              <span key={k} className="relative">
                <img src={src} alt={`Screenshot ${k + 1}`} className="h-20 rounded-[8px]" />
                <button
                  type="button"
                  aria-label={`Remove screenshot ${k + 1}`}
                  onClick={() => setImages(images.filter((_, j) => j !== k))}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-third)] text-[13px]"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          aria-label="Your question"
          placeholder={msgs.length ? 'Ask a follow-up…' : 'Paste (Ctrl+V), drop or add a screenshot of a hand, and add anything the coach should know: stakes, reads, what you were unsure about.'}
          className="w-full resize-y rounded-[10px] bg-[var(--bg-main)] p-3 text-[15px] outline-none ring-1 ring-[var(--line)] focus:ring-[var(--accent)]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void send()} disabled={busy || (!text.trim() && !images.length)} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            {msgs.length ? 'Send' : 'Coach me'}
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={images.length >= MAX_IMAGES} className="min-h-11 px-2 text-[15px] text-[var(--accent)] disabled:opacity-40">
            Add screenshot
          </button>
          {msgs.length > 0 && (
            <button type="button" onClick={() => setMsgs([])} disabled={busy} className="min-h-11 px-2 text-[15px] text-[var(--text-muted)]">
              New hand
            </button>
          )}
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void add(e.target.files)} />
          {left !== null && <span className="text-[13px] text-[var(--text-muted)]">{left} replies left today</span>}
        </div>
        {error && <p className="mt-2 text-[15px] text-rose-400">{error}</p>}
        <p className="text-footnote mt-3 text-[var(--text-muted)]">Screenshots and messages go to DeepSeek to write the reply; nothing is stored.</p>
      </section>
    </>
  );
}
