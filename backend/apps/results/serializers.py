from rest_framework import serializers
from .models import Result, GradeScale


class GradeScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeScale
        fields = ["id", "grade", "remark", "min_score", "max_score"]
        read_only_fields = ["id"]


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="enrollment.student.full_name", read_only=True)
    student_id_no = serializers.CharField(source="enrollment.student.student_id", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    class_name = serializers.CharField(source="enrollment.class_room.name", read_only=True)
    term_name = serializers.CharField(source="term.__str__", read_only=True)
    entered_by_name = serializers.CharField(source="entered_by.get_full_name", read_only=True)

    class Meta:
        model = Result
        fields = [
            "id", "enrollment", "subject", "subject_name", "term", "term_name",
            "student_name", "student_id_no", "class_name",
            "ca_score", "exam_score", "total", "grade", "remark",
            "position", "is_published", "entered_by_name", "created_at",
        ]
        read_only_fields = ["id", "total", "grade", "remark", "position", "created_at"]

    def validate_ca_score(self, value):
        if value is not None and not (0 <= value <= 40):
            raise serializers.ValidationError("CA score must be between 0 and 40.")
        return value

    def validate_exam_score(self, value):
        if value is not None and not (0 <= value <= 60):
            raise serializers.ValidationError("Exam score must be between 0 and 60.")
        return value

    def create(self, validated_data):
        validated_data["school"] = self.context["request"].school
        validated_data["entered_by"] = self.context["request"].user
        return super().create(validated_data)


class BulkResultSerializer(serializers.Serializer):
    """
    For entering results for all students in a class at once.
    Frontend sends a list of {enrollment_id, ca_score, exam_score}.
    """
    class ResultEntry(serializers.Serializer):
        enrollment_id = serializers.UUIDField()
        ca_score = serializers.FloatField(required=False, allow_null=True)
        exam_score = serializers.FloatField(required=False, allow_null=True)

    subject_id = serializers.UUIDField()
    term_id = serializers.UUIDField()
    entries = ResultEntry(many=True)


class ReportCardSerializer(serializers.Serializer):
    """
    Full report card for one student — one term.
    Aggregates all subject results + summary stats.
    """
    student_name = serializers.CharField()
    student_id_no = serializers.CharField()
    class_name = serializers.CharField()
    term_name = serializers.CharField()
    session_name = serializers.CharField()
    results = ResultSerializer(many=True)
    total_score = serializers.FloatField()
    average = serializers.FloatField()
    overall_position = serializers.IntegerField(allow_null=True)
    total_students = serializers.IntegerField()
    next_term_begins = serializers.DateField(allow_null=True)
    school_name = serializers.CharField()
    school_address = serializers.CharField()
