from django.urls import path

from apps.catalog.views import ISBNLookupView

urlpatterns = [
    path("books/lookup-isbn/", ISBNLookupView.as_view(), name="isbn-lookup"),
]
