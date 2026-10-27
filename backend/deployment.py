from __future__ import annotations

from collections.abc import Mapping
from urllib.parse import urlsplit


def validate_production_environment(
    environment: Mapping[str, str],
    *,
    is_vercel: bool = False,
) -> None:
    is_production = (
        environment.get("APP_ENV", "").strip().lower() == "production"
        or is_vercel
    )
    if not is_production:
        return

    required = (
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "DATABASE_URL",
    )
    missing = [name for name in required if not environment.get(name, "").strip()]
    if not is_vercel and not (
        environment.get("CORS_ALLOWED_ORIGINS", "").strip()
        or environment.get("CORS_ORIGINS", "").strip()
    ):
        missing.append("CORS_ALLOWED_ORIGINS")
    if missing:
        names = ", ".join(missing)
        raise RuntimeError(
            "Missing required production environment variables: "
            f"{names}. Configure them on the backend host; do not use "
            "VITE_ variables for backend settings."
        )

    try:
        supabase_url = urlsplit(environment["SUPABASE_URL"].strip())
        database_url = urlsplit(environment["DATABASE_URL"].strip())
    except ValueError as exc:
        raise RuntimeError(
            "SUPABASE_URL and DATABASE_URL must be valid absolute URLs."
        ) from exc
    if (
        supabase_url.scheme != "https"
        or not supabase_url.hostname
        or supabase_url.username
        or supabase_url.password
        or supabase_url.path not in {"", "/"}
        or supabase_url.query
        or supabase_url.fragment
    ):
        raise RuntimeError(
            "SUPABASE_URL must be an absolute HTTPS project URL."
        )

    if (
        database_url.scheme not in {"postgres", "postgresql"}
        or not database_url.hostname
    ):
        raise RuntimeError(
            "DATABASE_URL must use an absolute PostgreSQL connection URL in production."
        )
