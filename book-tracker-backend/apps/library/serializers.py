from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.catalog.isbn import InvalidISBNError, validate_and_normalize_isbn
from apps.catalog.models import MAX_PAGES
from apps.catalog.serializers import BookSerializer
from apps.catalog.services import get_or_create_book
from apps.library.models import ReadingNote, ReadingStatus, UserBook


class UserBookSerializer(serializers.ModelSerializer):
    """Read representation: nested catalog book + user-specific state."""

    book = BookSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    rating = serializers.DecimalField(
        max_digits=3, decimal_places=1, read_only=True, allow_null=True, coerce_to_string=False
    )

    class Meta:
        model = UserBook
        fields = [
            "id",
            "book",
            "rating",
            "status",
            "status_display",
            "current_page",
            "started_at",
            "finished_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class UserBookCreateSerializer(serializers.Serializer):
    """Manual add: flat book metadata + user-specific status/progress/rating."""

    title = serializers.CharField(max_length=512)
    author = serializers.CharField(max_length=512)
    isbn = serializers.CharField(max_length=20)
    pages = serializers.IntegerField(min_value=1, max_value=MAX_PAGES)
    rating = serializers.DecimalField(
        max_digits=3,
        decimal_places=1,
        min_value=Decimal("0"),
        max_value=Decimal("5"),
    )
    status = serializers.ChoiceField(
        choices=ReadingStatus.choices, default=ReadingStatus.WANT_TO_READ
    )
    current_page = serializers.IntegerField(min_value=0, default=0)
    # Optional catalog fields (used by ISBN autofill / CSV import).
    cover_url = serializers.URLField(
        max_length=1000, required=False, allow_blank=True, allow_null=True
    )
    description = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    published_year = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=2100
    )

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_author(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_isbn(self, value: str) -> str:
        try:
            return validate_and_normalize_isbn(value)
        except InvalidISBNError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate(self, attrs: dict) -> dict:
        pages = attrs["pages"]
        status = attrs.get("status", ReadingStatus.WANT_TO_READ)
        current_page = attrs.get("current_page", 0)

        if status == ReadingStatus.FINISHED:
            # Finishing a book implies reading all of it.
            current_page = pages
        if current_page > pages:
            raise serializers.ValidationError(
                {"current_page": "Current page cannot exceed the book's page count."}
            )
        attrs["current_page"] = current_page
        attrs["status"] = status
        return attrs

    def create(self, validated_data: dict) -> UserBook:
        user = self.context["request"].user
        normalized = validated_data["isbn"]

        book, _ = get_or_create_book(
            isbn_normalized=normalized,
            defaults={
                "title": validated_data["title"],
                "author": validated_data["author"],
                "isbn": validated_data["isbn"],
                "pages": validated_data["pages"],
                "cover_url": validated_data.get("cover_url") or "",
                "description": validated_data.get("description", ""),
                "published_year": validated_data.get("published_year"),
            },
        )

        if UserBook.objects.filter(user=user, book=book).exists():
            raise serializers.ValidationError(
                {"isbn": "This book is already in your library."}
            )

        status = validated_data["status"]
        now = timezone.now()
        return UserBook.objects.create(
            user=user,
            book=book,
            rating=validated_data["rating"],
            status=status,
            current_page=validated_data["current_page"],
            started_at=now if status in {ReadingStatus.READING, ReadingStatus.FINISHED} else None,
            finished_at=now if status == ReadingStatus.FINISHED else None,
        )

    def to_representation(self, instance: UserBook) -> dict:
        return UserBookSerializer(instance, context=self.context).data


class ReadingNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadingNote
        fields = [
            "id",
            "user_book",
            "title",
            "content",
            "note_type",
            "page_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_book", "created_at", "updated_at"]

    def validate_content(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value


class UserBookUpdateSerializer(serializers.ModelSerializer):
    """PATCH user-specific fields: status, current_page, rating."""

    rating = serializers.DecimalField(
        max_digits=3,
        decimal_places=1,
        required=False,
        min_value=Decimal("0"),
        max_value=Decimal("5"),
    )

    class Meta:
        model = UserBook
        fields = ["status", "current_page", "rating"]
        extra_kwargs = {
            "status": {"required": False},
            "current_page": {"required": False},
        }

    def validate_current_page(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Current page cannot be negative.")
        if value > self.instance.book.pages:
            raise serializers.ValidationError(
                "Current page cannot exceed the book's page count."
            )
        return value

    def update(self, instance: UserBook, validated_data: dict) -> UserBook:
        now = timezone.now()
        new_status = validated_data.get("status", instance.status)

        if "current_page" in validated_data:
            instance.current_page = validated_data["current_page"]

        if "rating" in validated_data:
            instance.rating = validated_data["rating"]

        if new_status != instance.status:
            instance.status = new_status
            if new_status == ReadingStatus.FINISHED:
                instance.current_page = instance.book.pages
                instance.finished_at = now
            elif new_status == ReadingStatus.READING and instance.started_at is None:
                instance.started_at = now

        instance.save()
        return instance

    def to_representation(self, instance: UserBook) -> dict:
        return UserBookSerializer(instance, context=self.context).data
