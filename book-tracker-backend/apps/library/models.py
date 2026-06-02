from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.catalog.models import Book


class ReadingStatus(models.TextChoices):
    WANT_TO_READ = "want_to_read", "Want to read"
    READING = "reading", "Reading"
    FINISHED = "finished", "Finished"
    PAUSED = "paused", "Paused"


class NoteType(models.TextChoices):
    NOTE = "note", "Note"
    REFLECTION = "reflection", "Reflection"
    SUMMARY = "summary", "Summary"
    REVIEW = "review", "Review"


class UserBook(models.Model):
    """A user's relationship with a catalog Book: rating, status, progress.

    `rating` stores the Google Books community average (e.g. 4.4) when
    available. Reading state is per user. `(user, book)` is unique.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_books",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.PROTECT,
        related_name="user_books",
    )
    # Google Books community average (0–5, one decimal). Null when API has none.
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("5"))],
    )
    status = models.CharField(
        max_length=20,
        choices=ReadingStatus.choices,
        default=ReadingStatus.WANT_TO_READ,
    )
    current_page = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "book"], name="uniq_user_book"
            ),
        ]
        indexes = [
            # Composite index matching the default keyset-pagination ordering
            # (user's library, newest first, id tiebreaker).
            models.Index(
                fields=["user", "-created_at", "-id"], name="userbook_keyset_idx"
            ),
            models.Index(fields=["user", "status"], name="userbook_status_idx"),
            models.Index(fields=["user", "rating"], name="userbook_rating_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} -> {self.book_id} ({self.status})"


class ReadingNote(models.Model):
    """A private note/reflection/summary/review a user writes about a book."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_notes",
    )
    user_book = models.ForeignKey(
        UserBook,
        on_delete=models.CASCADE,
        related_name="notes",
    )
    title = models.CharField(max_length=255, blank=True, default="")
    content = models.TextField()
    note_type = models.CharField(
        max_length=20,
        choices=NoteType.choices,
        default=NoteType.NOTE,
    )
    page_number = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["user_book", "-created_at"], name="note_userbook_idx"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.note_type} on {self.user_book_id}"
