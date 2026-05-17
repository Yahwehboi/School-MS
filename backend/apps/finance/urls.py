from django.urls import path
from .views import (
    FeeStructureListCreateView,
    FeeStructureDetailView,
    PaymentListCreateView,
    PaymentDetailView,
    StudentFeeStatusView,
    ReceiptView,
    ReceiptPDFView,
)

urlpatterns = [
    path("fee-structures/", FeeStructureListCreateView.as_view(), name="fee-structure-list"),
    path("fee-structures/<uuid:pk>/", FeeStructureDetailView.as_view(), name="fee-structure-detail"),

    path("payments/", PaymentListCreateView.as_view(), name="payment-list"),
    path("payments/<uuid:pk>/", PaymentDetailView.as_view(), name="payment-detail"),

    path("student-status/", StudentFeeStatusView.as_view(), name="student-fee-status"),

    path("receipt/<str:receipt_number>/", ReceiptView.as_view(), name="receipt-detail"),
    path("receipt/<str:receipt_number>/pdf/", ReceiptPDFView.as_view(), name="receipt-pdf"),
]
