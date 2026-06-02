"""External ISBN metadata lookup (Open Library, with Google Books fallback).

Lookups go through the backend (not the browser) so we can normalize/validate
the ISBN, set timeouts, merge two sources, and avoid CORS/leaking API usage to
the client. Results are never auto-saved; they only prefill the add-book form.
"""

import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor

import requests
from django.conf import settings

from apps.catalog.isbn import validate_and_normalize_isbn

logger = logging.getLogger(__name__)

METADATA_TIMEOUT_SECONDS = 5
COVER_VERIFY_TIMEOUT_SECONDS = 2

# After a 429 from Google Books, skip further calls briefly so lookups stay fast.
_google_books_blocked_until: float = 0.0
GOOGLE_BACKOFF_SECONDS = 120


def _extract_year(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\d{4}", str(value))
    return int(match.group()) if match else None


def openlibrary_cover_url(isbn: str) -> str:
    """Predictable Open Library cover URL (may 404 if no image is on file)."""
    return f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"


def _https_cover_url(url: str | None) -> str | None:
    if not url:
        return None
    return url.replace("http://", "https://", 1)


def _is_sufficient_open_library(data: dict | None) -> bool:
    """Enough metadata to skip Google Books (user can fill missing pages/cover)."""
    if not data or not data.get("title") or not data.get("author"):
        return False
    return bool(data.get("pages") or data.get("cover_url"))


def _openlibrary_cover_by_isbn(isbn: str) -> str | None:
    """Return an ISBN cover URL only when Open Library confirms the image exists."""
    url = f"{openlibrary_cover_url(isbn)}?default=false"
    try:
        response = requests.head(
            url, timeout=COVER_VERIFY_TIMEOUT_SECONDS, allow_redirects=True
        )
    except requests.RequestException as exc:
        logger.warning("Open Library cover verify failed for %s: %s", isbn, exc)
        return None
    if response.status_code == 200:
        return openlibrary_cover_url(isbn)
    return None


def _authors_from_open_library(authors: list) -> str | None:
    names = [a.get("name", "") for a in authors if isinstance(a, dict)]
    joined = ", ".join(n for n in names if n).strip(", ")
    return joined or None


def _fetch_open_library_data(isbn: str) -> dict | None:
    url = "https://openlibrary.org/api/books"
    params = {"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "data"}
    try:
        response = requests.get(url, params=params, timeout=METADATA_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Open Library lookup failed for %s: %s", isbn, exc)
        return None

    record = payload.get(f"ISBN:{isbn}")
    if not record:
        return None

    cover = record.get("cover") or {}
    return {
        "title": record.get("title"),
        "author": _authors_from_open_library(record.get("authors") or []),
        "pages": record.get("number_of_pages"),
        "cover_url": _https_cover_url(
            cover.get("large") or cover.get("medium") or cover.get("small")
        ),
        "description": None,
        "published_year": _extract_year(record.get("publish_date")),
        "source": "openlibrary",
    }


def _fetch_open_library_details(isbn: str) -> dict | None:
    """Second Open Library pass — often exposes cover IDs when `data` omits them."""
    url = "https://openlibrary.org/api/books"
    params = {"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "details"}
    try:
        response = requests.get(url, params=params, timeout=METADATA_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Open Library details lookup failed for %s: %s", isbn, exc)
        return None

    record = payload.get(f"ISBN:{isbn}")
    if not record:
        return None

    details = record.get("details") or {}
    cover_ids = details.get("covers") or []
    cover_url = _https_cover_url(record.get("thumbnail_url"))
    if not cover_url and cover_ids:
        cover_url = f"https://covers.openlibrary.org/b/id/{cover_ids[0]}-L.jpg"

    return {
        "title": details.get("title") or details.get("full_title"),
        "author": _authors_from_open_library(details.get("authors") or []),
        "pages": details.get("number_of_pages"),
        "cover_url": cover_url,
        "description": None,
        "published_year": _extract_year(details.get("publish_date")),
        "source": "openlibrary",
    }


def _fetch_open_library_search(isbn: str) -> dict | None:
    """Fallback when bibkeys API has no record for this edition."""
    try:
        response = requests.get(
            "https://openlibrary.org/search.json",
            params={"q": f"isbn:{isbn}", "limit": 1},
            timeout=METADATA_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Open Library search failed for %s: %s", isbn, exc)
        return None

    docs = payload.get("docs") or []
    if not docs:
        return None

    doc = docs[0]
    cover_i = doc.get("cover_i")
    return {
        "title": doc.get("title"),
        "author": ", ".join(doc.get("author_name") or []) or None,
        "pages": doc.get("number_of_pages_median"),
        "cover_url": (
            f"https://covers.openlibrary.org/b/id/{cover_i}-L.jpg" if cover_i else None
        ),
        "description": None,
        "published_year": doc.get("first_publish_year"),
        "source": "openlibrary",
    }


def _fetch_open_library(isbn: str) -> dict | None:
    with ThreadPoolExecutor(max_workers=2) as pool:
        data_future = pool.submit(_fetch_open_library_data, isbn)
        details_future = pool.submit(_fetch_open_library_details, isbn)
        primary = _merge(data_future.result(), details_future.result())

    if primary and primary.get("title"):
        return primary

    return _fetch_open_library_search(isbn)


def _fetch_google_books(isbn: str) -> dict | None:
    global _google_books_blocked_until

    if time.monotonic() < _google_books_blocked_until:
        return None

    url = "https://www.googleapis.com/books/v1/volumes"
    params: dict[str, str] = {"q": f"isbn:{isbn}"}
    api_key = getattr(settings, "GOOGLE_BOOKS_API_KEY", "") or ""
    if api_key:
        params["key"] = api_key

    try:
        response = requests.get(
            url, params=params, timeout=METADATA_TIMEOUT_SECONDS
        )
        if response.status_code == 429:
            _google_books_blocked_until = time.monotonic() + GOOGLE_BACKOFF_SECONDS
            logger.warning("Google Books rate-limited for %s; pausing lookups", isbn)
            return None
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Google Books lookup failed for %s: %s", isbn, exc)
        return None

    items = payload.get("items") or []
    if not items:
        return None

    info = items[0].get("volumeInfo", {})
    image_links = info.get("imageLinks") or {}
    return {
        "title": info.get("title"),
        "author": ", ".join(info.get("authors") or []) or None,
        "pages": info.get("pageCount"),
        "cover_url": _https_cover_url(
            image_links.get("thumbnail")
            or image_links.get("smallThumbnail")
            or image_links.get("medium")
            or image_links.get("large")
        ),
        "description": info.get("description"),
        "published_year": _extract_year(info.get("publishedDate")),
        "source": "googlebooks",
    }


def _merge(primary: dict | None, secondary: dict | None) -> dict | None:
    """Combine sources, preferring `primary` but backfilling empty fields."""
    if not primary:
        return secondary
    if not secondary:
        return primary
    merged = dict(primary)
    for field in ("title", "author", "pages", "cover_url", "description", "published_year"):
        if not merged.get(field) and secondary.get(field):
            merged[field] = secondary[field]
    sources = {primary.get("source"), secondary.get("source")} - {None}
    merged["source"] = "+".join(sorted(sources))
    return merged


def _finalize(normalized: str, primary: dict) -> dict:
    if not primary.get("cover_url"):
        verified = _openlibrary_cover_by_isbn(normalized)
        if verified:
            primary["cover_url"] = verified
    primary["isbn"] = normalized
    return primary


def lookup_isbn(isbn_raw: str) -> dict | None:
    """Validate the ISBN and return normalized metadata, or None if not found.

    Raises InvalidISBNError if the ISBN is structurally invalid.
    """
    normalized = validate_and_normalize_isbn(isbn_raw)

    open_library = _fetch_open_library(normalized)
    if _is_sufficient_open_library(open_library):
        primary = open_library
    else:
        google_books = _fetch_google_books(normalized)
        primary = _merge(open_library, google_books)

    if not primary or not primary.get("title"):
        return None

    return _finalize(normalized, primary)
