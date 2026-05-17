from rest_framework import serializers
from .models import Attendance, AttendanceSummary


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_no = serializers.CharField(source="student.student_id", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.get_full_name", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id", "student", "student_name", "student_id_no",
            "class_room", "term", "date", "status", "note",
            "marked_by", "marked_by_name", "created_at",
        ]
        read_only_fields = ["id", "marked_by", "created_at"]

    def create(self, validated_data):
        validated_data["school"] = self.context["request"].school
        validated_data["marked_by"] = self.context["request"].user
        instance = super().create(validated_data)
        # Keep summary fresh
        AttendanceSummary.recompute(instance.school, instance.student, instance.term)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        AttendanceSummary.recompute(instance.school, instance.student, instance.term)
        return instance


class BulkAttendanceSerializer(serializers.Serializer):
    """
    Mark attendance for an entire class in one request.
    Teacher submits: { class_room_id, term_id, date, entries: [{student_id, status, note}] }
    """
    class Entry(serializers.Serializer):
        student_id = serializers.UUIDField()
        status = serializers.ChoiceField(choices=Attendance.Status.choices)
        note = serializers.CharField(required=False, allow_blank=True, default="")

    class_room_id = serializers.UUIDField()
    term_id = serializers.UUIDField()
    date = serializers.DateField()
    entries = Entry(many=True)


class AttendanceSummarySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_no = serializers.CharField(source="student.student_id", read_only=True)
    term_name = serializers.CharField(source="term.__str__", read_only=True)

    class Meta:
        model = AttendanceSummary
        fields = [
            "id", "student", "student_name", "student_id_no", "term", "term_name",
            "total_days", "days_present", "days_absent", "days_late", "days_excused",
            "attendance_percentage", "updated_at",
        ]
