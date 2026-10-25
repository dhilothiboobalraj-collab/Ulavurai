import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

if __package__ == "backend":
    from backend.api import farmer_guide, history, model, prediction
    from backend.database import get_database
    from backend.services.predictor import load_predictor, predictor_status
else:
    from api import farmer_guide, history, model, prediction
    from database import get_database
    from services.predictor import load_predictor, predictor_status


is_vercel = os.getenv("VERCEL") == "1"
api_prefix = "/api" if is_vercel else ""


@asynccontextmanager
async def lifespan(_: FastAPI):
    database = get_database()
    if os.getenv("VERCEL") == "1" and not database.database_url:
        raise RuntimeError(
            "DATABASE_URL must be set on Vercel; SQLite is not persistent there."
        )
    database.initialize()
    load_predictor()
    yield


app = FastAPI(
    title="SeasonSense AI API",
    description="Crop recommendations using the saved SeasonSense Random Forest model.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=f"{api_prefix}/docs",
    redoc_url=f"{api_prefix}/redoc",
    openapi_url=f"{api_prefix}/openapi.json",
)
configured_origins = {
    origin.strip()
    for origin in (
        os.getenv("CORS_ALLOWED_ORIGINS")
        or os.getenv("CORS_ORIGINS")
        or ""
    ).split(",")
    if origin.strip()
}
is_production = (
    os.getenv("APP_ENV", "").strip().lower() == "production" or is_vercel
)
if is_production and not is_vercel and not configured_origins:
    raise RuntimeError(
        "CORS_ALLOWED_ORIGINS must contain explicit HTTPS origins in production."
    )
if is_production and configured_origins:
    invalid_origins = set()
    for origin in configured_origins:
        try:
            parsed_origin = urlsplit(origin)
            valid_origin = (
                parsed_origin.scheme == "https"
                and bool(parsed_origin.hostname)
                and not parsed_origin.username
                and not parsed_origin.password
                and not parsed_origin.path
                and not parsed_origin.query
                and not parsed_origin.fragment
            )
        except ValueError:
            valid_origin = False
        if not valid_origin:
            invalid_origins.add(origin)

    if "*" in configured_origins or invalid_origins:
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS must contain only explicit HTTPS origins "
            "without paths in production."
        )
if is_production and not configured_origins:
    allowed_origins = []
else:
    allowed_origins = sorted(
        configured_origins
        | {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(prediction.router, prefix=api_prefix)
app.include_router(farmer_guide.router, prefix=api_prefix)
app.include_router(model.router, prefix=api_prefix)
app.include_router(model.crops_router, prefix=api_prefix)
app.include_router(history.router, prefix=api_prefix)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        {
            "loc": error["loc"],
            "msg": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get(f"{api_prefix}/health")
def health() -> dict:
    return predictor_status()
