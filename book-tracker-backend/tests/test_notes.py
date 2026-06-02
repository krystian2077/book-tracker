import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.catalog.models import Book
from apps.library.models import ReadingNote, UserBook

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


def make_user_book(owner, isbn="9780547928227"):
    book = Book.objects.create(
        title="The Hobbit", author="Tolkien", isbn=isbn, isbn_normalized=isbn, pages=310
    )
    return UserBook.objects.create(user=owner, book=book, rating=5)


def test_create_and_list_notes(db, client, user):
    ub = make_user_book(user)
    create = client.post(
        f"/api/library/{ub.id}/notes/",
        {"content": "Loved the Shire.", "note_type": "reflection", "page_number": 40},
        format="json",
    )
    assert create.status_code == 201
    assert create.json()["user_book"] == ub.id

    listing = client.get(f"/api/library/{ub.id}/notes/")
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_note_content_required(db, client, user):
    ub = make_user_book(user)
    response = client.post(
        f"/api/library/{ub.id}/notes/", {"content": "   "}, format="json"
    )
    assert response.status_code == 400
    assert "content" in response.json()


def test_update_and_delete_note(db, client, user):
    ub = make_user_book(user)
    note = ReadingNote.objects.create(user=user, user_book=ub, content="Initial")
    patch = client.patch(
        f"/api/notes/{note.id}/", {"content": "Updated"}, format="json"
    )
    assert patch.status_code == 200
    assert patch.json()["content"] == "Updated"

    delete = client.delete(f"/api/notes/{note.id}/")
    assert delete.status_code == 204
    assert ReadingNote.objects.count() == 0


def test_cannot_create_note_on_other_users_book(db, client, other_user):
    ub = make_user_book(other_user, isbn="9780132350884")
    response = client.post(
        f"/api/library/{ub.id}/notes/", {"content": "Sneaky"}, format="json"
    )
    assert response.status_code == 404


def test_cannot_access_other_users_note(db, client, other_user):
    ub = make_user_book(other_user, isbn="9780132350884")
    note = ReadingNote.objects.create(user=other_user, user_book=ub, content="Private")

    assert client.get(f"/api/notes/{note.id}/").status_code == 404
    assert client.patch(
        f"/api/notes/{note.id}/", {"content": "Hacked"}, format="json"
    ).status_code == 404
    assert client.delete(f"/api/notes/{note.id}/").status_code == 404


def test_notes_require_authentication(db, user):
    ub = make_user_book(user)
    api = APIClient()
    assert api.get(f"/api/library/{ub.id}/notes/").status_code in {401, 403}
