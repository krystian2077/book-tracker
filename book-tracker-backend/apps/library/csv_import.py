"""CSV import for the user's library.

Expected header: title,author,isbn,pages,rating

Rating is required on every row (0–5, one decimal). Duplicates already in the
user's library are skipped (not failed). A per-row error report is returned.
"""

import csv
import io
from decimal import Decimal, InvalidOperation

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.library.serializers import UserBookCreateSerializer

MAX_ROWS = 500
REQUIRED_COLUMNS = ["title", "author", "isbn", "pages", "rating"]
DUPLICATE_MESSAGE = "This book is already in your library."
CSV_RATING_REQUIRED_MSG = "Rating is required (0–5, e.g. 4 or 4.5)."
CSV_RATING_INVALID_MSG = "Rating must be between 0 and 5 (one decimal place)."


def _parse_csv_rating(raw: str) -> tuple[Decimal | None, str | None]:
    stripped = raw.strip()
    if not stripped:
        return None, CSV_RATING_REQUIRED_MSG
    try:
        rating = Decimal(stripped).quantize(Decimal("0.1"))
    except InvalidOperation:
        return None, CSV_RATING_INVALID_MSG
    if rating < 0 or rating > 5:
        return None, CSV_RATING_INVALID_MSG
    return rating, None


def import_library_csv(user, file) -> dict:
    try:
        decoded = file.read().decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise serializers.ValidationError(
            {"file": ["File must be UTF-8 encoded text."]}
        ) from exc

    reader = csv.DictReader(io.StringIO(decoded))
    if reader.fieldnames is None:
        raise serializers.ValidationError({"file": ["The CSV file is empty."]})

    normalized_headers = {(h or "").strip().lower() for h in reader.fieldnames}
    missing = [c for c in REQUIRED_COLUMNS if c not in normalized_headers]
    if missing:
        raise serializers.ValidationError(
            {"file": [f"Missing required columns: {', '.join(missing)}."]}
        )

    rows = list(reader)
    if len(rows) > MAX_ROWS:
        raise serializers.ValidationError(
            {"file": [f"Too many rows (max {MAX_ROWS} per upload)."]}
        )

    created = 0
    skipped_duplicates = 0
    failed = 0
    errors: list[dict] = []

    for index, raw_row in enumerate(rows, start=2):  # row 1 is the header
        row = {col: (raw_row.get(col) or "").strip() for col in REQUIRED_COLUMNS}
        rating_value, rating_error = _parse_csv_rating(row["rating"])
        if rating_error:
            failed += 1
            errors.append({"row": index, "field": "rating", "message": rating_error})
            continue

        serializer = UserBookCreateSerializer(
            data={**row, "rating": rating_value},
            context={"request": _RequestStub(user)},
        )
        if not serializer.is_valid():
            failed += 1
            for field, messages in serializer.errors.items():
                message = messages[0] if isinstance(messages, list) else str(messages)
                errors.append({"row": index, "field": field, "message": str(message)})
            continue

        try:
            serializer.save()
            created += 1
        except ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict) and DUPLICATE_MESSAGE in str(detail.get("isbn")):
                skipped_duplicates += 1
            else:
                failed += 1
                errors.append(
                    {"row": index, "field": "isbn", "message": str(detail)}
                )

    return {
        "created": created,
        "skipped_duplicates": skipped_duplicates,
        "failed": failed,
        "errors": errors,
    }


class _RequestStub:
    """Minimal stand-in providing `.user` for the serializer context."""

    def __init__(self, user):
        self.user = user
