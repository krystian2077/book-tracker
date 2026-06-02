from rest_framework import serializers

from apps.catalog.models import Book


class BookSerializer(serializers.ModelSerializer):
    """Read-only representation of catalog metadata."""

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "author",
            "isbn",
            "isbn_normalized",
            "pages",
            "cover_url",
            "description",
            "published_year",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
