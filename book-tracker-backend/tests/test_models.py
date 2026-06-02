import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.catalog.models import Book
from apps.library.models import ReadingNote, ReadingStatus, UserBook

User = get_user_model()


@pytest.fixture
def book(db):
    return Book.objects.create(
        title="The Hobbit",
        author="J.R.R. Tolkien",
        isbn="978-0-547-92822-7",
        isbn_normalized="9780547928227",
        pages=310,
    )


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="pw-Test-1234")


def test_book_isbn_normalized_unique(db, book):
    with pytest.raises(IntegrityError):
        Book.objects.create(
            title="Duplicate",
            author="Someone",
            isbn="9780547928227",
            isbn_normalized="9780547928227",
            pages=100,
        )


def test_userbook_unique_per_user_and_book(db, user, book):
    UserBook.objects.create(user=user, book=book, rating=5)
    with pytest.raises(IntegrityError):
        UserBook.objects.create(user=user, book=book, rating=4)


def test_userbook_defaults(db, user, book):
    ub = UserBook.objects.create(user=user, book=book, rating=3)
    assert ub.status == ReadingStatus.WANT_TO_READ
    assert ub.current_page == 0


def test_reading_note_relationship(db, user, book):
    ub = UserBook.objects.create(user=user, book=book, rating=3)
    note = ReadingNote.objects.create(
        user=user, user_book=ub, content="Great opening chapter."
    )
    assert note in ub.notes.all()
