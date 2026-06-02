import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.catalog.models import Book
from apps.library.models import ReadingStatus, UserBook

User = get_user_model()


BOOKS = [
    ("The Hobbit", "J.R.R. Tolkien", "9780547928227", 310),
    ("The Lord of the Rings", "J.R.R. Tolkien", "9780261103573", 1178),
    ("Clean Code", "Robert C. Martin", "9780132350884", 464),
    ("Dune", "Frank Herbert", "9780441013593", 412),
]


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
    created = {}
    for i, (title, author, isbn, pages) in enumerate(BOOKS):
        book = Book.objects.create(
            title=title,
            author=author,
            isbn=isbn,
            isbn_normalized=isbn,
            pages=pages,
            description=f"{title} description",
        )
        status = ReadingStatus.READING if i == 0 else ReadingStatus.WANT_TO_READ
        ub = UserBook.objects.create(
            user=user, book=book, rating=(i % 5) + 1, status=status,
            current_page=100 if i == 0 else 0,
        )
        created[title] = ub
    return created


def titles(response):
    return {r["book"]["title"] for r in response.json()["results"]}


def test_search_by_title(db, client, library):
    response = client.get("/api/library/?search=clean")
    assert response.status_code == 200
    assert titles(response) == {"Clean Code"}


def test_search_by_author(db, client, library):
    response = client.get("/api/library/?search=tolkien")
    assert response.status_code == 200
    assert titles(response) == {"The Hobbit", "The Lord of the Rings"}


def test_search_by_isbn(db, client, library):
    response = client.get("/api/library/?search=9780441013593")
    assert response.status_code == 200
    assert titles(response) == {"Dune"}


def test_search_by_isbn_with_dashes(db, client, library):
    response = client.get("/api/library/?search=978-0-441-01359-3")
    assert response.status_code == 200
    assert titles(response) == {"Dune"}


def test_filter_by_status(db, client, library):
    response = client.get("/api/library/?status=reading")
    assert response.status_code == 200
    assert titles(response) == {"The Hobbit"}


def test_filter_by_rating(db, client, library):
    # Ratings assigned as (i % 5) + 1 -> 1,2,3,4
    response = client.get("/api/library/?rating=1")
    assert response.status_code == 200
    assert titles(response) == {"The Hobbit"}


def test_filter_rated(db, client, library):
    response = client.get("/api/library/?rating=rated")
    assert response.status_code == 200
    assert len(titles(response)) == 4


def test_search_only_within_own_library(db, client, user):
    other = User.objects.create_user(username="bob", password="pw-Test-1234")
    book = Book.objects.create(
        title="Secret Tolkien Notes",
        author="J.R.R. Tolkien",
        isbn="9780261102385",
        isbn_normalized="9780261102385",
        pages=200,
    )
    UserBook.objects.create(user=other, book=book, rating=5)
    response = client.get("/api/library/?search=tolkien")
    assert response.status_code == 200
    assert titles(response) == set()


def test_sort_relevance_ranks_title_match_first(db, client, library):
    # "code" matches "Clean Code" by title strongly.
    response = client.get("/api/library/?search=code&sort=relevance")
    assert response.status_code == 200
    results = response.json()["results"]
    assert results[0]["book"]["title"] == "Clean Code"
