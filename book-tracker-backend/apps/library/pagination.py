from rest_framework.pagination import CursorPagination


class LibraryCursorPagination(CursorPagination):
    """Keyset pagination for the user's library, with sort-aware ordering.

    Cursor (keyset) pagination is used instead of OFFSET/LIMIT so performance
    stays constant even at ~10M rows: each page is a `WHERE (created_at, id) <
    cursor` range scan backed by the `userbook_keyset_idx` composite index,
    rather than scanning and discarding millions of rows for a large OFFSET.

    The default `newest` ordering maps directly onto that index. The `rating`,
    `progress` and `relevance` sorts are provided for UX; they keyset on the
    sort field with an `id` tiebreaker. See README for the scaling caveat on
    low-cardinality sort fields (e.g. rating).
    """

    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"
    ordering = ("-created_at", "-id")

    SORT_MAP = {
        "newest": ("-created_at", "-id"),
        "rating": ("-rating", "-id"),
        "progress": ("-progress_ratio", "-id"),
        "pages": ("-book_pages", "-id"),
        "relevance": ("-relevance", "-id"),
    }

    def get_ordering(self, request, queryset, view):
        sort = request.query_params.get("sort", "newest")
        if sort == "relevance" and not request.query_params.get("search"):
            sort = "newest"
        return self.SORT_MAP.get(sort, self.ordering)
