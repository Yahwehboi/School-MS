from django.urls import path
from .views import (
    GradeScaleListCreateView,
    SetupDefaultGradeScaleView,
    ResultListCreateView,
    ResultDetailView,
    BulkResultEntryView,
    ComputePositionsView,
    PublishResultsView,
    ReportCardView,
    ReportCardPDFView,
)

urlpatterns = [
    # Grade scale setup
    path("grade-scale/", GradeScaleListCreateView.as_view(), name="grade-scale-list"),
    path("grade-scale/setup-default/", SetupDefaultGradeScaleView.as_view(), name="grade-scale-default"),

    # Individual result CRUD
    path("", ResultListCreateView.as_view(), name="result-list"),
    path("<uuid:pk>/", ResultDetailView.as_view(), name="result-detail"),

    # Bulk entry (teacher workflow)
    path("bulk-entry/", BulkResultEntryView.as_view(), name="bulk-result-entry"),

    # Admin actions
    path("compute-positions/", ComputePositionsView.as_view(), name="compute-positions"),
    path("publish/", PublishResultsView.as_view(), name="publish-results"),

    # Report card
    path("report-card/", ReportCardView.as_view(), name="report-card"),
    path("report-card/pdf/", ReportCardPDFView.as_view(), name="report-card-pdf"),
]
