from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts import views as account_views

User = get_user_model()

ACCESS = settings.AUTH_COOKIE_ACCESS


def test_google_login_creates_user_and_sets_cookies(db, settings, monkeypatch):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    monkeypatch.setattr(
        account_views,
        "verify_google_id_token",
        lambda credential: {"email": "newuser@example.com", "email_verified": True},
    )
    client = APIClient()
    response = client.post("/api/auth/google/", {"credential": "fake"}, format="json")
    assert response.status_code == 201
    assert response.json()["email"] == "newuser@example.com"
    assert ACCESS in response.cookies
    assert User.objects.filter(email="newuser@example.com").exists()


def test_google_login_reuses_existing_user(db, settings, monkeypatch):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
    existing = User.objects.create_user(
        username="existing", email="existing@example.com", password="pw-Test-1234"
    )
    monkeypatch.setattr(
        account_views,
        "verify_google_id_token",
        lambda credential: {"email": "existing@example.com", "email_verified": True},
    )
    client = APIClient()
    response = client.post("/api/auth/google/", {"credential": "fake"}, format="json")
    assert response.status_code == 200
    assert response.json()["id"] == existing.id
    assert User.objects.filter(email="existing@example.com").count() == 1


def test_google_login_invalid_token_rejected(db, settings, monkeypatch):
    from apps.accounts.google import GoogleAuthError

    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"

    def boom(credential):
        raise GoogleAuthError("Invalid or expired Google credential.")

    monkeypatch.setattr(account_views, "verify_google_id_token", boom)
    client = APIClient()
    response = client.post("/api/auth/google/", {"credential": "bad"}, format="json")
    assert response.status_code == 401


def test_google_login_not_configured(db, settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    client = APIClient()
    response = client.post("/api/auth/google/", {"credential": "x"}, format="json")
    assert response.status_code == 503
