from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return reason


def _enforce_csrf(request) -> None:
    """Run Django's CSRF check manually (DRF views are csrf_exempt).

    Cookie-based auth is vulnerable to CSRF, so we require the double-submit
    token (csrftoken cookie echoed in the X-CSRFToken header) on unsafe methods.
    """
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
