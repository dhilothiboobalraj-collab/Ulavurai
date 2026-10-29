import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

project_root = Path(__file__).resolve().parents[1]
load_dotenv(project_root / ".env")
load_dotenv(project_root / "backend" / ".env")

if __package__ == "backend":
    from backend.api import farmer_guide, geospatial, history, model, prediction
    from backend.database import DatabaseError, get_database
    from backend.deployment import validate_production_environment
    from backend.services.predictor import load_predictor, predictor_status
else:
    from api import farmer_guide, geospatial, history, model, prediction
    from database import DatabaseError, get_database
    from deployment import validate_production_environment
    from services.predictor import load_predictor, predictor_status

logger = logging.getLogger(__name__)

is_vercel = os.getenv("VERCEL") == "1"
api_prefix = "/api" if is_vercel else ""


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_production_environment(os.environ, is_vercel=is_vercel)
    database = get_database()
    try:
        database.initialize()
    except DatabaseError:
        logger.warning(
            "Prediction history database is unavailable; model predictions remain enabled."
        )
    load_predictor()
    status = predictor_status()
    if status["status"] != "ok":
        raise RuntimeError(
            "The crop recommendation model or its required local data failed to load."
        )
    logger.info("Database and crop recommendation model initialized.")
    yield


app = FastAPI(
    title="Ulavurai API",
    description="Crop recommendations using the saved Ulavurai crop model.",
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
if is_production:
    allowed_origins = sorted(configured_origins)
else:
    allowed_origins = sorted(
        configured_origins
        | {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
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
app.include_router(geospatial.router, prefix=api_prefix)
app.include_router(geospatial.location_data_router, prefix=api_prefix)
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
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "code": "invalid_request",
            "message": "Request validation failed. Check the listed fields and try again.",
            "errors": errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    recommendation_path = f"{api_prefix}/farmer-guide/crop-recommendations"
    if request.url.path.rstrip("/") == recommendation_path:
        code = (
            "unauthorized" if exc.status_code == 401
            else "authentication_unavailable" if exc.status_code == 503
            else "request_failed"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "code": code,
                "message": str(exc.detail),
                "errors": [],
            },
            headers=exc.headers,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.get(f"{api_prefix}/health")
def health() -> dict:
    return predictor_status()
