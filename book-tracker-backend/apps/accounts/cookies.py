"""Helpers for writing/clearing the httpOnly JWT auth cookies."""

from django.conf import settings
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


def _common_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "path": settings.AUTH_COOKIE_PATH,
    }


def set_auth_cookies(response: Response, access: str, refresh: str | None = None) -> None:
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS,
        access,
        max_age=access_max_age,
        **_common_kwargs(),
    )
    if refresh is not None:
        refresh_max_age = int(
            settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
        )
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH,
            refresh,
            max_age=refresh_max_age,
            **_common_kwargs(),
        )


def clear_auth_cookies(response: Response) -> None:
    # Django delete_cookie only accepts path/samesite; it auto-sets Secure when
    # samesite is "none" (required for cross-site cookies on Vercel + Railway).
    delete_kwargs = {
        "path": settings.AUTH_COOKIE_PATH,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
    }
    response.delete_cookie(settings.AUTH_COOKIE_ACCESS, **delete_kwargs)
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, **delete_kwargs)


def issue_tokens_for_user(user) -> tuple[str, str]:
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)
