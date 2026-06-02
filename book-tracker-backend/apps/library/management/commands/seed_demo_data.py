"""Seed a demo account with a curated library of 30 popular books.

Run: python manage.py seed_demo_data

Uses a hand-curated fixture with real, verified ISBNs (validated at runtime)
rather than live external lookups, so seeding is deterministic and offline.
Cover images use Open Library's stable cover-by-ISBN URLs.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.catalog.isbn import InvalidISBNError, validate_and_normalize_isbn
from apps.catalog.services import get_or_create_book
from apps.library.models import ReadingNote, ReadingStatus, UserBook

User = get_user_model()

DEMO_USERNAME = "demo"
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "DemoPassword123!"


def cover(isbn: str) -> str:
    return f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"


# (title, author, isbn13, pages, published_year, status, rating, progress_fraction)
DEMO_BOOKS = [
    # Fantasy
    ("Harry Potter and the Philosopher's Stone", "J.K. Rowling", "9780747532699", 223, 1997, "finished", 5, 1.0),
    ("The Hobbit", "J.R.R. Tolkien", "9780547928227", 310, 1937, "finished", 5, 1.0),
    ("The Lord of the Rings", "J.R.R. Tolkien", "9780544003415", 1178, 1954, "reading", 5, 0.45),
    ("A Game of Thrones", "George R.R. Martin", "9780553103540", 694, 1996, "reading", 4, 0.3),
    ("The Last Wish", "Andrzej Sapkowski", "9780575082441", 280, 1993, "finished", 4, 1.0),
    ("The Name of the Wind", "Patrick Rothfuss", "9780756404741", 662, 2007, "want_to_read", 5, 0.0),
    ("Mistborn: The Final Empire", "Brandon Sanderson", "9780765311788", 541, 2006, "paused", 4, 0.25),
    # Sci-fi
    ("Dune", "Frank Herbert", "9780441013593", 412, 1965, "finished", 5, 1.0),
    ("Foundation", "Isaac Asimov", "9780553293357", 244, 1951, "finished", 4, 1.0),
    ("Neuromancer", "William Gibson", "9780441569595", 271, 1984, "want_to_read", 4, 0.0),
    ("1984", "George Orwell", "9780451524935", 328, 1949, "finished", 5, 1.0),
    ("Brave New World", "Aldous Huxley", "9780060850524", 268, 1932, "want_to_read", 4, 0.0),
    ("The Martian", "Andy Weir", "9780553418026", 369, 2011, "reading", 5, 0.6),
    ("Ender's Game", "Orson Scott Card", "9780812550702", 324, 1985, "finished", 4, 1.0),
    # Classics
    ("Animal Farm", "George Orwell", "9780451526342", 112, 1945, "finished", 4, 1.0),
    ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", 180, 1925, "finished", 3, 1.0),
    ("To Kill a Mockingbird", "Harper Lee", "9780061120084", 324, 1960, "finished", 5, 1.0),
    ("Pride and Prejudice", "Jane Austen", "9780141439518", 480, 1813, "want_to_read", 4, 0.0),
    ("The Catcher in the Rye", "J.D. Salinger", "9780316769488", 277, 1951, "paused", 3, 0.4),
    ("Crime and Punishment", "Fyodor Dostoevsky", "9780140449136", 671, 1866, "want_to_read", 5, 0.0),
    # Programming
    ("Clean Code", "Robert C. Martin", "9780132350884", 464, 2008, "finished", 5, 1.0),
    ("The Pragmatic Programmer", "Andrew Hunt, David Thomas", "9780201616224", 352, 1999, "reading", 5, 0.5),
    ("Refactoring", "Martin Fowler", "9780201485677", 431, 1999, "want_to_read", 4, 0.0),
    ("Design Patterns", "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides", "9780201633610", 395, 1994, "paused", 4, 0.2),
    ("Effective TypeScript", "Dan Vanderkam", "9781492053743", 264, 2019, "reading", 5, 0.35),
    ("Designing Data-Intensive Applications", "Martin Kleppmann", "9781449373320", 616, 2017, "reading", 5, 0.55),
    ("You Don't Know JS: Up & Going", "Kyle Simpson", "9781491924464", 88, 2015, "finished", 4, 1.0),
    ("The Mythical Man-Month", "Frederick P. Brooks Jr.", "9780201835953", 322, 1975, "want_to_read", 4, 0.0),
    # Product / tech
    ("The Lean Startup", "Eric Ries", "9780307887894", 336, 2011, "finished", 4, 1.0),
    ("Inspired", "Marty Cagan", "9781119387503", 368, 2017, "want_to_read", 5, 0.0),
]

DEMO_NOTES = [
    ("9780547928227", "summary", "There and back again", "A burglar's unexpected journey with thirteen dwarves.", 50),
    ("9780132350884", "reflection", "Naming matters", "Reminded me how much clear naming improves a codebase.", 17),
    ("9780553418026", "note", "Science the heck out of it", "The potato-farming chapter is brilliant problem solving.", 120),
    ("9781449373320", "review", "Essential read", "The single best overview of modern data systems I have read.", 300),
]


class Command(BaseCommand):
    help = "Create a demo user with a curated library of popular books."

    def handle(self, *args, **options):
        # Validate every ISBN up front so we never persist a fake one.
        for entry in DEMO_BOOKS:
            try:
                validate_and_normalize_isbn(entry[2])
            except InvalidISBNError as exc:
                raise CommandError(
                    f"Invalid demo ISBN {entry[2]} ({entry[0]}): {exc}"
                ) from exc

        user, created = User.objects.get_or_create(
            username=DEMO_USERNAME, defaults={"email": DEMO_EMAIL}
        )
        user.email = DEMO_EMAIL
        user.set_password(DEMO_PASSWORD)
        user.save()
        self.stdout.write(
            self.style.SUCCESS(
                f"Demo user {'created' if created else 'updated'}: "
                f"{DEMO_USERNAME} / {DEMO_PASSWORD}"
            )
        )

        now = timezone.now()
        book_by_isbn = {}
        for (
            title,
            author,
            isbn,
            pages,
            year,
            status,
            rating,
            progress,
        ) in DEMO_BOOKS:
            normalized = validate_and_normalize_isbn(isbn)
            book, _ = get_or_create_book(
                isbn_normalized=normalized,
                defaults={
                    "title": title,
                    "author": author,
                    "isbn": isbn,
                    "pages": pages,
                    "cover_url": cover(normalized),
                    "published_year": year,
                    "description": "",
                },
            )
            book_by_isbn[normalized] = book

            current_page = pages if status == ReadingStatus.FINISHED else int(pages * progress)
            UserBook.objects.update_or_create(
                user=user,
                book=book,
                defaults={
                    "rating": rating,
                    "status": status,
                    "current_page": current_page,
                    "started_at": now if status != ReadingStatus.WANT_TO_READ else None,
                    "finished_at": now if status == ReadingStatus.FINISHED else None,
                },
            )

        note_count = 0
        for isbn, note_type, note_title, content, page in DEMO_NOTES:
            normalized = validate_and_normalize_isbn(isbn)
            book = book_by_isbn.get(normalized)
            if not book:
                continue
            user_book = UserBook.objects.get(user=user, book=book)
            _, made = ReadingNote.objects.get_or_create(
                user=user,
                user_book=user_book,
                title=note_title,
                defaults={
                    "content": content,
                    "note_type": note_type,
                    "page_number": page,
                },
            )
            note_count += int(made)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(DEMO_BOOKS)} books and {note_count} notes for demo user."
            )
        )
