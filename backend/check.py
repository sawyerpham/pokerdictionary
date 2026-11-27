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

# An admin can manage account types too.
ok(boss.put(f'/api/admin/users/{pid}/role', json={'role': 'admin'}).status_code == 200, 'owner makes an admin')
ok(player.get('/api/admin/users').status_code == 200, 'admins see the Admin page')

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

# Google sign-in is off until it's configured.
ok(web.get('/api/auth/google', follow_redirects=False).status_code == 404, 'google off without keys')
print('backend check passed')
