from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# The poker engine runs in the browser; this serves the built site (and is where server-side math goes later).
DIST = Path(__file__).parent / 'dist'
app = FastAPI(docs_url=None, redoc_url=None)


@app.get('/api/health')
def health():
    return {'ok': True}


if DIST.exists():
    app.mount('/assets', StaticFiles(directory=DIST / 'assets'), name='assets')

    @app.get('/{path:path}')
    def spa(path: str):
        f = (DIST / path).resolve()
        if path and f.is_file() and DIST.resolve() in f.parents:
            return FileResponse(f)
        return FileResponse(DIST / 'index.html')  # client-side routes like /table
