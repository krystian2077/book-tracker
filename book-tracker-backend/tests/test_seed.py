from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.catalog.models import Book
from apps.library.management.commands.seed_demo_data import (
    DEMO_BOOKS,
    DEMO_PASSWORD,
    DEMO_USERNAME,
)
from apps.library.models import ReadingNote, UserBook

User = get_user_model()


def test_seed_creates_demo_user_and_library(db):
    call_command("seed_demo_data")

    user = User.objects.get(username=DEMO_USERNAME)
    assert user.check_password(DEMO_PASSWORD)
    assert Book.objects.count() == len(DEMO_BOOKS)
    assert UserBook.objects.filter(user=user).count() == len(DEMO_BOOKS)
    assert ReadingNote.objects.filter(user=user).count() == 4


def test_seed_is_idempotent(db):
    call_command("seed_demo_data")
    call_command("seed_demo_data")

    assert User.objects.filter(username=DEMO_USERNAME).count() == 1
    assert Book.objects.count() == len(DEMO_BOOKS)
    user = User.objects.get(username=DEMO_USERNAME)
    assert UserBook.objects.filter(user=user).count() == len(DEMO_BOOKS)
    assert ReadingNote.objects.filter(user=user).count() == 4
