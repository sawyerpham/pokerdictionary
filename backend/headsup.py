"""Heads-up no-limit hold'em between two people, dealt on the server so neither browser ever sees the other's cards.

The rules mirror the browser engine (src/engine/holdem.ts): the button posts the small blind and acts first before the
flop, a raise must be at least the last full raise, an all-in short of that doesn't reopen the betting, and a bet
nobody could call goes back. Cards are 0..51 as there: rank = c >> 2 (0 = deuce .. 12 = ace), suit = c & 3.
"""
import secrets
import time
from dataclasses import dataclass, field

# What the host can pick: blinds (keyed by the big blind), the buy-in in big blinds, and seconds to act (0 = no clock).
STAKES = {2: 1, 5: 2, 10: 5, 50: 25, 200: 100}
BUY_INS = (40, 100, 200, 300)
TIMERS = (0, 15, 30, 60, 120)
NEXT_HAND = 4.0  # seconds a finished hand stays on screen before the next deal
GRACE = 2.0  # added to the clock so the deal and chip animations don't eat into it
DEAL = secrets.SystemRandom()

# ------------------------------------------------------------------ hand ranking

RANK_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace']
PLURAL = ['Deuces', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces']


def straight_top(mask: int) -> int:
    """Highest straight in a 13-bit rank mask, as its top rank; -1 if none. The wheel (A-5) is 3."""
    for top in range(12, 3, -1):
        run = 0b11111 << (top - 4)
        if mask & run == run:
            return top
    return 3 if mask & 0b1000000001111 == 0b1000000001111 else -1


def evaluate(cards: list[int]) -> int:
    """Score of the best five-card hand in 5-7 cards. Higher wins; equal scores split. Same scale as cards.ts."""
    counts = [0] * 13
    suits = [0] * 4
    for c in cards:
        counts[c >> 2] += 1
        suits[c & 3] |= 1 << (c >> 2)

    def score(cat: int, ranks: list[int]) -> int:
        s = cat
        for r in ranks[:5]:
            s = s * 13 + r
        return s * 13 ** max(0, 5 - len(ranks))

    for m in suits:
        if m.bit_count() >= 5 and (sf := straight_top(m)) >= 0:
            return score(8, [sf])
    by = sorted((r for r in range(13) if counts[r]), key=lambda r: (-counts[r], -r))
    a, b = by[0], by[1] if len(by) > 1 else -1

    def kick(*skip: int) -> list[int]:
        return sorted((r for r in by if r not in skip), reverse=True)

    if counts[a] == 4:
        return score(7, [a, max(r for r in by if r != a)])
    if counts[a] == 3 and b >= 0 and counts[b] >= 2:
        return score(6, [a, b])
    flush = next((m for m in suits if m.bit_count() >= 5), 0)
    if flush:
        return score(5, [r for r in range(12, -1, -1) if flush >> r & 1])
    if (st := straight_top(suits[0] | suits[1] | suits[2] | suits[3])) >= 0:
        return score(4, [st])
    if counts[a] == 3:
        return score(3, [a, *kick(a)[:2]])
    if counts[a] == 2 and counts[b] == 2:
        return score(2, [a, b, *kick(a, b)[:1]])
    if counts[a] == 2:
        return score(1, [a, *kick(a)[:3]])
    return score(0, kick())


def describe(score: int) -> str:
    cat, r1, r2 = score // 13 ** 5, score // 13 ** 4 % 13, score // 13 ** 3 % 13
    return [
        f'{RANK_NAMES[r1]} High', f'Pair of {PLURAL[r1]}', f'Two Pair, {PLURAL[r1]} and {PLURAL[r2]}', f'Three {PLURAL[r1]}',
        f'{RANK_NAMES[r1]}-high Straight', f'{RANK_NAMES[r1]}-high Flush', f'{PLURAL[r1]} full of {PLURAL[r2]}', f'Four {PLURAL[r1]}',
        'Royal Flush' if r1 == 12 else f'{RANK_NAMES[r1]}-high Straight Flush',
    ][cat]


# ------------------------------------------------------------------ the game

@dataclass
class Seat:
    name: str
    token: str  # sha256 of the seat's secret; the secret only ever goes to its owner's browser
    stack: int = 0
    hole: list[int] = field(default_factory=list)
    in_hand: bool = False
    folded: bool = False
    all_in: bool = False
    bet: int = 0  # put in on this street
    committed: int = 0  # put in this hand
    acted: bool = False
    raise_closed: bool = False  # acted since the last full raise: a short all-in can't reopen it
    seen: float = 0.0  # last time this player's browser checked in
    last: dict | None = None  # this street's last action, for the bubble beside the seat
    user: int | None = None  # the signed-in account sitting here, whose record the result goes to


@dataclass
class Game:
    id: str
    seats: list[Seat]  # one until the friend joins
    sb: int = 5
    bb: int = 10
    start: int = 1000  # each player's chips at the start of a match
    timer: int = 30  # seconds to act; 0 for no clock
    button: int = 1  # moves to seat 0 on the first hand
    hand_no: int = 0
    deck: list[int] = field(default_factory=list)
    board: list[int] = field(default_factory=list)
    street: str = 'waiting'  # waiting, preflop, flop, turn, river, done, over
    to_act: int | None = None
    current_bet: int = 0
    min_raise: int = 10
    pot: int = 0
    winners: list[dict] = field(default_factory=list)
    showdown: bool = False
    log: list[dict] = field(default_factory=list)
    next_at: float = 0.0  # when the next hand deals, once this one is done
    version: int = 0  # goes up on every change, for long polling
    turn_ends: float = 0.0  # when the player to act runs out of time
    last_move: float = field(default_factory=time.time)  # a player's last move, for closing idle tables
    recorded: bool = False  # this match's result is saved

    def bump(self) -> None:
        self.version += 1
        self.turn_ends = time.time() + self.timer + GRACE if self.timer and self.to_act is not None else 0.0

    # -------------------------------------------------------------- dealing

    def start_hand(self) -> None:
        if any(s.stack == 0 for s in self.seats):
            self.street, self.to_act = 'over', None
            return self.bump()
        for s in self.seats:
            s.hole, s.in_hand, s.folded, s.all_in, s.bet, s.committed, s.acted, s.raise_closed, s.last = [], True, False, False, 0, 0, False, False, None
        self.hand_no += 1
        self.button = 1 - self.button
        self.deck = list(range(52))
        DEAL.shuffle(self.deck)
        self.board, self.pot, self.winners, self.showdown, self.log = [], 0, [], False, []
        self.street = 'preflop'
        # Heads-up the button posts the small blind and acts first before the flop.
        sb, bb = self.button, 1 - self.button
        for i, amount in ((sb, self.sb), (bb, self.bb)):
            paid = self._put(self.seats[i], amount)
            self.seats[i].last = {'type': 'post', 'amount': paid}
            self.log.append({'k': 'post', 's': i, 'a': paid})
        self.current_bet, self.min_raise = self.bb, self.bb
        for _ in range(2):
            for i in (bb, sb):  # one card at a time, starting left of the button
                self.seats[i].hole.append(self.deck.pop())
        self.to_act = sb if self._can_act(sb) else (bb if self._can_act(bb) else None)
        self._settle()
        self.bump()

    def advance(self) -> None:
        """Time passing: the next hand deals once the last has been on screen long enough, and a player out of time
        checks if they can and folds if they can't."""
        now = time.time()
        if self.street == 'done' and now >= self.next_at:
            self.start_hand()
        elif self.to_act is not None and self.turn_ends and now >= self.turn_ends:
            L = self.legal(self.to_act)
            self.act(self.to_act, 'check' if L and L['canCheck'] else 'fold', None, timeout=True)

    # -------------------------------------------------------------- betting

    def _can_act(self, i: int) -> bool:
        s = self.seats[i]
        return s.in_hand and not s.all_in

    @staticmethod
    def _put(s: Seat, amount: int) -> int:
        a = min(amount, s.stack)
        s.stack -= a
        s.bet += a
        s.committed += a
        if s.stack == 0:
            s.all_in = True
        return a

    def legal(self, i: int) -> dict | None:
        if self.to_act != i:
            return None
        s = self.seats[i]
        to_call = min(self.current_bet - s.bet, s.stack)
        max_to = s.bet + s.stack
        can_raise = max_to > self.current_bet and self._can_act(1 - i) and not s.raise_closed
        min_to = min(max_to, self.bb if self.current_bet == 0 else self.current_bet + self.min_raise)
        return {'toCall': to_call, 'canCheck': to_call == 0, 'canRaise': can_raise, 'minTo': min_to, 'maxTo': max_to}

    def act(self, i: int, kind: str, to: int | None, timeout: bool = False) -> bool:
        """One action by seat i. Returns False when it isn't their turn or the action doesn't fit."""
        L = self.legal(i)
        if L is None:
            return False
        s = self.seats[i]
        if kind == 'fold' and not L['canCheck']:
            s.in_hand, s.folded = False, True
            entry = {'k': 'act', 's': i, 't': 'fold'}
        elif kind == 'raise' and L['canRaise']:
            to = max(L['minTo'], min(L['maxTo'], int(to or 0)))
            raise_by = to - self.current_bet
            self._put(s, to - s.bet)
            entry = {'k': 'act', 's': i, 't': 'allin' if s.all_in else ('bet' if self.current_bet == 0 else 'raise'), 'a': to}
            if raise_by >= self.min_raise:  # a full raise reopens the betting
                self.min_raise = raise_by
                for o in self.seats:
                    o.raise_closed = False
            self.current_bet = max(self.current_bet, to)
            for o in self.seats:
                o.acted = False
        elif kind in ('call', 'raise') and L['toCall'] > 0:
            paid = self._put(s, L['toCall'])
            entry = {'k': 'act', 's': i, 't': 'allin' if s.all_in else 'call', 'a': paid}
        elif kind in ('check', 'call') and L['canCheck']:
            entry = {'k': 'act', 's': i, 't': 'check'}
        else:
            return False
        s.acted = s.raise_closed = True
        s.last = {'type': entry['t'], 'amount': entry.get('a', 0)}
        if timeout:
            entry['timeout'] = True
        else:
            self.last_move = time.time()
        self.log.append(entry)
        o = 1 - i
        self.to_act = o if self._can_act(o) and (not self.seats[o].acted or self.seats[o].bet < self.current_bet) else None
        self._settle()
        self.bump()
        return True

    def _settle(self) -> None:
        """After any change: award an uncontested pot, close the street, or run out the board."""
        while True:
            live = [i for i in (0, 1) if self.seats[i].in_hand]
            if len(live) == 1:
                return self._award(False)
            pending = [i for i in (0, 1) if self._can_act(i) and (not self.seats[i].acted or self.seats[i].bet < self.current_bet)]
            actors = [i for i in (0, 1) if self._can_act(i)]
            lone_matched = len(actors) == 1 and self.seats[actors[0]].bet >= self.current_bet
            if pending and not lone_matched:
                if self.to_act is None or not self._can_act(self.to_act):
                    self.to_act = pending[0]
                return
            # Street over: the bets go in the middle.
            self._return_uncalled()
            for s in self.seats:
                self.pot += s.bet
                s.bet, s.acted, s.raise_closed = 0, False, False
                if s.in_hand and not s.all_in:
                    s.last = None  # a fresh street clears the bubbles
            self.current_bet, self.min_raise = 0, self.bb
            if self.street == 'river':
                return self._award(True)
            self.street = {'preflop': 'flop', 'flop': 'turn', 'turn': 'river'}[self.street]
            self.deck.pop()  # burn
            new = [self.deck.pop() for _ in range(3 if self.street == 'flop' else 1)]
            self.board += new
            self.log.append({'k': 'street', 'street': self.street, 'cards': new})
            # After the flop the big blind (not the button) acts first.
            self.to_act = 1 - self.button if len(actors) == 2 else None
            if self.to_act is not None:
                return

    def _return_uncalled(self) -> None:
        a, b = self.seats
        if a.bet != b.bet:
            hi = a if a.bet > b.bet else b
            back = abs(a.bet - b.bet)
            hi.bet -= back
            hi.committed -= back
            hi.stack += back
            if hi.stack > 0:
                hi.all_in = False

    def _award(self, showdown: bool) -> None:
        self._return_uncalled()
        for s in self.seats:
            self.pot += s.bet
            s.bet = 0
        self.to_act = None
        live = [i for i in (0, 1) if self.seats[i].in_hand]
        self.showdown = showdown and len(live) == 2
        if not self.showdown:
            self.winners = [{'s': live[0], 'a': self.pot}]
        else:
            scores = [evaluate(self.seats[i].hole + self.board) for i in (0, 1)]
            hands = [describe(sc) for sc in scores]
            if scores[0] == scores[1]:
                # A split; the odd chip goes to the player left of the button (the big blind).
                half, odd = divmod(self.pot, 2)
                bb = 1 - self.button
                self.winners = [{'s': i, 'a': half + (odd if i == bb else 0), 'hand': hands[i]} for i in (0, 1)]
            else:
                w = 0 if scores[0] > scores[1] else 1
                self.winners = [{'s': w, 'a': self.pot, 'hand': hands[w]}]
            self.log.append({'k': 'show', 'hands': hands})
        for w in self.winners:
            self.seats[w['s']].stack += w['a']
            self.seats[w['s']].last = {'type': 'win', 'amount': w['a']}
            self.log.append({'k': 'win', 's': w['s'], 'a': w['a'], 'hand': w.get('hand')})
        self.pot = 0
        self.street = 'done'
        self.next_at = time.time() + NEXT_HAND
        if any(s.stack == 0 for s in self.seats):
            self.street = 'over'

    def rematch(self) -> bool:
        if self.street != 'over':
            return False
        for s in self.seats:
            s.stack = self.start
        self.last_move = time.time()
        self.recorded = False
        self.start_hand()
        return True

    # -------------------------------------------------------------- what each player sees

    def view(self, me: int) -> dict:
        now = time.time()
        them = 1 - me

        def player(i: int) -> dict | None:
            if i >= len(self.seats):
                return None
            s = self.seats[i]
            # Your own cards always; theirs only when they're turned over at showdown.
            shown = i == me or (self.showdown and s.in_hand)
            return {
                'name': s.name, 'stack': s.stack, 'bet': s.bet, 'committed': s.committed, 'inHand': s.in_hand,
                'folded': s.folded, 'allIn': s.all_in, 'acted': s.acted, 'raiseClosed': s.raise_closed, 'lastAction': s.last,
                'cards': s.hole if shown else None, 'dealt': len(s.hole) > 0, 'button': self.button == i,
                'online': now - s.seen < 12,
            }

        side = lambda i: 'you' if i == me else 'them'  # noqa: E731
        log = []
        for e in self.log:
            e = dict(e)
            if 's' in e:
                e['s'] = side(e['s'])
            if e['k'] == 'show':
                e['hands'] = {side(i): h for i, h in enumerate(e['hands'])}
            log.append(e)
        return {
            'id': self.id, 'status': 'waiting' if len(self.seats) < 2 else ('over' if self.street == 'over' else 'playing'),
            'street': self.street, 'handNo': self.hand_no, 'sb': self.sb, 'bb': self.bb, 'start': self.start, 'timer': self.timer,
            'board': self.board, 'pot': self.pot, 'currentBet': self.current_bet, 'minRaise': self.min_raise,
            'toAct': None if self.to_act is None else side(self.to_act),
            'turnLeft': round(max(0.0, self.turn_ends - now), 1) if self.turn_ends else None,
            'you': player(me), 'them': player(them), 'legal': self.legal(me), 'log': log, 'showdown': self.showdown,
            'winners': [{**w, 's': side(w['s'])} for w in self.winners],
            'nextIn': max(0.0, round(self.next_at - now, 1)) if self.street == 'done' else None,
            'version': self.version,
        }
