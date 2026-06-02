import pytest

from apps.catalog.isbn import (
    InvalidISBNError,
    is_valid_isbn,
    normalize_isbn,
    validate_and_normalize_isbn,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("978-0-547-92822-7", "9780547928227"),
        ("0 306 40615 2", "0306406152"),
        ("080442957x", "080442957X"),
    ],
)
def test_normalize_strips_separators_and_uppercases_x(raw, expected):
    assert normalize_isbn(raw) == expected


@pytest.mark.parametrize(
    "value",
    ["9780547928227", "9780132350884", "0306406152", "080442957X"],
)
def test_valid_isbns(value):
    assert is_valid_isbn(value) is True


@pytest.mark.parametrize(
    "value",
    ["9780547928226", "1234567890", "abc", "", "97805479282270"],
)
def test_invalid_isbns(value):
    assert is_valid_isbn(value) is False


def test_validate_and_normalize_raises_on_invalid():
    with pytest.raises(InvalidISBNError):
        validate_and_normalize_isbn("not-an-isbn")


def test_validate_and_normalize_returns_canonical():
    assert validate_and_normalize_isbn("978-0-13-235088-4") == "9780132350884"
