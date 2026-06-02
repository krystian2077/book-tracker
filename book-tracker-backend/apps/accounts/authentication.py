from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.csrf_tokens import (
    request_origin_trusted,
    validate_api_csrf_token,
)

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return reason


def _enforce_csrf(request) -> None:
    """Protect cookie-JWT auth on unsafe methods.

    Cross-origin SPAs (Vercel + Railway): signed token in ``X-CSRFToken`` plus
    trusted ``Origin`` — no third-party ``csrftoken`` cookie required.

    Same-site / tests without ``Origin``: Django double-submit fallback.
    """
    header_token = request.META.get("HTTP_X_CSRFTOKEN", "")

    if request_origin_trusted(request):
        if validate_api_csrf_token(header_token):
            return
        raise exceptions.PermissionDenied(
            "Security check failed. Refresh the page and try again."
        )

    check = _CSRFCheck(lambda req: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(
            "Security check failed. Refresh the page and try again."
        )


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate using a JWT stored in an httpOnly cookie.

    The browser never exposes the access token to JavaScript (mitigates XSS).
    CSRF is enforced here for unsafe methods via the double-submit token.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.AUTH_COOKIE_ACCESS)
        if not raw_token:
            return None
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        if request.method not in SAFE_METHODS:
            _enforce_csrf(request)

        return user, validated_token
