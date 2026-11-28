import { atLeast, useAccount } from '../state/account';

/** Marks a premium tool: yellow "Premium" when it's locked for you, green "Unlocked" when your account has it. */
export function PremiumBadge() {
  const unlocked = useAccount((s) => atLeast(s.me, 'premium'));
  return (
    <span className={`rounded-full px-1.5 text-[10px] font-semibold ${unlocked ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
      {unlocked ? 'Unlocked' : 'Premium'}
    </span>
  );
}
