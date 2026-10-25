import os
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api import farmer_guide, history, model, prediction
from backend.database import get_database
from backend.services.predictor import load_predictor, predictor_status


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_database().initialize()
    load_predictor()
    yield


app = FastAPI(
    title="SeasonSense AI API",
    description="Crop recommendations using the saved SeasonSense Random Forest model.",
    version="1.0.0",
    lifespan=lifespan,
)
development_origins = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}
configured_origins = {
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}
allowed_origins = configured_origins or development_origins
is_production = os.getenv("APP_ENV", "").strip().lower() == "production"
if is_production:
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

    if not configured_origins or "*" in configured_origins or invalid_origins:
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS must contain only explicit HTTPS origins "
            "without paths in production."
        )
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(prediction.router)
app.include_router(farmer_guide.router)
app.include_router(model.router)
app.include_router(model.crops_router)
app.include_router(history.router)


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


@app.get("/health")
def health() -> dict:
    return predictor_status()
