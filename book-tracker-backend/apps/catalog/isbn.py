"""ISBN normalization and validation helpers.

Supports ISBN-10 and ISBN-13 with proper checksum validation. Normalization
strips dashes/spaces and upper-cases the trailing 'X' check digit so the same
physical book always maps to one canonical key (`isbn_normalized`).
"""

import re


class InvalidISBNError(ValueError):
    """Raised when a string is not a structurally valid ISBN-10/13."""


def normalize_isbn(raw: str) -> str:
    """Strip separators and whitespace; upper-case a trailing check 'x'."""
    if raw is None:
        return ""
    cleaned = re.sub(r"[\s-]", "", str(raw)).upper()
    return cleaned


def _is_valid_isbn10(value: str) -> bool:
    if not re.fullmatch(r"\d{9}[\dX]", value):
        return False
    total = 0
    for index, char in enumerate(value):
        digit = 10 if char == "X" else int(char)
        total += (10 - index) * digit
    return total % 11 == 0


def _is_valid_isbn13(value: str) -> bool:
    if not re.fullmatch(r"\d{13}", value):
        return False
    total = 0
    for index, char in enumerate(value):
        weight = 1 if index % 2 == 0 else 3
        total += weight * int(char)
    return total % 10 == 0


def is_valid_isbn(normalized: str) -> bool:
    """Return True if the normalized string is a valid ISBN-10 or ISBN-13."""
    return _is_valid_isbn10(normalized) or _is_valid_isbn13(normalized)


def validate_and_normalize_isbn(raw: str) -> str:
    """Normalize then validate. Raises InvalidISBNError on failure."""
    normalized = normalize_isbn(raw)
    if not is_valid_isbn(normalized):
        raise InvalidISBNError("Enter a valid ISBN-10 or ISBN-13.")
    return normalized
