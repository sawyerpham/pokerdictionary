"""Backend self-check: `python backend/check.py`. Runs every account flow against a throwaway database."""
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

study = Path(tempfile.mkdtemp())
(study / 'flops').mkdir()
(study / 'flops' / 'index.json').write_text('[]')
os.environ.update(DB_PATH=str(Path(tempfile.mkdtemp()) / 'check.db'), DEV='1', PUBLIC_URL='http://testserver', STUDY_DATA=str(study),
                  OWNER_EMAILS='boss@example.com', DEEPSEEK_API_KEY='test', COACH_DAILY='2')
sys.path.insert(0, str(Path(__file__).parent))
import app as server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

sent: list[str] = []
server.send_email = lambda to, link: sent.append(link)
asked: list[list[dict]] = []
server.ask_deepseek = lambda messages: asked.append(messages) or 'Fold the river.'
web = TestClient(server.app)


def ok(cond, msg):
    if not cond:
        raise SystemExit(f'backend check failed: {msg}')


def sign_in(client: TestClient, email: str, next_path: str = '/study') -> None:
    ok(client.post('/api/auth/email', json={'email': email, 'next': next_path}).status_code == 200, 'link requested')
    token = sent[-1].split('token=')[1]
    r = client.post('/api/auth/email/verify', json={'token': token})
    ok(r.status_code == 200, f'verify {r.text}')
    ok(client.post('/api/auth/email/verify', json={'token': token}).status_code == 400, 'a link works once')


ok(web.get('/api/me').status_code == 401, 'signed out at first')
# Every response is cross-origin isolated, so the in-browser solver can use every core.
h = web.get('/api/health').headers
ok(h['cross-origin-opener-policy'] == 'same-origin' and h['cross-origin-embedder-policy'] == 'credentialless', 'isolation headers')
# Study data from the server folder: served when there, a 404 (not the app page) when not.
ok(web.get('/flops/index.json').json() == [], 'flop library index served')
ok(web.get('/flops/missing.json').status_code == 404, 'missing library file is a 404')
for header in ('content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'):
    ok(header in h, f'security header {header}')
ok(web.get('/openapi.json').status_code == 404, 'no public API map')
# Sign-in redirects: plain same-site paths only (browsers drop tabs and newlines, which would turn '/<tab>/x' into '//x').
for bad in ('//evil.example', '/' + chr(92) + 'evil.example', '/' + chr(9) + '/evil.example', '/' + chr(10) + '/evil.example', 'https://evil.example', '/x' * 150):
    ok(server.safe_next(bad) == '/', f'next path {bad!r} refused')
ok(server.safe_next('/study/trainer?x=1') == '/study/trainer?x=1', 'ordinary next path kept')
ok(web.get('/api/auth/providers').json() == {'google': False, 'email': True, 'coach': True}, 'providers')
ok(web.post('/api/auth/email', json={'email': 'not-an-email'}).status_code == 400, 'bad address refused')

# Email sign-in: a link, used once, starts a session; the next path is kept but only if it's on this site.
sign_in(web, 'Player@Example.com', '/study/trainer')
ok(web.get('/api/me').json()['email'] == 'player@example.com', 'signed in, email lowercased')
web.post('/api/auth/email', json={'email': 'player@example.com', 'next': '//evil.example/x'})
r = TestClient(server.app).post('/api/auth/email/verify', json={'token': sent[-1].split('token=')[1]})
ok(r.json()['next'] == '/', f'off-site next path dropped, got {r.json()}')

# Rate limit: three links per address per 15 minutes (two used above, this is the third).
ok(web.post('/api/auth/email', json={'email': 'player@example.com'}).status_code == 200, 'third link allowed')
ok(web.post('/api/auth/email', json={'email': 'player@example.com'}).status_code == 429, 'fourth link refused')

