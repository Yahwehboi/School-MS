from django.contrib import admin
from .models import Result, GradeScale


@admin.register(GradeScale)
class GradeScaleAdmin(admin.ModelAdmin):
    list_display = ["school", "grade", "remark", "min_score", "max_score"]
    list_filter = ["school"]
    ordering = ["school", "-min_score"]


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ["__str__", "ca_score", "exam_score", "total", "grade", "position", "is_published"]
    list_filter = ["school", "term", "is_published", "grade"]
    search_fields = ["enrollment__student__user__last_name", "subject__name"]
    readonly_fields = ["total", "grade", "remark"]
    ordering = ["-created_at"]
