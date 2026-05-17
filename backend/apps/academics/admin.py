from django.contrib import admin
from .models import AcademicSession, Term, ClassRoom, Subject, Enrollment


@admin.register(AcademicSession)
class AcademicSessionAdmin(admin.ModelAdmin):
    list_display = ["name", "school", "is_current", "start_date", "end_date"]
    list_filter = ["school", "is_current"]


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ["name", "session", "school", "is_current", "start_date", "end_date"]
    list_filter = ["school", "is_current"]


@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ["name", "level", "arm", "school", "form_teacher", "capacity"]
    list_filter = ["school", "level"]
    search_fields = ["name"]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "class_room", "teacher", "school", "is_active"]
    list_filter = ["school", "is_active"]
    search_fields = ["name"]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["student", "class_room", "term", "school", "is_active"]
    list_filter = ["school", "term", "is_active"]
    search_fields = ["student__user__last_name"]