# Sync: stores round-trip; an older copy never overwrites a newer one; unknown stores are refused.
ok(web.put('/api/sync/pokerdictionary-study', json={'data': '{"v":2}', 'at': 200}).status_code == 200, 'put')
web.put('/api/sync/pokerdictionary-study', json={'data': '{"v":1}', 'at': 100})
ok(web.get('/api/sync').json()['pokerdictionary-study'] == {'data': '{"v":2}', 'at': 200}, 'newest wins')
ok(web.put('/api/sync/anything-else', json={'data': '{}', 'at': 1}).status_code == 400, 'unknown store refused')
ok(web.put('/api/sync/poker-settings', json={'data': 'x' * (server.MAX_DOC + 1), 'at': 1}).status_code == 400, 'size limit')

# Another person can't see it; signing out ends the session; deleting the account removes the data.
other = TestClient(server.app)
sign_in(other, 'someone@example.com')
ok(other.get('/api/sync').json() == {}, 'data is per user')
ok(web.post('/api/logout').status_code == 200 and web.get('/api/me').status_code == 401, 'sign out')
other.put('/api/sync/poker-settings', json={'data': '{}', 'at': 5})
ok(other.delete('/api/me').status_code == 200 and other.get('/api/me').status_code == 401, 'account deleted')
with server.db() as con:
    ok(con.execute("SELECT COUNT(*) FROM users WHERE email = 'someone@example.com'").fetchone()[0] == 0, 'user row gone')
    ok(con.execute('SELECT COUNT(*) FROM docs').fetchone()[0] == 1, 'their docs gone, the first user\'s kept')

# Account types: owners come from OWNER_EMAILS; a default account can't use the coach or the Admin page.
PNG = 'data:image/png;base64,iVBORw0KGgo='
hand = {'messages': [{'role': 'user', 'text': 'Was my river call good?', 'images': [PNG]}]}
player, boss = TestClient(server.app), TestClient(server.app)
sign_in(player, 'player2@example.com')
sign_in(boss, 'Boss@Example.com')
ok(player.get('/api/me').json()['role'] == 'default' and boss.get('/api/me').json()['role'] == 'owner', 'roles from sign-in')
ok(player.post('/api/coach', json=hand).status_code == 403, 'default accounts have no coach')
ok(player.get('/api/admin/users').status_code == 403, 'default accounts have no Admin page')

# The owner makes the player premium; nobody can change an owner here.
users = boss.get('/api/admin/users').json()
pid = next(u['id'] for u in users if u['email'] == 'player2@example.com')
bid = next(u['id'] for u in users if u['email'] == 'boss@example.com')
ok(boss.put(f'/api/admin/users/{pid}/role', json={'role': 'premium'}).status_code == 200, 'owner sets premium')
ok(boss.put(f'/api/admin/users/{bid}/role', json={'role': 'default'}).status_code == 400, 'owner role is fixed')
ok(boss.put(f'/api/admin/users/{pid}/role', json={'role': 'owner'}).status_code == 422, 'owner is not grantable')

# Premium: the coach gets the system prompt, the screenshot and the question; bad images are refused; 2 a day here.
r = player.post('/api/coach', json=hand)
ok(r.status_code == 200 and r.json() == {'reply': 'Fold the river.', 'left': 1}, f'coach reply {r.text}')
sent_msgs = asked[-1]
ok(sent_msgs[0]['role'] == 'system' and 'poker coach' in sent_msgs[0]['content'], 'system prompt first')
ok(sent_msgs[1]['content'][0] == {'type': 'image_url', 'image_url': {'url': PNG}} and sent_msgs[1]['content'][1]['text'] == 'Was my river call good?', 'screenshot and question forwarded')
bad = {'messages': [{'role': 'user', 'text': 'x', 'images': ['data:text/html;base64,PGI+']}]}
ok(player.post('/api/coach', json=bad).status_code == 400, 'non-image refused')
follow = {'messages': [*hand['messages'], {'role': 'assistant', 'text': 'Fold the river.'}, {'role': 'user', 'text': 'Why?'}]}
ok(player.post('/api/coach', json=follow).json()['left'] == 0, 'follow-up counts')
ok(player.post('/api/coach', json=follow).status_code == 429, 'daily cap for premium')
ok(boss.post('/api/coach', json=hand).json()['left'] is None, 'no cap for owners')
# A failed answer doesn't use up a reply.
def failing(messages):
    raise RuntimeError('down')
