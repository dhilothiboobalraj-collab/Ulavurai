from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse

from backend.main import app

frontend_dir = Path(__file__).resolve().parent / "frontend" / "dist"
app.frontend("/", directory=frontend_dir, fallback="index.html", check_dir=False)


@app.get("/{path:path}", include_in_schema=False)
def serve_frontend(path: str) -> FileResponse:
    requested_file = (frontend_dir / path).resolve()
    if not requested_file.is_relative_to(frontend_dir.resolve()):
        raise HTTPException(status_code=404, detail="Not found.")
    if requested_file.is_file():
        return FileResponse(requested_file)
    if path == "api" or path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found.")
    index_file = frontend_dir / "index.html"
    if not index_file.is_file():
        raise HTTPException(
            status_code=503,
            detail="Frontend build is missing. Run npm --prefix frontend run build.",
        )
    return FileResponse(index_file)
