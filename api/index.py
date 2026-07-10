from backend.main import app

# Vercel's Python runtime passes the full path (e.g., /api/clients) to the ASGI app.
# We need to strip the '/api' prefix so FastAPI can match its routes (e.g., /clients).
async def asgi_app(scope, receive, send):
    if scope["type"] in ("http", "websocket"):
        if scope["path"].startswith("/api"):
            scope["path"] = scope["path"][4:] or "/"
    return await app(scope, receive, send)

# Export the wrapped app for Vercel
app = asgi_app
