from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.library.views import (
    DashboardView,
    LibraryViewSet,
    ReadingNoteDetailView,
    ReadingNoteListCreateView,
)

router = DefaultRouter()
router.register("library", LibraryViewSet, basename="library")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path(
        "library/<int:user_book_id>/notes/",
        ReadingNoteListCreateView.as_view(),
        name="userbook-notes",
    ),
    path("notes/<int:pk>/", ReadingNoteDetailView.as_view(), name="note-detail"),
    *router.urls,
]
