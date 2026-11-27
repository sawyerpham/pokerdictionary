import base64
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
import urllib.parse
import urllib.request
from contextlib import closing
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel

# The poker engine and the solver run in the browser. The server serves the built site and keeps accounts:
# sign-in (Google or an emailed link), sessions, each user's synced data, account types, and the AI coach.
#
# Account types: "owner" (the emails in OWNER_EMAILS; set only on the server, so nobody can lock the owner out),
# "admin" (set by an owner or admin on the Admin page; manages account types), "premium" (the AI coach) and
# "default". Each type includes everything below it.
DIST = Path(__file__).parent / 'dist'
DB = os.environ.get('DB_PATH', str(Path(__file__).parent / 'poker.db'))
URL = os.environ.get('PUBLIC_URL', 'https://poker.sawyerpham.dev').rstrip('/')
GOOGLE_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
RESEND_KEY = os.environ.get('RESEND_API_KEY', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Poker Dictionary <login@sawyerpham.dev>')
OWNERS = {e.strip().lower() for e in os.environ.get('OWNER_EMAILS', '').split(',') if e.strip()}
DEEPSEEK_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_MODEL = os.environ.get('DEEPSEEK_MODEL', 'deepseek-flash')  # the DeepSeek model that reads images
COACH_DAILY = int(os.environ.get('COACH_DAILY', '30'))  # coach replies a premium account gets per day; admins and owners have no cap
DEV = os.environ.get('DEV') == '1'  # local only: plain-http cookies, sign-in links printed instead of emailed

SESSION_DAYS = 90
LINK_MINUTES = 15
SYNCED = {'pokerdictionary-study', 'poker-settings'}  # the browser stores that follow you between devices
MAX_DOC = 256 * 1024

app = FastAPI(docs_url=None, redoc_url=None)


def db() -> sqlite3.Connection:
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    return con


with closing(db()) as con, con:
    con.execute('PRAGMA journal_mode=WAL')
    con.executescript('''
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, created INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS links (token TEXT PRIMARY KEY, email TEXT NOT NULL, next TEXT NOT NULL, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS attempts (key TEXT NOT NULL, at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS docs (user_id INTEGER NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL, at INTEGER NOT NULL,
                                         PRIMARY KEY (user_id, name));
        CREATE TABLE IF NOT EXISTS coach_uses (user_id INTEGER NOT NULL, at INTEGER NOT NULL);
    ''')
    if 'role' not in [c['name'] for c in con.execute('PRAGMA table_info(users)')]:
        con.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'default'")

RANK = {'default': 0, 'premium': 1, 'admin': 2, 'owner': 3}


def role_of(user: sqlite3.Row) -> str:
    return 'owner' if user['email'] in OWNERS else user['role']


def require(user: sqlite3.Row, role: str) -> None:
    if RANK[role_of(user)] < RANK[role]:
        raise HTTPException(403, f'This needs a {role} account')


def digest(token: str) -> str:
    """Tokens are stored hashed, so a copy of the database can't be used to sign in."""
    return hashlib.sha256(token.encode()).hexdigest()


def safe_next(path: str | None) -> str:
    """Only same-site paths, so a sign-in link can't send you somewhere else."""
    return path if path and path.startswith('/') and not path.startswith('//') and '\\' not in path else '/'


def client_ip(request: Request) -> str:
    # Caddy is the only way in and appends the caller's address last.
    forwarded = request.headers.get('x-forwarded-for')
    return forwarded.split(',')[-1].strip() if forwarded else (request.client.host if request.client else '?')


def too_many(con: sqlite3.Connection, key: str, limit: int, seconds: int) -> bool:
    now = int(time.time())
    con.execute('DELETE FROM attempts WHERE at < ?', (now - 86400,))
    if con.execute('SELECT COUNT(*) FROM attempts WHERE key = ? AND at > ?', (key, now - seconds)).fetchone()[0] >= limit:
        return True
    con.execute('INSERT INTO attempts VALUES (?, ?)', (key, now))
    return False


def start_session(con: sqlite3.Connection, email: str, name: str | None, response: Response) -> None:
    email = email.lower()
    con.execute('INSERT INTO users (email, name, created) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING', (email, name, int(time.time())))
    if name:
        con.execute('UPDATE users SET name = COALESCE(name, ?) WHERE email = ?', (name, email))
    user_id = con.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()[0]
    token = secrets.token_urlsafe(32)
    con.execute('INSERT INTO sessions VALUES (?, ?, ?)', (digest(token), user_id, int(time.time()) + SESSION_DAYS * 86400))
    response.set_cookie('session', token, max_age=SESSION_DAYS * 86400, httponly=True, secure=not DEV, samesite='lax')


def current_user(con: sqlite3.Connection, request: Request) -> sqlite3.Row:
    token = request.cookies.get('session')
    row = token and con.execute(
        'SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?',
        (digest(token), int(time.time())),
    ).fetchone()
    if not row:
        raise HTTPException(401, 'Not signed in')
    return row


@app.middleware('http')
async def same_origin_writes(request: Request, call_next):
    # Cookies are SameSite=Lax already; also refuse writes another site's page tries to make.
    origin = request.headers.get('origin')
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and origin and origin != URL and not DEV:
        return Response('Cross-site request refused', status_code=403)
    return await call_next(request)


@app.get('/api/health')
def health():
    return {'ok': True}


@app.get('/api/auth/providers')
def providers():
    return {'google': bool(GOOGLE_ID and GOOGLE_SECRET), 'email': bool(RESEND_KEY) or DEV, 'coach': bool(DEEPSEEK_KEY)}


@app.get('/api/me')
def me(request: Request):
    with closing(db()) as con:
        user = current_user(con, request)
        return {'email': user['email'], 'name': user['name'], 'role': role_of(user)}


@app.post('/api/logout')
def logout(request: Request, response: Response):
    with closing(db()) as con, con:
        if token := request.cookies.get('session'):
            con.execute('DELETE FROM sessions WHERE token = ?', (digest(token),))
    response.delete_cookie('session')
    return {'ok': True}


@app.delete('/api/me')
def delete_account(request: Request, response: Response):
    with closing(db()) as con, con:
        user = current_user(con, request)
        for table in ('docs', 'sessions', 'coach_uses'):
            con.execute(f'DELETE FROM {table} WHERE user_id = ?', (user['id'],))
        con.execute('DELETE FROM users WHERE id = ?', (user['id'],))
    response.delete_cookie('session')
    return {'ok': True}


# --- Google: the standard authorization-code flow.

GOOGLE_CALLBACK = f'{URL}/api/auth/google/callback'


@app.get('/api/auth/google')
def google_start(next: str = '/'):
    if not GOOGLE_ID:
        raise HTTPException(404, 'Google sign-in is not set up')
    state = secrets.token_urlsafe(24)
    query = urllib.parse.urlencode({
        'client_id': GOOGLE_ID, 'redirect_uri': GOOGLE_CALLBACK, 'response_type': 'code',
        'scope': 'openid email profile', 'state': state, 'prompt': 'select_account',
    })
    response = RedirectResponse(f'https://accounts.google.com/o/oauth2/v2/auth?{query}')
    response.set_cookie('oauth', f'{state}|{safe_next(next)}', max_age=600, httponly=True, secure=not DEV, samesite='lax')
    return response


@app.get('/api/auth/google/callback')
def google_callback(request: Request, code: str = '', state: str = ''):
    saved_state, _, next_path = (request.cookies.get('oauth') or '').partition('|')
    if not code or not state or not secrets.compare_digest(state, saved_state):
        return RedirectResponse('/?signin=failed')
    body = urllib.parse.urlencode({
        'code': code, 'client_id': GOOGLE_ID, 'client_secret': GOOGLE_SECRET,
        'redirect_uri': GOOGLE_CALLBACK, 'grant_type': 'authorization_code',
    }).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request('https://oauth2.googleapis.com/token', data=body), timeout=10) as r:
            id_token = json.load(r)['id_token']
    except Exception:
        return RedirectResponse('/?signin=failed')
    # Received straight from Google over HTTPS with our secret, so the token needs no signature check;
    # still confirm it's for this app and the address is verified.
    payload = id_token.split('.')[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    if claims.get('aud') != GOOGLE_ID or not claims.get('email_verified') or claims.get('exp', 0) < time.time():
        return RedirectResponse('/?signin=failed')
    response = RedirectResponse(safe_next(next_path))
    with closing(db()) as con, con:
        start_session(con, claims['email'], claims.get('name'), response)
    response.delete_cookie('oauth')
    return response


# --- Email: a one-time link. Opening it shows a button; pressing the button signs in, so mail scanners
# that open links can't use up the token.

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


class EmailStart(BaseModel):
    email: str
    next: str = '/'


def send_email(to: str, link: str) -> None:
    if DEV and not RESEND_KEY:
        print(f'[dev] sign-in link for {to}: {link}', flush=True)
        return
    text = f'Sign in to Poker Dictionary:\n\n{link}\n\nThe link works once, for {LINK_MINUTES} minutes. If you didn\'t ask for it, ignore this email.'
    html = (f'<p>Sign in to Poker Dictionary:</p><p><a href="{link}">Sign in</a></p>'
            f'<p>The link works once, for {LINK_MINUTES} minutes. If you didn\'t ask for it, ignore this email.</p>')
    request = urllib.request.Request(
        'https://api.resend.com/emails',
        data=json.dumps({'from': EMAIL_FROM, 'to': [to], 'subject': 'Your sign-in link', 'text': text, 'html': html}).encode(),
        headers={'Authorization': f'Bearer {RESEND_KEY}', 'Content-Type': 'application/json', 'User-Agent': 'poker-dictionary'},
    )
    urllib.request.urlopen(request, timeout=10).close()


@app.post('/api/auth/email')
def email_start(body: EmailStart, request: Request):
    email = body.email.strip().lower()
    if len(email) > 254 or not EMAIL_RE.match(email):
        raise HTTPException(400, 'That doesn\'t look like an email address')
    if not providers()['email']:
        raise HTTPException(404, 'Email sign-in is not set up')
    with closing(db()) as con, con:
        if too_many(con, f'email:{email}', 3, 900) or too_many(con, f'ip:{client_ip(request)}', 10, 3600):
            raise HTTPException(429, 'Too many sign-in emails. Try again in a few minutes.')
        token = secrets.token_urlsafe(32)
        con.execute('DELETE FROM links WHERE expires < ?', (int(time.time()),))
        con.execute('INSERT INTO links VALUES (?, ?, ?, ?)', (digest(token), email, safe_next(body.next), int(time.time()) + LINK_MINUTES * 60))
    try:
        send_email(email, f'{URL}/signin?token={token}')
    except Exception:
        raise HTTPException(502, 'The email could not be sent. Try again.')
    return {'ok': True}


class EmailFinish(BaseModel):
    token: str


@app.post('/api/auth/email/verify')
def email_finish(body: EmailFinish, response: Response):
    with closing(db()) as con, con:
        row = con.execute('DELETE FROM links WHERE token = ? AND expires > ? RETURNING email, next', (digest(body.token), int(time.time()))).fetchone()
        if not row:
            raise HTTPException(400, 'This link has expired or was already used. Ask for a new one.')
        start_session(con, row['email'], None, response)
    return {'next': row['next']}


# --- Sync: the newest copy of each browser store wins.

@app.get('/api/sync')
def sync_get(request: Request):
    with closing(db()) as con:
        user = current_user(con, request)
        rows = con.execute('SELECT name, data, at FROM docs WHERE user_id = ?', (user['id'],)).fetchall()
        return {r['name']: {'data': r['data'], 'at': r['at']} for r in rows}


class Doc(BaseModel):
    data: str
    at: int


@app.put('/api/sync/{name}')
def sync_put(name: str, doc: Doc, request: Request):
    if name not in SYNCED or len(doc.data) > MAX_DOC:
        raise HTTPException(400, 'Not something that syncs')
    with closing(db()) as con, con:
        user = current_user(con, request)
        con.execute(
            'INSERT INTO docs VALUES (?, ?, ?, ?) ON CONFLICT(user_id, name) DO UPDATE SET data = excluded.data, at = excluded.at WHERE excluded.at >= docs.at',
            (user['id'], name, doc.data, doc.at),
        )
    return {'ok': True}


# --- Admin: account types.

def day_start() -> int:
    return int(time.time()) // 86400 * 86400


@app.get('/api/admin/users')
def admin_users(request: Request):
    with closing(db()) as con:
        require(current_user(con, request), 'admin')
        rows = con.execute('''SELECT users.*, (SELECT COUNT(*) FROM coach_uses WHERE user_id = users.id AND at >= ?) AS coach_today
                              FROM users ORDER BY created''', (day_start(),)).fetchall()
        return [{'id': r['id'], 'email': r['email'], 'name': r['name'], 'role': role_of(r), 'created': r['created'], 'coachToday': r['coach_today']}
                for r in rows]


class RoleChange(BaseModel):
    role: Literal['default', 'premium', 'admin']


@app.put('/api/admin/users/{user_id}/role')
def admin_set_role(user_id: int, body: RoleChange, request: Request):
    with closing(db()) as con, con:
        require(current_user(con, request), 'admin')
        target = con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if not target:
            raise HTTPException(404, 'No such account')
        if role_of(target) == 'owner':
            raise HTTPException(400, 'Owners are set on the server, not here')
        con.execute('UPDATE users SET role = ? WHERE id = ?', (body.role, user_id))
    return {'ok': True}


# --- AI coach: DeepSeek reads your screenshot and notes and coaches you through the hand.

COACH_PROMPT = '''You are a personal poker coach for a no-limit hold'em player{name}. They send screenshots of hands \
(from online clients, hand histories, or this site's own tools) with notes, and ask follow-up questions.

When you get a hand:
1. Read the screenshot carefully: game and stakes, stack sizes (in big blinds), positions, hole cards, board, and every \
action with sizes. Say what you read in one or two lines. If something you need can't be read, say exactly what and give \
your best read or ask for it; never invent cards or actions.
2. Go street by street. For each of the player's decisions, say whether it was good, okay, or a mistake, and why: ranges \
(theirs and the opponent's as the action tells it), equity, pot odds, bet sizing, position, and blockers.
3. Name the biggest leak in the hand and the better line, with sizes.
4. End with one or two concrete things to practice.

Coach like a strong player who wants them to improve: direct, specific, and honest about mistakes, no filler. Explain \
terms briefly when you use them. Use short "##" headings, "-" bullets and **bold** for key points; no tables. Keep it \
under about 400 words unless they ask for more. Only discuss poker and how to improve at it.'''


class CoachMessage(BaseModel):
    role: Literal['user', 'assistant']
    text: str = ''
    images: list[str] = []  # data:image/...;base64,... (user messages only)


class CoachRequest(BaseModel):
    messages: list[CoachMessage]


IMAGE_RE = re.compile(r'^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$')


def ask_deepseek(messages: list[dict]) -> str:
    req = urllib.request.Request(
        'https://api.deepseek.com/chat/completions',
        data=json.dumps({'model': DEEPSEEK_MODEL, 'messages': messages, 'max_tokens': 3000}).encode(),
        headers={'Authorization': f'Bearer {DEEPSEEK_KEY}', 'Content-Type': 'application/json', 'User-Agent': 'poker-dictionary'},
    )
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)['choices'][0]['message']['content']


