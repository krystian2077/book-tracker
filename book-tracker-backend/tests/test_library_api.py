import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.catalog.models import Book
from apps.library.models import UserBook

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="pw-Test-1234")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="bob", password="pw-Test-1234")


@pytest.fixture
def client(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


def valid_payload(**overrides):
    payload = {
        "title": "The Hobbit",
        "author": "J.R.R. Tolkien",
        "isbn": "978-0-547-92822-7",
        "pages": 310,
        "rating": "4.5",
    }
    payload.update(overrides)
    return payload


def test_create_book_manually_success(db, client):
    response = client.post("/api/library/", valid_payload(), format="json")
    assert response.status_code == 201
    data = response.json()
    assert data["book"]["title"] == "The Hobbit"
    assert data["book"]["isbn_normalized"] == "9780547928227"
    assert float(data["rating"]) == 4.5
    assert Book.objects.count() == 1
    assert UserBook.objects.count() == 1


def test_create_book_requires_rating(db, client):
    payload = valid_payload()
    payload.pop("rating")
    response = client.post("/api/library/", payload, format="json")
    assert response.status_code == 400
    assert "rating" in response.json()


def test_invalid_isbn_rejected(db, client):
    response = client.post("/api/library/", valid_payload(isbn="123"), format="json")
    assert response.status_code == 400
    assert "isbn" in response.json()


def test_pages_must_be_positive(db, client):
    response = client.post("/api/library/", valid_payload(pages=0), format="json")
    assert response.status_code == 400
    assert "pages" in response.json()


def test_duplicate_book_in_library_rejected(db, client):
    client.post("/api/library/", valid_payload(), format="json")
    response = client.post("/api/library/", valid_payload(), format="json")
    assert response.status_code == 400
    assert "isbn" in response.json()


def test_finished_status_sets_current_page_to_pages(db, client):
    response = client.post(
        "/api/library/",
        valid_payload(status="finished", current_page=10),
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert data["current_page"] == 310
    assert data["finished_at"] is not None


def test_current_page_cannot_exceed_pages(db, client):
    response = client.post(
        "/api/library/",
        valid_payload(current_page=999),
        format="json",
    )
    assert response.status_code == 400
    assert "current_page" in response.json()


def test_list_returns_only_authenticated_users_books(db, client, user, other_user):
    book = Book.objects.create(
        title="Dune",
        author="Frank Herbert",
        isbn="9780441013593",
        isbn_normalized="9780441013593",
        pages=412,
    )
    UserBook.objects.create(user=other_user, book=book, rating=4)
    client.post("/api/library/", valid_payload(), format="json")

    response = client.get("/api/library/")
    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["book"]["title"] == "The Hobbit"


def make_isbn13(prefix12: str) -> str:
    """Compute a valid ISBN-13 from a 12-digit prefix (test helper)."""
    total = sum((1 if i % 2 == 0 else 3) * int(d) for i, d in enumerate(prefix12))
    check = (10 - (total % 10)) % 10
    return prefix12 + str(check)


def test_cursor_pagination(db, client, user):
    for i in range(25):
        isbn = make_isbn13(f"9780000{i:05d}")
        book = Book.objects.create(
            title=f"Book {i}",
            author="Author",
            isbn=isbn,
            isbn_normalized=isbn,
            pages=100,
        )
        UserBook.objects.create(user=user, book=book, rating=3)

    response = client.get("/api/library/?page_size=10")
    body = response.json()
    assert len(body["results"]) == 10
    assert body["next"] is not None

    next_response = client.get(body["next"])
    assert next_response.status_code == 200
    assert len(next_response.json()["results"]) == 10


def test_unauthenticated_access_rejected(db):
    api = APIClient()
    response = api.get("/api/library/")
    assert response.status_code in {401, 403}


def test_delete_book_from_library(db, client):
    create = client.post("/api/library/", valid_payload(), format="json")
    user_book_id = create.json()["id"]
    response = client.delete(f"/api/library/{user_book_id}/")
    assert response.status_code == 204
    assert UserBook.objects.count() == 0


def test_cannot_access_other_users_book(db, client, other_user):
    book = Book.objects.create(
        title="Dune",
        author="Frank Herbert",
        isbn="9780441013593",
        isbn_normalized="9780441013593",
        pages=412,
    )
    other_ub = UserBook.objects.create(user=other_user, book=book, rating=4)
    response = client.get(f"/api/library/{other_ub.id}/")
    assert response.status_code == 404
