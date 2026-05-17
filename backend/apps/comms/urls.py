from django.urls import path
from .views import AnnouncementListCreateView, AnnouncementDetailView

urlpatterns = [
    path("announcements/", AnnouncementListCreateView.as_view(), name="announcement-list"),
    path("announcements/<uuid:pk>/", AnnouncementDetailView.as_view(), name="announcement-detail"),
]
