from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    """Enable the pg_trgm extension used by the trigram GIN indexes.

    Must run before any migration that creates a `gin_trgm_ops` index.
    """

    initial = True

    dependencies = []

    operations = [
        TrigramExtension(),
    ]
