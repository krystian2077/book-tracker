"""Search + filter logic for the user's library.

Search is scoped to the authenticated user's library and chooses a strategy:

* ISBN-like input -> exact/prefix match on the indexed `isbn_normalized`.
* Free text -> partial match on title/author (and description) accelerated by
  the pg_trgm GIN indexes, ranked by trigram similarity (title > author).

Naive unindexed ILIKE scans are avoided: the trigram GIN indexes back the
`icontains` lookups, and ISBN lookups hit the unique B-tree index.
"""

import re

from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import F, FloatField, Q, QuerySet, Value
from django.db.models.functions import Cast, Greatest

from apps.catalog.isbn import normalize_isbn

ISBN_LIKE = re.compile(r"^[0-9Xx\- ]{8,}$")


def looks_like_isbn(term: str) -> bool:
    return bool(ISBN_LIKE.match(term.strip()))


def apply_search(queryset: QuerySet, term: str) -> QuerySet:
    term = term.strip()
    if not term:
        return queryset

    if looks_like_isbn(term):
        normalized = normalize_isbn(term)
        # Exact normalized ISBN lookup (prefix to support partial typing).
        return queryset.filter(book__isbn_normalized__startswith=normalized).annotate(
            relevance=Value(1.0, output_field=FloatField())
        )

    # Free-text trigram search; relevance weights title above author.
    return (
        queryset.annotate(
            relevance=Greatest(
                TrigramSimilarity("book__title", term) * Value(2.0),
                TrigramSimilarity("book__author", term),
                output_field=FloatField(),
            )
        )
        .filter(
            Q(book__title__icontains=term)
            | Q(book__author__icontains=term)
            | Q(book__description__icontains=term)
        )
    )


def apply_filters(queryset: QuerySet, *, status: str | None, rating: str | None) -> QuerySet:
    if status:
        queryset = queryset.filter(status=status)
    if rating:
        # "rated" / "unrated" back dashboard drill-downs and the library filter.
        if rating == "rated":
            queryset = queryset.filter(rating__isnull=False)
        elif rating == "unrated":
            queryset = queryset.filter(rating__isnull=True)
        else:
            try:
                star = int(rating)
                if 1 <= star <= 5:
                    queryset = queryset.filter(
                        rating__gte=star,
                        rating__lt=star + 1 if star < 5 else 6,
                    )
            except (TypeError, ValueError):
                pass
    return queryset


def annotate_progress(queryset: QuerySet) -> QuerySet:
    """Annotate fields used by the 'progress' and 'pages' sorts.

    `book_pages` mirrors the related `book.pages` as a direct attribute so the
    keyset paginator can read it off each instance for the 'pages' ordering.
    """
    return queryset.annotate(
        progress_ratio=Cast(F("current_page"), FloatField())
        / Greatest(Cast(F("book__pages"), FloatField()), Value(1.0)),
        book_pages=F("book__pages"),
    )