server.ask_deepseek, working = failing, server.ask_deepseek
before = sqlite3.connect(os.environ['DB_PATH']).execute('SELECT COUNT(*) FROM coach_uses').fetchone()[0]
ok(boss.post('/api/coach', json=hand).status_code == 502, 'coach failure reported')
ok(sqlite3.connect(os.environ['DB_PATH']).execute('SELECT COUNT(*) FROM coach_uses').fetchone()[0] == before, 'failed reply refunded')
server.ask_deepseek = working

# An admin can manage account types too.
ok(boss.put(f'/api/admin/users/{pid}/role', json={'role': 'admin'}).status_code == 200, 'owner makes an admin')
ok(player.get('/api/admin/users').status_code == 200, 'admins see the Admin page')
# Admins set default and premium, but only an owner grants or removes Admin (a stolen admin session can't mint admins).
third = TestClient(server.app)
sign_in(third, 'third@example.com')
tid = next(u['id'] for u in player.get('/api/admin/users').json() if u['email'] == 'third@example.com')
ok(third.get('/api/admin/stats').status_code == 403, 'default accounts have no stats')
ok(player.put(f'/api/admin/users/{tid}/role', json={'role': 'premium'}).status_code == 200, 'admin sets premium')
ok(player.put(f'/api/admin/users/{tid}/role', json={'role': 'admin'}).status_code == 403, 'admin cannot grant admin')
ok(player.put(f'/api/admin/users/{pid}/role', json={'role': 'default'}).status_code == 403, 'admin cannot remove admin')
ok(player.put(f'/api/admin/users/{bid}/role', json={'role': 'default'}).status_code == 400, 'admin cannot touch the owner')
# Stats: counts by type, and every change in the audit log, newest first.
stats = player.get('/api/admin/stats').json()
ok(stats['roles'] == {'default': 1, 'premium': 1, 'admin': 1, 'owner': 1} and stats['users'] == 4, f'role counts {stats["roles"]}')
ok(stats['joined']['day'] == 4 and stats['signedIn']['week'] == 4 and stats['coach']['all'] >= 3, f'activity {stats}')
ok([(c['by'], c['user'], c['new']) for c in stats['changes']][:3] == [
    ('player2@example.com', 'third@example.com', 'premium'), ('boss@example.com', 'player2@example.com', 'admin'),
    ('boss@example.com', 'player2@example.com', 'premium')], f'audit log {stats["changes"]}')
row = next(u for u in boss.get('/api/admin/users').json() if u['email'] == 'player@example.com')
ok(row['synced'] > 0 and row['lastSeen'] > 0, f'per-user activity {row}')

# The daily backup is a readable copy of the database, and expired sessions don't go into it.
import backup  # noqa: E402
import gzip  # noqa: E402
with server.db() as con:
    con.execute("INSERT INTO sessions VALUES ('expired', 1, 0)")
archive = backup.backup(server.DB)
copy = Path(server.DB).parent / 'restored.db'
copy.write_bytes(gzip.decompress(archive.read_bytes()))
with sqlite3.connect(copy) as con:
    ok(con.execute('SELECT COUNT(*) FROM users').fetchone()[0] >= 2, 'backup has the users')
    ok(con.execute("SELECT COUNT(*) FROM sessions WHERE token = 'expired'").fetchone()[0] == 0, 'expired sessions left out')

# Heads-up against a friend: the link seats one more player, each sees only their own cards, and chips never leak.
import headsup  # noqa: E402
import random  # noqa: E402
C = lambda t: '23456789TJQKA'.index(t[0]) * 4 + 'shdc'.index(t[1])  # noqa: E731
H = lambda s: [C(x) for x in s.split()]  # noqa: E731
ev, desc = headsup.evaluate, headsup.describe
ok(desc(ev(H('Ah Kh Qh Jh Th 2c 3d'))) == 'Royal Flush', 'royal flush')
ok(desc(ev(H('As 2d 3c 4h 5s Kd Qd'))) == '5-high Straight', 'wheel')
ok(desc(ev(H('Ks Kd Kc 7h 7s 7d 2c'))) == 'Kings full of Sevens', 'two trips make a full house')
ok(ev(H('Ah Ad Kc Kd Qs Qh 2c')) > ev(H('Ah Ad Kc Kd Js Jh 9c')), 'two pair kicker from the third pair')
ok(ev(H('As Ad Ac Kd Ks 2c 3d')) > ev(H('2h 3h 4h 5h 7h Ac Ad')), 'full house beats flush')
ok(ev(H('Ah Kd 9c 7s 5h 3d 2c')) == ev(H('Ac Kh 9d 7c 5s 4d 2h')), 'board plays: same five cards tie')

