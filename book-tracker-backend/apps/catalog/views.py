from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.isbn import InvalidISBNError
from apps.catalog.lookup import lookup_isbn


class ISBNLookupView(APIView):
    """GET /api/books/lookup-isbn/?isbn=... -> normalized metadata for autofill."""

    @extend_schema(
        parameters=[OpenApiParameter("isbn", str, required=True)],
        responses={200: dict},
    )
    def get(self, request):
        isbn = request.query_params.get("isbn", "").strip()
        if not isbn:
            return Response(
                {"isbn": ["This query parameter is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = lookup_isbn(isbn)
        except InvalidISBNError as exc:
            return Response(
                {"isbn": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST
            )

        if data is None:
            return Response(
                {"detail": "No metadata found for this ISBN."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data)
