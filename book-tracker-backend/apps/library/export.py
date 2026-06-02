"""Export the authenticated user's library as CSV or JSON."""

import csv
import io
import json
from collections.abc import Iterator

from django.http import HttpResponse

from apps.library.models import UserBook

EXPORT_FIELDS = [
    "title",
    "author",
    "isbn",
    "pages",
    "rating",
    "status",
    "current_page",
    "created_at",
]


def _user_books_queryset(user):
    return (
        UserBook.objects.filter(user=user)
        .select_related("book")
        .order_by("-created_at", "-id")
        .iterator(chunk_size=500)
    )


def _row_dict(user_book: UserBook) -> dict:
    book = user_book.book
    rating = user_book.rating
    return {
        "title": book.title,
        "author": book.author,
        "isbn": book.isbn,
        "pages": book.pages,
        "rating": float(rating) if rating is not None else None,
        "status": user_book.status,
        "current_page": user_book.current_page,
        "created_at": user_book.created_at.isoformat(),
    }


def export_as_json(user) -> HttpResponse:
    rows = [_row_dict(ub) for ub in _user_books_queryset(user)]
    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    response = HttpResponse(payload, content_type="application/json; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="library.json"'
    return response


def _csv_rows(user) -> Iterator[list]:
    yield EXPORT_FIELDS
    for user_book in _user_books_queryset(user):
        row = _row_dict(user_book)
        yield [row[key] if row[key] is not None else "" for key in EXPORT_FIELDS]


def export_as_csv(user) -> HttpResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for row in _csv_rows(user):
        writer.writerow(row)
    response = HttpResponse(buffer.getvalue(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="library.csv"'
    return response


def export_library(user, fmt: str):
    if fmt == "json":
        return export_as_json(user)
    if fmt == "csv":
        return export_as_csv(user)
    raise ValueError(f"Unsupported format: {fmt}")
