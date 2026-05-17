from django.urls import path
from .views import (
    AttendanceListCreateView,
    AttendanceDetailView,
    BulkAttendanceView,
    AttendanceSummaryView,
    MyAttendanceView,
)

urlpatterns = [
    path("", AttendanceListCreateView.as_view(), name="attendance-list"),
    path("<uuid:pk>/", AttendanceDetailView.as_view(), name="attendance-detail"),
    path("bulk-mark/", BulkAttendanceView.as_view(), name="bulk-attendance"),
    path("summary/", AttendanceSummaryView.as_view(), name="attendance-summary"),
    path("me/", MyAttendanceView.as_view(), name="my-attendance"),
]
