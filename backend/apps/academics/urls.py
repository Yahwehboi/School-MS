from django.urls import path
from .views import (
    SessionListCreateView, SessionDetailView,
    TermListCreateView, TermDetailView,
    ClassRoomListCreateView, ClassRoomDetailView,
    SubjectListCreateView, SubjectDetailView,
    EnrollmentListCreateView, EnrollmentDetailView,
)

urlpatterns = [
    path("sessions/", SessionListCreateView.as_view(), name="session-list"),
    path("sessions/<uuid:pk>/", SessionDetailView.as_view(), name="session-detail"),

    path("terms/", TermListCreateView.as_view(), name="term-list"),
    path("terms/<uuid:pk>/", TermDetailView.as_view(), name="term-detail"),

    path("classes/", ClassRoomListCreateView.as_view(), name="class-list"),
    path("classes/<uuid:pk>/", ClassRoomDetailView.as_view(), name="class-detail"),

    path("subjects/", SubjectListCreateView.as_view(), name="subject-list"),
    path("subjects/<uuid:pk>/", SubjectDetailView.as_view(), name="subject-detail"),

    path("enrollments/", EnrollmentListCreateView.as_view(), name="enrollment-list"),
    path("enrollments/<uuid:pk>/", EnrollmentDetailView.as_view(), name="enrollment-detail"),
]
