from django.urls import path
from .views import SchoolInfoView

urlpatterns = [
    path("school-info/", SchoolInfoView.as_view(), name="school-info"),
]