host, guest, stranger = TestClient(server.app), TestClient(server.app), TestClient(server.app)
r = host.post('/api/hu', json={'name': '  Alice  '})
ok(r.status_code == 200, f'game created {r.text}')
gid, htok = r.json()['id'], r.json()['token']
hh = {'x-seat': htok}
ok(host.get(f'/api/hu/{gid}', headers=hh).json()['status'] == 'waiting', 'waiting for a friend')
ok(guest.get(f'/api/hu/{gid}').json() == {'id': gid, 'seated': False, 'open': True, 'host': 'Alice', 'sb': 5, 'bb': 10, 'start': 1000, 'timer': 30}, 'link offers the seat and shows the settings')
gtok = guest.post(f'/api/hu/{gid}/join', json={'name': 'Bob'}).json()['token']
gh = {'x-seat': gtok}
ok(stranger.post(f'/api/hu/{gid}/join', json={}).status_code == 409, 'third person refused')
ok(stranger.get(f'/api/hu/{gid}').json()['open'] is False, 'game shows as full')
ok(stranger.post(f'/api/hu/{gid}/act', json={'type': 'fold'}).status_code == 403, 'no seat, no moves')
ok(stranger.get('/api/hu/nope').status_code == 404, 'unknown game')
a, b = host.get(f'/api/hu/{gid}', headers=hh).json(), guest.get(f'/api/hu/{gid}', headers=gh).json()
ok(a['status'] == 'playing' and a['handNo'] == 1 and a['you']['bet'] + a['them']['bet'] == 15 and 30 < a['turnLeft'] <= 32, f'first hand dealt, clock running {a}')
ok(len(a['you']['cards']) == 2 and a['them']['cards'] is None and b['them']['cards'] is None, 'only your own cards')
ok(a['you']['button'] and a['toAct'] == 'you' and b['toAct'] == 'them', 'button posts the small blind and acts first')
ok(a['legal'] == {'toCall': 5, 'canCheck': False, 'canRaise': True, 'minTo': 20, 'maxTo': 1000} and b['legal'] is None, f'legal moves {a["legal"]}')
ok(guest.post(f'/api/hu/{gid}/act', json={'type': 'check'}, headers=gh).status_code == 409, 'not your turn')
ok(host.post(f'/api/hu/{gid}/act', json={'type': 'check'}, headers=hh).status_code == 409, "can't check facing the blind")
host.post(f'/api/hu/{gid}/act', json={'type': 'raise', 'to': 30}, headers=hh)
b = guest.get(f'/api/hu/{gid}', headers=gh).json()
ok(b['legal']['toCall'] == 20 and b['legal']['minTo'] == 50, f'raise to 30: min re-raise to 50 {b["legal"]}')
b = guest.post(f'/api/hu/{gid}/act', json={'type': 'fold'}, headers=gh).json()
ok(b['street'] == 'done' and b['winners'] == [{'s': 'them', 'a': 20}] and b['them']['cards'] is None, 'fold: the uncalled raise goes back, no cards shown')
ok(b['you']['stack'] + b['them']['stack'] == 2000 and b['you']['stack'] == 990, 'blind lost')

