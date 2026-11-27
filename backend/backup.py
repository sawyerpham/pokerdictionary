"""Daily backup of the accounts database: a consistent copy (SQLite's backup API, safe while the app writes), gzipped
as backups/poker-YYYY-MM-DD.db.gz next to the database and kept KEEP_DAYS. Expired sessions and sign-in links are
deleted first, so they never reach a backup.

    python backup.py      (in production, from cron: docker compose exec -T poker python backup.py)
"""
import gzip
import os
import shutil
import sqlite3
import time
from pathlib import Path

KEEP_DAYS = 14


def backup(db_path: str | Path = os.environ.get('DB_PATH', Path(__file__).parent / 'poker.db'), keep_days: int = KEEP_DAYS) -> Path:
    db = Path(db_path)
    out = db.parent / 'backups'
    out.mkdir(exist_ok=True)
    tmp, archive = out / 'poker.db.tmp', out / f"poker-{time.strftime('%Y-%m-%d')}.db.gz"
    src, dst = sqlite3.connect(db), sqlite3.connect(tmp)
    with src:
        now = int(time.time())
        src.execute('DELETE FROM sessions WHERE expires < ?', (now,))
        src.execute('DELETE FROM links WHERE expires < ?', (now,))
    with dst:
        src.backup(dst)
    src.close()
    dst.close()
    with open(tmp, 'rb') as f, gzip.open(archive, 'wb') as g:
        shutil.copyfileobj(f, g)
    tmp.unlink()
    for old in out.glob('poker-*.db.gz'):
        if old.stat().st_mtime < time.time() - keep_days * 86400:
            old.unlink()
    return archive


if __name__ == '__main__':
    print(backup())
