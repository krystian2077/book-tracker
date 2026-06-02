import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.catalog.models import Book
from apps.library.models import UserBook

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="pw-Test-1234")


@pytest.fixture
def client(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


def upload(client, content: str):
    csv_file = SimpleUploadedFile(
        "books.csv", content.encode("utf-8"), content_type="text/csv"
    )
    return client.post(
        "/api/library/import-csv/", {"file": csv_file}, format="multipart"
    )


VALID_CSV = (
    "title,author,isbn,pages,rating\n"
    "The Hobbit,J.R.R. Tolkien,9780547928227,310,4.8\n"
    "Clean Code,Robert C. Martin,9780132350884,464,4.6\n"
)


def test_csv_import_success(db, client):
    response = upload(client, VALID_CSV)
    assert response.status_code == 200
    summary = response.json()
    assert summary["created"] == 2
    assert summary["skipped_duplicates"] == 0
    assert summary["failed"] == 0
    assert UserBook.objects.filter(user__username="alice").count() == 2


def test_csv_import_reports_row_errors(db, client):
    content = (
        "title,author,isbn,pages,rating\n"
        "Good Book,Author,9780547928227,310,4.5\n"
        "Bad ISBN,Author,123,100,4\n"
        "Bad Rating,Author,9780441013593,412,9\n"
    )
    response = upload(client, content)
    assert response.status_code == 200
    summary = response.json()
    assert summary["created"] == 1
    assert summary["failed"] == 2


def test_csv_import_skips_duplicates(db, client, user):
    book = Book.objects.create(
        title="The Hobbit",
        author="J.R.R. Tolkien",
        isbn="9780547928227",
        isbn_normalized="9780547928227",
        pages=310,
    )
    UserBook.objects.create(user=user, book=book, rating=4)

    response = upload(client, VALID_CSV)
    assert response.status_code == 200
    summary = response.json()
    assert summary["created"] == 1
    assert summary["skipped_duplicates"] == 1


def test_csv_import_missing_columns(db, client):
    response = upload(client, "title,author\nFoo,Bar\n")
    assert response.status_code == 400
    assert "file" in response.json()


def test_csv_import_requires_file(db, client):
    response = client.post("/api/library/import-csv/", {}, format="multipart")
    assert response.status_code == 400
    assert "file" in response.json()


def test_csv_import_rejects_empty_rating(db, client):
    content = (
        "title,author,isbn,pages,rating\n"
        "No Rating,Author,9780441013593,412,\n"
    )
    response = upload(client, content)
    assert response.status_code == 200
    summary = response.json()
    assert summary["created"] == 0
    assert summary["failed"] == 1
    assert summary["errors"][0]["field"] == "rating"
