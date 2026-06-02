from django.db.models import Avg, Count, Q, Sum
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.library.csv_import import import_library_csv
from apps.library.export import export_library
from apps.library.models import ReadingNote, ReadingStatus, UserBook
from apps.library.pagination import LibraryCursorPagination
from apps.library.search import annotate_progress, apply_filters, apply_search
from apps.library.serializers import (
    ReadingNoteSerializer,
    UserBookCreateSerializer,
    UserBookSerializer,
    UserBookUpdateSerializer,
)


class LibraryViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD over the authenticated user's library (UserBook rows).

    Always scoped to `request.user`, so one user can never read or mutate
    another user's library.
    """

    pagination_class = LibraryCursorPagination

    def get_queryset(self):
        queryset = (
            UserBook.objects.filter(user=self.request.user)
            .select_related("book")
        )

        if self.action != "list":
            return queryset

        params = self.request.query_params
        queryset = annotate_progress(queryset)
        queryset = apply_filters(
            queryset,
            status=params.get("status"),
            rating=params.get("rating"),
        )
        search_term = params.get("search")
        if search_term:
            queryset = apply_search(queryset, search_term)
        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter("search", str, description="Title, author or ISBN query"),
            OpenApiParameter("status", str, description="Reading status filter"),
            OpenApiParameter(
                "rating",
                str,
                description="Star bucket (1-5), 'rated', or 'unrated'",
            ),
            OpenApiParameter(
                "sort",
                str,
                description="newest | rating | progress | pages | relevance",
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == "create":
            return UserBookCreateSerializer
        if self.action in {"update", "partial_update"}:
            return UserBookUpdateSerializer
        return UserBookSerializer

    @action(
        detail=False,
        methods=["post"],
        url_path="import-csv",
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_csv(self, request):
        """Bulk-import books from a CSV (title,author,isbn,pages). Ratings from Google Books."""
        file = request.FILES.get("file")
        if file is None:
            raise serializers.ValidationError({"file": ["A CSV file is required."]})
        summary = import_library_csv(request.user, file)
        return Response(summary)

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        """Download the user's library as CSV or JSON (`?export_as=csv|json`).

        Uses `export_as` instead of DRF's reserved `format` query param, which
        would make `format=csv` fail content negotiation with a 404.
        """
        fmt = request.query_params.get("export_as", "csv").lower()
        if fmt not in {"csv", "json"}:
            raise serializers.ValidationError(
                {"export_as": ["Supported values: csv, json."]}
            )
        return export_library(request.user, fmt)


class DashboardView(APIView):
    """Aggregated reading stats + the user's currently-reading shelf."""

    def get(self, request):
        qs = UserBook.objects.filter(user=request.user)
        aggregates = qs.aggregate(
            total_books=Count("id"),
            currently_reading=Count("id", filter=Q(status=ReadingStatus.READING)),
            finished_books=Count("id", filter=Q(status=ReadingStatus.FINISHED)),
            average_rating=Avg("rating"),
            total_pages_read=Sum("current_page"),
        )

        reading = (
            qs.filter(status=ReadingStatus.READING)
            .select_related("book")
            .order_by("-updated_at")[:10]
        )

        return Response(
            {
                "total_books": aggregates["total_books"] or 0,
                "currently_reading": aggregates["currently_reading"] or 0,
                "finished_books": aggregates["finished_books"] or 0,
                "average_rating": (
                    round(aggregates["average_rating"], 2)
                    if aggregates["average_rating"] is not None
                    else None
                ),
                "total_pages_read": aggregates["total_pages_read"] or 0,
                "reading": UserBookSerializer(
                    reading, many=True, context={"request": request}
                ).data,
            }
        )


class ReadingNoteListCreateView(generics.ListCreateAPIView):
    """GET/POST notes for one of the user's books. Always owner-scoped."""

    serializer_class = ReadingNoteSerializer
    pagination_class = None

    def get_user_book(self) -> UserBook:
        return get_object_or_404(
            UserBook, pk=self.kwargs["user_book_id"], user=self.request.user
        )

    def get_queryset(self):
        return ReadingNote.objects.filter(
            user=self.request.user, user_book=self.get_user_book()
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, user_book=self.get_user_book())


class ReadingNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve/update/delete a single note owned by the authenticated user."""

    serializer_class = ReadingNoteSerializer

    def get_queryset(self):
        return ReadingNote.objects.filter(user=self.request.user)
