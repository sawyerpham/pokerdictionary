// NPC decisions: hand strength (Chen percentile preflop, Monte Carlo equity after) filtered through a Profile.
import { equity, preflopPercentile, type Rng } from './cards.ts';
import { legal, totalPot, type Action, type Table } from './holdem.ts';
import type { Profile } from './profiles.ts';

/** Profile knobs after tilt (0..1) loosens and heats them up. */
function tilted(p: Profile, tilt: number) {
  const up = (v: number, by: number) => Math.min(100, v + tilt * by);
  return { ...p, vpip: up(p.vpip, 25), pfr: up(p.pfr, 15), aggression: up(p.aggression, 20), bluff: up(p.bluff, 30), callDown: up(p.callDown, 15), shove: up(p.shove, 25) };
}

export function decide(t: Table, profile: Profile, tilt = 0, rng: Rng = Math.random): Action {
  const L = legal(t);
  if (!L || t.toAct === null) return { type: 'check' };
  const p = tilted(profile, tilt);
  const s = t.seats[t.toAct];
  const pot = totalPot(t);
  const chance = (pct: number) => rng() * 100 < pct;
  const passive: Action = L.canCheck ? { type: 'check' } : { type: 'fold' };
  const call: Action = { type: 'call' };
  // Raise to a street total; within 15% of all in, just shove.
  const raiseTo = (to: number): Action => {
    if (!L.canRaise) return L.canCheck ? passive : call;
    const x = Math.max(L.minTo, Math.min(L.maxTo, Math.round(to)));
    return { type: 'raise', to: x >= L.maxTo * 0.85 ? L.maxTo : x };
  };
  const shove: Action = L.canRaise ? { type: 'raise', to: L.maxTo } : call;
  const stackBb = (s.stack + s.bet) / t.bb;
  const commitShare = L.toCall / Math.max(1, s.stack); // share of the stack a call costs

  if (t.street === 'preflop') {
    const pct = preflopPercentile(s.hole) * 100; // 0 = aces
    const level = t.currentBet / t.bb; // 1 = unopened
    if (level <= 1) {
      if (stackBb < 15 && pct < 20 + p.shove / 2) return shove;
      if (pct <= p.pfr) {
        const limpers = t.seats.filter((o) => o.inHand && o.bet === t.bb && o.lastAction?.type === 'call').length;
        return raiseTo(t.bb * (2 + p.betSize / 60 + limpers));
      }
      if (pct <= p.vpip) return L.canCheck ? passive : call;
      if (chance(p.bluff / 12)) return raiseTo(t.bb * (2 + p.betSize / 60)); // steal
      return passive;
    }
    // Facing a raise: ranges shrink as the raise grows.
    const squeeze = level > 9 ? 0.35 : level > 4 ? 0.65 : 1;
    if (pct <= p.threeBet * squeeze || (pct < 3 && level <= 25)) {
      if (level > 9 || stackBb < 30 || chance(p.shove / 4)) return pct < 4 || chance(p.shove / 2) ? shove : call;
      return raiseTo(t.currentBet * (2.6 + p.betSize / 100));
    }
    if (chance(p.bluff / 20) && level <= 4) return raiseTo(t.currentBet * 3); // light 3-bet
    const callRange = p.vpip * (0.8 + p.callDown / 250) * squeeze;
    if (pct <= callRange && (commitShare < 0.35 || pct < 6 + p.callDown / 10)) return call;
    return passive;
  }

  const opponents = t.seats.filter((o, i) => o.inHand && i !== t.toAct).length;
  const eq = equity(s.hole, t.board, opponents, 250, rng);
  const strength = eq ** (1 / opponents); // roughly heads-up equity vs one random hand
  const spr = s.stack / Math.max(1, pot);
  const size = (frac: number) => (L.canCheck ? 0 : t.currentBet) + Math.max(t.bb, pot * frac * (0.85 + rng() * 0.3));
  const betFrac = chance(p.overbet * 0.35) ? 1.5 : p.betSize / 100;

  if (L.canCheck) {
    if (strength > 0.82) {
      if (chance(p.trap * 0.6) && t.street !== 'river') return passive;
      return spr < 1.2 || chance(p.shove * 0.3) ? shove : raiseTo(size(betFrac));
    }
    if (strength > 0.64 && chance(p.aggression)) return spr < 0.8 ? shove : raiseTo(size(betFrac));
    if (strength > 0.48 && chance(p.aggression * 0.35)) return raiseTo(size(p.betSize / 150));
    if (chance((p.bluff * 0.45) / opponents)) return chance(p.shove * 0.15) ? shove : raiseTo(size(betFrac));
    return passive;
  }

  // Facing a bet. Equity vs random hands flatters us, so a timid caller discounts it more.
  const potOdds = L.toCall / (pot + L.toCall);
  const adjusted = eq * (0.7 + p.callDown / 200);
  if (strength > 0.85) {
    if (chance(p.trap * 0.5) && t.street !== 'river') return call;
    if (chance(p.aggression * 0.7)) return spr < 1.5 || chance(p.shove * 0.4) ? shove : raiseTo(t.currentBet + (pot + L.toCall) * (p.betSize / 100));
    return call;
  }
  if (chance(p.bluff * 0.08) && commitShare < 0.5) return raiseTo(t.currentBet * 2.5 + pot * 0.3);
  if (adjusted >= potOdds && (commitShare < 0.6 || adjusted > 0.5 || chance(p.callDown / 3))) return call;
  return passive;
}

/** Tilt after a hand: a big loss (in big blinds) pushes it up by the profile's tilt; otherwise it cools. */
export function nextTilt(tilt: number, netBb: number, profile: Profile): number {
  if (netBb <= -25) return Math.min(1, tilt + (profile.tilt / 100) * 0.6);
  return tilt * 0.8;
}
