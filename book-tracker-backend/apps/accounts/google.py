"""Verify Google Sign-In ID tokens.

The browser uses Google Identity Services to obtain an ID token (a signed JWT)
and sends it to us. We verify the signature and audience offline with the
`google-auth` library, then trust the contained email to log the user in. This
keeps Google auth on the same cookie-JWT session mechanism as the rest of the
app (no separate session system, no allauth machinery).
"""

from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token


class GoogleAuthError(Exception):
    """Raised when a Google ID token is missing, invalid, or unverified."""


def verify_google_id_token(credential: str) -> dict:
    """Validate a Google ID token and return its claims.

    Raises GoogleAuthError on any failure (not configured, bad token,
    unverified email).
    """
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        raise GoogleAuthError("Google sign-in is not configured on the server.")
    if not credential:
        raise GoogleAuthError("Missing Google credential.")

    try:
        claims = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), client_id
        )
    except ValueError as exc:
        raise GoogleAuthError("Invalid or expired Google credential.") from exc

    if not claims.get("email"):
        raise GoogleAuthError("Google account has no email.")
    if claims.get("email_verified") is False:
        raise GoogleAuthError("Google email is not verified.")

    return claims