@app.post('/api/coach')
def coach(body: CoachRequest, request: Request):
    msgs = body.messages
    if not 1 <= len(msgs) <= 40 or msgs[-1].role != 'user':
        raise HTTPException(400, 'Send a question')
    images = [img for m in msgs for img in m.images]
    if (len(images) > 6 or any(m.images and m.role != 'user' for m in msgs) or any(len(m.text) > 8000 for m in msgs)
            or any(len(img) > 5_000_000 or not IMAGE_RE.match(img) for img in images)):
        raise HTTPException(400, 'Up to 6 images (PNG, JPEG, WebP or GIF) and shorter messages, please')
    with closing(db()) as con:
        user = current_user(con, request)
        require(user, 'premium')
        if not DEEPSEEK_KEY:
            raise HTTPException(503, "The AI coach isn't set up yet")
        used = con.execute('SELECT COUNT(*) FROM coach_uses WHERE user_id = ? AND at >= ?', (user['id'], day_start())).fetchone()[0]
        if role_of(user) == 'premium' and used >= COACH_DAILY:
            raise HTTPException(429, f"That's today's {COACH_DAILY} coach replies. More tomorrow (UTC).")
    name = f" named {user['name'].split()[0]}" if user['name'] else ''
    messages = [{'role': 'system', 'content': COACH_PROMPT.format(name=name)}]
    for m in msgs:
        if m.images:
            parts = [{'type': 'image_url', 'image_url': {'url': img}} for img in m.images]
            messages.append({'role': 'user', 'content': [*parts, {'type': 'text', 'text': m.text or 'Coach me on this hand.'}]})
        else:
            messages.append({'role': m.role, 'content': m.text})
    try:
        reply = ask_deepseek(messages)
    except Exception as e:
        detail = e.read().decode(errors='replace')[:300] if hasattr(e, 'read') else str(e)
        print(f'coach: DeepSeek failed: {detail}', flush=True)
        raise HTTPException(502, "The coach couldn't answer just now. Try again in a minute.")
    with closing(db()) as con, con:
        con.execute('INSERT INTO coach_uses VALUES (?, ?)', (user['id'], int(time.time())))
    return {'reply': reply, 'left': max(0, COACH_DAILY - used - 1) if role_of(user) == 'premium' else None}

if DIST.exists():
    from fastapi.staticfiles import StaticFiles

    app.mount('/assets', StaticFiles(directory=DIST / 'assets'), name='assets')

    @app.get('/{path:path}')
    def spa(path: str):
        f = (DIST / path).resolve()
        if path and f.is_file() and DIST.resolve() in f.parents:
            return FileResponse(f)
        return FileResponse(DIST / 'index.html')  # client-side routes like /table
