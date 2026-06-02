import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.catalog.models import Book
from apps.library.models import ReadingStatus, UserBook

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="pw-Test-1234")


@pytest.fixture
def client(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


def make_book(title, isbn, pages=300):
    return Book.objects.create(
        title=title, author="Author", isbn=isbn, isbn_normalized=isbn, pages=pages
    )


def test_dashboard_stats(db, client, user):
    b1 = make_book("Reading One", "9780547928227", pages=300)
    b2 = make_book("Finished One", "9780132350884", pages=400)
    b3 = make_book("Want One", "9780441013593", pages=500)
    UserBook.objects.create(
        user=user, book=b1, rating=4, status=ReadingStatus.READING, current_page=150
    )
    UserBook.objects.create(
        user=user, book=b2, rating=5, status=ReadingStatus.FINISHED, current_page=400
    )
    UserBook.objects.create(
        user=user, book=b3, rating=3, status=ReadingStatus.WANT_TO_READ, current_page=0
    )

    response = client.get("/api/dashboard/")
    assert response.status_code == 200
    data = response.json()
    assert data["total_books"] == 3
    assert data["currently_reading"] == 1
    assert data["finished_books"] == 1
    assert data["average_rating"] == 4.0
    assert data["total_pages_read"] == 550
    assert len(data["reading"]) == 1
    assert data["reading"][0]["book"]["title"] == "Reading One"


def test_patch_current_page(db, client, user):
    book = make_book("Book", "9780547928227", pages=300)
    ub = UserBook.objects.create(
        user=user, book=book, rating=4, status=ReadingStatus.READING
    )
    response = client.patch(
        f"/api/library/{ub.id}/", {"current_page": 120}, format="json"
    )
    assert response.status_code == 200
    assert response.json()["current_page"] == 120


def test_patch_mark_finished_sets_page_and_timestamp(db, client, user):
    book = make_book("Book", "9780547928227", pages=300)
    ub = UserBook.objects.create(
        user=user, book=book, rating=4, status=ReadingStatus.READING, current_page=50
    )
    response = client.patch(
        f"/api/library/{ub.id}/", {"status": "finished"}, format="json"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "finished"
    assert data["current_page"] == 300
    assert data["finished_at"] is not None


def test_patch_current_page_cannot_exceed_pages(db, client, user):
    book = make_book("Book", "9780547928227", pages=300)
    ub = UserBook.objects.create(
        user=user, book=book, rating=4, status=ReadingStatus.READING
    )
    response = client.patch(
        f"/api/library/{ub.id}/", {"current_page": 999}, format="json"
    )
    assert response.status_code == 400
    assert "current_page" in response.json()


def test_patch_rating(db, client, user):
    book = make_book("Book", "9780547928227", pages=300)
    ub = UserBook.objects.create(
        user=user, book=book, rating=4, status=ReadingStatus.READING
    )
    response = client.patch(
        f"/api/library/{ub.id}/", {"rating": "4.5"}, format="json"
    )
    assert response.status_code == 200
    assert float(response.json()["rating"]) == 4.5


def test_patch_rating_rejects_out_of_range(db, client, user):
    book = make_book("Book", "9780547928227", pages=300)
    ub = UserBook.objects.create(
        user=user, book=book, rating=4, status=ReadingStatus.READING
    )
    response = client.patch(
        f"/api/library/{ub.id}/", {"rating": "6"}, format="json"
    )
    assert response.status_code == 400
    assert "rating" in response.json()

def test_dashboard_empty(db, client):
    response = client.get("/api/dashboard/")
    assert response.status_code == 200
    data = response.json()
    assert data["total_books"] == 0
    assert data["average_rating"] is None
    assert data["total_pages_read"] == 0
