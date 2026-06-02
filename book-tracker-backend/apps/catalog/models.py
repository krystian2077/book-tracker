from django.contrib.postgres.indexes import GinIndex
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

# Reasonable upper bounds to reject absurd input while not blocking real books.
MAX_PAGES = 100_000
MIN_PUBLISHED_YEAR = 1


class Book(models.Model):
    """Shared catalog metadata for a book (not user-specific).

    One row represents one physical/edition identity keyed by `isbn_normalized`.
    User-specific state (rating, status, progress) lives on `UserBook`.
    """

    title = models.CharField(max_length=512)
    author = models.CharField(max_length=512)
    # `isbn` keeps the original user-entered value; `isbn_normalized` is the
    # canonical, de-dashed key used for uniqueness and exact lookups.
    isbn = models.CharField(max_length=20)
    isbn_normalized = models.CharField(max_length=13, unique=True)
    pages = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(MAX_PAGES)]
    )
    cover_url = models.URLField(max_length=1000, blank=True, default="")
    description = models.TextField(blank=True, default="")
    published_year = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(MIN_PUBLISHED_YEAR), MaxValueValidator(2100)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            # Trigram GIN indexes power fast partial (ILIKE / similarity) search
            # on large datasets without scanning every row.
            GinIndex(
                name="book_title_trgm_idx",
                fields=["title"],
                opclasses=["gin_trgm_ops"],
            ),
            GinIndex(
                name="book_author_trgm_idx",
                fields=["author"],
                opclasses=["gin_trgm_ops"],
            ),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.isbn_normalized})"
