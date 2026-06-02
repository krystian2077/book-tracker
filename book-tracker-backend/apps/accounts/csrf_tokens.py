"""Signed CSRF tokens for cross-origin SPAs (Vercel + Railway).

Browsers may block third-party ``csrftoken`` cookies while still sending JWT
cookies. Django's double-submit check then fails even when the SPA sends
``X-CSRFToken`` from the JSON body. These signed tokens validate via header +
trusted ``Origin`` without requiring the cookie.
"""

from django.conf import settings
from django.core import signing
from urllib.parse import urlparse

CSRF_SALT = "book-tracker-api-csrf"
CSRF_MAX_AGE = 60 * 60 * 24  # 24 hours


def issue_api_csrf_token() -> str:
    return signing.dumps({"v": 1}, salt=CSRF_SALT)


def validate_api_csrf_token(token: str) -> bool:
    if not token:
        return False
    try:
        signing.loads(token, salt=CSRF_SALT, max_age=CSRF_MAX_AGE)
        return True
    except signing.BadSignature:
        return False


def request_origin_trusted(request) -> bool:
    """True when the request comes from a configured frontend origin."""
    origin = request.META.get("HTTP_ORIGIN", "")
    if origin and origin in settings.CSRF_TRUSTED_ORIGINS:
        return True
    referer = request.META.get("HTTP_REFERER", "")
    if referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            ref_origin = f"{parsed.scheme}://{parsed.netloc}"
            if ref_origin in settings.CSRF_TRUSTED_ORIGINS:
                return True
    return False
