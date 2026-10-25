from __future__ import annotations

import asyncio
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)


def _fetch_authenticated_user_id(token: str, supabase_url: str, publishable_key: str) -> str:
    request = Request(
        f"{supabase_url.rstrip('/')}/auth/v1/user",
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=10) as response:
            user = json.loads(response.read())
    except HTTPError as exc:
        if exc.code in (400, 401, 403):
            raise HTTPException(status_code=401, detail="Invalid or expired access token.") from exc
        raise HTTPException(status_code=503, detail="Supabase authentication is temporarily unavailable.") from exc
    except (
        URLError,
        TimeoutError,
        OSError,
        json.JSONDecodeError,
        UnicodeDecodeError,
    ) as exc:
        raise HTTPException(status_code=503, detail="Supabase authentication is temporarily unavailable.") from exc

    user_id = user.get("id") if isinstance(user, dict) else None
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="Supabase returned an invalid user identity.")
    return user_id


async def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A valid bearer access token is required.")

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    if not supabase_url or not publishable_key:
        raise HTTPException(status_code=503, detail="Backend Supabase authentication is not configured.")

    return await asyncio.to_thread(
        _fetch_authenticated_user_id,
        credentials.credentials,
        supabase_url,
        publishable_key,
    )
