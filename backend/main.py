import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api import farmer_guide, history, model, prediction
from backend.database import get_database
from backend.services.predictor import load_predictor, predictor_status


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
)
configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
is_vercel = os.getenv("VERCEL") == "1"
api_prefix = "/api" if is_vercel else ""
if is_vercel and "*" in configured_origins:
    raise ValueError("CORS_ORIGINS must not contain '*' in production.")
allowed_origins = (
    configured_origins
    if is_vercel
    else list(
        dict.fromkeys(
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                *configured_origins,
            ]
        )
    )
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
