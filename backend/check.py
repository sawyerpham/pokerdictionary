"""Backend self-check: `python backend/check.py`. Runs every account flow against a throwaway database."""
import os
import sys
import tempfile
from pathlib import Path

os.environ.update(DB_PATH=str(Path(tempfile.mkdtemp()) / 'check.db'), DEV='1', PUBLIC_URL='http://testserver')
sys.path.insert(0, str(Path(__file__).parent))
import app as server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

sent: list[str] = []
server.send_email = lambda to, link: sent.append(link)
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
ok(web.get('/api/auth/providers').json() == {'google': False, 'email': True}, 'providers')
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

# Google sign-in is off until it's configured.
ok(web.get('/api/auth/google', follow_redirects=False).status_code == 404, 'google off without keys')
print('backend check passed')