# Many random hands: chips always add to 2,000, the deck never repeats a card, and the match ends with a winner.
headsup.NEXT_HAND = 0
# Settings: only the listed choices; custom blinds and buy-in set the stacks.
ok(host.post('/api/hu', json={'bb': 7}).status_code == 400 and host.post('/api/hu', json={'timer': 5}).status_code == 400, 'odd settings refused')
small = host.post('/api/hu', json={'bb': 2, 'buyIn': 40, 'timer': 0}).json()
small_g = server.GAMES[small['id']]
ok((small_g.sb, small_g.bb, small_g.start, small_g.timer, small_g.seats[0].stack) == (1, 2, 80, 0, 80), 'blinds $1/$2, $80 each, no clock')
# Out of time: a player who could check checks, one facing a bet folds.
clock = headsup.Game(id='c', seats=[headsup.Seat('a', 'x', stack=1000), headsup.Seat('b', 'y', stack=1000)])
clock.start_hand()
clock.turn_ends = 1
clock.advance()
ok(clock.log[-2] == {'k': 'act', 's': 0, 't': 'fold', 'timeout': True} and clock.street == 'done', f'timed out facing the blind: fold {clock.log}')
# A table with no move for ten minutes closes.
server.GAMES[small['id']].last_move -= server.GAME_IDLE + 1
ok(host.get(f"/api/hu/{small['id']}", headers={'x-seat': small['token']}).status_code == 404, 'idle table closed')
g = server.GAMES[gid]
g.next_at = 0  # the hand above finished with the old delay
rng = random.Random(7)
for _ in range(3000):
    g.advance()
    if g.street == 'over':
        break
    seen = [c for s in g.seats for c in s.hole] + g.board
    ok(len(seen) == len(set(seen)), 'no card dealt twice')
    ok(sum(s.stack + s.committed for s in g.seats) == 2000 or g.street == 'done', 'chips conserved mid-hand')
    if g.street == 'done':
        ok(sum(s.stack for s in g.seats) == 2000, f'chips conserved {[s.stack for s in g.seats]}')
        continue
    i = g.to_act
    L = g.legal(i)
    kind = rng.choice(['fold', 'call', 'call', 'raise'] if not L['canCheck'] else ['check', 'check', 'raise'])
    to = rng.choice([L['minTo'], L['maxTo'], (L['minTo'] + L['maxTo']) // 2])
    if not g.act(i, kind, to):
        ok(kind == 'raise' and not L['canRaise'] and L['canCheck'], f'only a raise nobody can make is refused {kind} {L}')
        g.act(i, 'check', None)
ok(g.street == 'over' and sorted(s.stack for s in g.seats) == [0, 2000], f'match over {[s.stack for s in g.seats]} {g.street}')
v = host.get(f'/api/hu/{gid}', headers=hh).json()
ok(v['status'] == 'over', 'over shows')
ok(host.post(f'/api/hu/{gid}/rematch', headers=hh).json()['you']['stack'] in (995, 990), 'rematch: fresh stacks, blinds posted')
ok(guest.post(f'/api/hu/{gid}/rematch', headers=gh).status_code == 409, 'only one rematch at a time')

# Results: a finished match counts for each signed-in player; signed out, or both seats on one account, it doesn't.
ok(host.get('/api/hu/stats').status_code == 401 and boss.get('/api/hu/stats').json() == {'played': 0, 'won': 0}, 'stats need sign-in')
m = boss.post('/api/hu', json={'name': 'Boss'}).json()
jt = player.post(f"/api/hu/{m['id']}/join", json={'name': 'P2'}).json()['token']
mg = server.GAMES[m['id']]
mg.seats[0].stack, mg.seats[1].stack, mg.street, mg.to_act = 2000, 0, 'over', None
boss.get(f"/api/hu/{m['id']}", headers={'x-seat': m['token']})
boss.get(f"/api/hu/{m['id']}", headers={'x-seat': m['token']})  # counted once
ok(boss.get('/api/hu/stats').json() == {'played': 1, 'won': 1} and player.get('/api/hu/stats').json() == {'played': 1, 'won': 0}, 'match recorded')
solo = boss.post('/api/hu', json={}).json()
boss.post(f"/api/hu/{solo['id']}/join", json={})
sg = server.GAMES[solo['id']]
sg.seats[1].stack, sg.street = 0, 'over'
boss.get(f"/api/hu/{solo['id']}", headers={'x-seat': solo['token']})
ok(boss.get('/api/hu/stats').json() == {'played': 1, 'won': 1}, 'playing yourself does not count')

# Google sign-in is off until it's configured.
ok(web.get('/api/auth/google', follow_redirects=False).status_code == 404, 'google off without keys')
print('backend check passed')
