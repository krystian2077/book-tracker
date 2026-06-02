"""Catalog-level helpers shared across features (manual add, CSV, seed)."""

from apps.catalog.models import Book


def get_or_create_book(*, isbn_normalized: str, defaults: dict) -> tuple[Book, bool]:
    """Return an existing catalog Book by normalized ISBN, or create one.

    The catalog is shared: if a book with the same ISBN already exists we reuse
    it rather than duplicating metadata. Optional fields (cover, description,
    published_year) backfill an existing row only when it is currently empty.
    """
    book, created = Book.objects.get_or_create(
        isbn_normalized=isbn_normalized,
        defaults=defaults,
    )
    if not created:
        updated_fields = []
        for field in ("cover_url", "description", "published_year"):
            new_value = defaults.get(field)
            current_value = getattr(book, field)
            is_empty = current_value in (None, "")
            if new_value and is_empty:
                setattr(book, field, new_value)
                updated_fields.append(field)
        if updated_fields:
            book.save(update_fields=updated_fields)
    return book, created
