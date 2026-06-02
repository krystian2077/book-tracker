from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

User = get_user_model()

ACCESS = settings.AUTH_COOKIE_ACCESS
REFRESH = settings.AUTH_COOKIE_REFRESH


def register_payload(**overrides):
    payload = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "Sup3rSecret!23",
    }
    payload.update(overrides)
    return payload


def test_register_sets_cookies_and_creates_user(db):
    client = APIClient()
    response = client.post("/api/auth/register/", register_payload(), format="json")
    assert response.status_code == 201
    assert response.json()["username"] == "alice"
    assert ACCESS in response.cookies
    assert REFRESH in response.cookies
    assert User.objects.filter(username="alice").exists()


def test_register_rejects_weak_password(db):
    client = APIClient()
    response = client.post(
        "/api/auth/register/", register_payload(password="123"), format="json"
    )
    assert response.status_code == 400
    assert "password" in response.json()


def test_login_success_and_me(db):
    User.objects.create_user(
        username="alice", email="alice@example.com", password="Sup3rSecret!23"
    )
    client = APIClient()
    response = client.post(
        "/api/auth/login/",
        {"username": "alice", "password": "Sup3rSecret!23"},
        format="json",
    )
    assert response.status_code == 200
    assert ACCESS in response.cookies

    me = client.get("/api/auth/me/")
    assert me.status_code == 200
    assert me.json()["username"] == "alice"


def test_login_wrong_password_rejected(db):
    User.objects.create_user(username="alice", password="Sup3rSecret!23")
    client = APIClient()
    response = client.post(
        "/api/auth/login/",
        {"username": "alice", "password": "wrong"},
        format="json",
    )
    assert response.status_code == 401


def test_me_requires_authentication(db):
    client = APIClient()
    response = client.get("/api/auth/me/")
    assert response.status_code in {401, 403}


def test_logout_clears_cookies(db):
    User.objects.create_user(username="alice", password="Sup3rSecret!23")
    client = APIClient()
    client.post(
        "/api/auth/login/",
        {"username": "alice", "password": "Sup3rSecret!23"},
        format="json",
    )
    response = client.post("/api/auth/logout/")
    assert response.status_code == 200
    # delete_cookie sets an expired cookie value.
    assert response.cookies[ACCESS].value == ""


@override_settings(AUTH_COOKIE_SECURE=True, AUTH_COOKIE_SAMESITE="None")
def test_logout_delete_cookie_uses_cross_site_flags(db):
    User.objects.create_user(username="alice", password="Sup3rSecret!23")
    client = APIClient()
    client.post(
        "/api/auth/login/",
        {"username": "alice", "password": "Sup3rSecret!23"},
        format="json",
    )
    response = client.post("/api/auth/logout/")
    access_cookie = response.cookies[ACCESS]
    assert access_cookie["samesite"] == "None"
    assert access_cookie["secure"]


def test_refresh_issues_new_access(db):
    User.objects.create_user(username="alice", password="Sup3rSecret!23")
    client = APIClient()
    client.post(
        "/api/auth/login/",
        {"username": "alice", "password": "Sup3rSecret!23"},
        format="json",
    )
    response = client.post("/api/auth/refresh/")
    assert response.status_code == 200
    assert ACCESS in response.cookies


def test_csrf_endpoint_returns_token(db):
    client = APIClient()
    response = client.get("/api/auth/csrf/")
    assert response.status_code == 200
    assert response.data["csrf_token"]
    assert response.cookies["csrftoken"].value == response.data["csrf_token"]


def test_unsafe_request_without_csrf_rejected(db):
    client = APIClient(enforce_csrf_checks=True)
    client.post("/api/auth/register/", register_payload(), format="json")
    # Access cookie is set, but no csrftoken cookie/header -> CSRF must fail.
    response = client.post(
        "/api/library/",
        {
            "title": "The Hobbit",
            "author": "Tolkien",
            "isbn": "9780547928227",
            "pages": 310,
            "rating": 5,
        },
        format="json",
    )
    assert response.status_code == 403


def test_unsafe_request_with_csrf_succeeds(db):
    client = APIClient(enforce_csrf_checks=True)
    client.post("/api/auth/register/", register_payload(), format="json")
    client.get("/api/auth/csrf/")
    token = client.cookies["csrftoken"].value
    response = client.post(
        "/api/library/",
        {
            "title": "The Hobbit",
            "author": "Tolkien",
            "isbn": "9780547928227",
            "pages": 310,
            "rating": 5,
        },
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 201
