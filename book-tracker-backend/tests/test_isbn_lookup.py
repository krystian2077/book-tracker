import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.catalog import lookup

User = get_user_model()


@pytest.fixture
def client(db):
    user = User.objects.create_user(username="alice", password="pw-Test-1234")
    api = APIClient()
    api.force_authenticate(user=user)
    return api


def test_missing_isbn_param_returns_400(client):
    response = client.get("/api/books/lookup-isbn/")
    assert response.status_code == 400
    assert "isbn" in response.json()


def test_invalid_isbn_returns_400(client):
    response = client.get("/api/books/lookup-isbn/?isbn=123")
    assert response.status_code == 400
    assert "isbn" in response.json()


def test_lookup_found_via_open_library(client, monkeypatch):
    monkeypatch.setattr(
        lookup,
        "_fetch_open_library",
        lambda isbn: {
            "title": "The Hobbit",
            "author": "J.R.R. Tolkien",
            "pages": 310,
            "cover_url": "https://covers.example/large.jpg",
            "description": "A hobbit goes on an adventure.",
            "published_year": 1937,
            "source": "openlibrary",
        },
    )
    monkeypatch.setattr(lookup, "_fetch_google_books", lambda isbn: None)

    response = client.get("/api/books/lookup-isbn/?isbn=978-0-547-92822-7")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "The Hobbit"
    assert data["isbn"] == "9780547928227"
    assert data["source"] == "openlibrary"
    assert "rating" not in data


def test_lookup_merges_google_books_for_missing_fields(client, monkeypatch):
    monkeypatch.setattr(
        lookup,
        "_fetch_open_library",
        lambda isbn: {
            "title": "Clean Code",
            "author": "Robert C. Martin",
            "pages": None,
            "cover_url": None,
            "description": None,
            "published_year": 2008,
            "source": "openlibrary",
        },
    )
    monkeypatch.setattr(
        lookup,
        "_fetch_google_books",
        lambda isbn: {
            "title": "Clean Code",
            "author": "Robert C. Martin",
            "pages": 464,
            "cover_url": "https://books.google/clean.jpg",
            "description": "A handbook of agile software craftsmanship.",
            "published_year": 2008,
            "source": "googlebooks",
        },
    )

    response = client.get("/api/books/lookup-isbn/?isbn=9780132350884")
    assert response.status_code == 200
    data = response.json()
    assert data["pages"] == 464
    assert data["description"].startswith("A handbook")
    assert data["cover_url"] == "https://books.google/clean.jpg"
    assert "rating" not in data
    assert data["source"] == "googlebooks+openlibrary"


def test_lookup_falls_back_to_openlibrary_cover_by_isbn(client, monkeypatch):
    monkeypatch.setattr(
        lookup,
        "_fetch_open_library",
        lambda isbn: {
            "title": "Ostatnie życzenie",
            "author": "Andrzej Sapkowski",
            "pages": 310,
            "cover_url": None,
            "description": "Wiedźmin.",
            "published_year": 2014,
            "source": "openlibrary",
        },
    )
    monkeypatch.setattr(lookup, "_fetch_google_books", lambda isbn: None)
    monkeypatch.setattr(
        lookup,
        "_openlibrary_cover_by_isbn",
        lambda isbn: lookup.openlibrary_cover_url(isbn),
    )

    response = client.get("/api/books/lookup-isbn/?isbn=9788375780635")
    assert response.status_code == 200
    data = response.json()
    assert data["cover_url"] == lookup.openlibrary_cover_url("9788375780635")


def test_lookup_skips_google_when_open_library_is_sufficient(client, monkeypatch):
    monkeypatch.setattr(
        lookup,
        "_fetch_open_library",
        lambda isbn: {
            "title": "The Hobbit",
            "author": "J.R.R. Tolkien",
            "pages": 310,
            "cover_url": "https://covers.example/large.jpg",
            "description": None,
            "published_year": 1937,
            "source": "openlibrary",
        },
    )
    monkeypatch.setattr(lookup, "_fetch_google_books", lambda isbn: None)

    response = client.get("/api/books/lookup-isbn/?isbn=978-0-547-92822-7")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "openlibrary"
    assert data["pages"] == 310
    assert data["cover_url"] == "https://covers.example/large.jpg"


def test_lookup_calls_google_when_open_library_missing_pages_and_cover(client, monkeypatch):
    monkeypatch.setattr(
        lookup,
        "_fetch_open_library",
        lambda isbn: {
            "title": "Sorceleur",
            "author": "Andrzej Sapkowski",
            "pages": None,
            "cover_url": None,
            "description": None,
            "published_year": 2014,
            "source": "openlibrary",
        },
    )
    monkeypatch.setattr(
        lookup,
        "_fetch_google_books",
        lambda isbn: {
            "title": "Sorceleur",
            "author": "Andrzej Sapkowski",
            "pages": 310,
            "cover_url": None,
            "description": None,
            "published_year": 2014,
            "source": "googlebooks",
        },
    )

    response = client.get("/api/books/lookup-isbn/?isbn=9782811205065")
    assert response.status_code == 200
    data = response.json()
    assert data["pages"] == 310
    assert "googlebooks" in data["source"]


def test_lookup_not_found_returns_404(client, monkeypatch):
    monkeypatch.setattr(lookup, "_fetch_open_library", lambda isbn: None)
    monkeypatch.setattr(lookup, "_fetch_google_books", lambda isbn: None)

    response = client.get("/api/books/lookup-isbn/?isbn=9780132350884")
    assert response.status_code == 404


def test_lookup_requires_authentication(db):
    api = APIClient()
    response = api.get("/api/books/lookup-isbn/?isbn=9780132350884")
    assert response.status_code in {401, 403}
