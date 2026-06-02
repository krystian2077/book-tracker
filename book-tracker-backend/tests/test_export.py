import json

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
def client(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


@pytest.fixture
def library(db, user):
    book = Book.objects.create(
        title="The Hobbit",
        author="J.R.R. Tolkien",
        isbn="9780547928227",
        isbn_normalized="9780547928227",
        pages=310,
    )
    UserBook.objects.create(user=user, book=book, rating=5, status="finished")
    book2 = Book.objects.create(
        title="Untitled Shelf",
        author="Anonymous",
        isbn="9780000000002",
        isbn_normalized="9780000000002",
        pages=100,
    )
    UserBook.objects.create(user=user, book=book2, rating=None, status="want_to_read")


def test_export_json(db, client, library):
    response = client.get("/api/library/export/?export_as=json")
    assert response.status_code == 200
    assert "application/json" in response["Content-Type"]
    data = json.loads(response.content)
    assert len(data) == 2
    titles = {row["title"] for row in data}
    assert titles == {"The Hobbit", "Untitled Shelf"}
    assert any(row["rating"] is None for row in data)


def test_export_csv(db, client, library):
    response = client.get("/api/library/export/?export_as=csv")
    assert response.status_code == 200
    assert "text/csv" in response["Content-Type"]
    body = response.content.decode("utf-8")
    assert "title,author,isbn" in body
    assert "The Hobbit" in body
    assert "Untitled Shelf" in body


def test_export_invalid_format(db, client, library):
    response = client.get("/api/library/export/?export_as=xml")
    assert response.status_code == 400


def test_filter_unrated(db, client, library):
    response = client.get("/api/library/?rating=unrated")
    assert response.status_code == 200
    titles = {r["book"]["title"] for r in response.json()["results"]}
    assert titles == {"Untitled Shelf"}
