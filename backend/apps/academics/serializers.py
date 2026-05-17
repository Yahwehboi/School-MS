from rest_framework import serializers
from .models import AcademicSession, Term, ClassRoom, Subject, Enrollment


class AcademicSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicSession
        fields = ["id", "name", "start_date", "end_date", "is_current", "created_at"]
        read_only_fields = ["id", "created_at"]


class TermSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source="session.name", read_only=True)

    class Meta:
        model = Term
        fields = ["id", "session", "session_name", "name", "start_date",
                  "end_date", "is_current", "next_term_begins"]
        read_only_fields = ["id"]


class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)

    class Meta:
        model = Subject
        fields = ["id", "name", "code", "class_room", "teacher", "teacher_name", "is_active"]
        read_only_fields = ["id"]


class ClassRoomSerializer(serializers.ModelSerializer):
    form_teacher_name = serializers.CharField(source="form_teacher.get_full_name", read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassRoom
        fields = ["id", "name", "level", "arm", "form_teacher", "form_teacher_name",
                  "capacity", "student_count", "subjects"]
        read_only_fields = ["id"]

    def get_student_count(self, obj):
        return obj.enrollments.filter(is_active=True).count()


class ClassRoomListSerializer(serializers.ModelSerializer):
    """Lightweight — no nested subjects for list views."""
    form_teacher_name = serializers.CharField(source="form_teacher.get_full_name", read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassRoom
        fields = ["id", "name", "level", "arm", "form_teacher_name", "capacity", "student_count"]

    def get_student_count(self, obj):
        return obj.enrollments.filter(is_active=True).count()


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_no = serializers.CharField(source="student.student_id", read_only=True)
    class_name = serializers.CharField(source="class_room.name", read_only=True)
    term_name = serializers.CharField(source="term.__str__", read_only=True)

    class Meta:
        model = Enrollment
        fields = ["id", "student", "student_name", "student_id_no",
                  "class_room", "class_name", "term", "term_name", "is_active", "enrolled_at"]
        read_only_fields = ["id", "enrolled_at"]

    def validate(self, attrs):
        school = self.context["request"].school
        # Prevent duplicate enrollment in same term
        student = attrs.get("student")
        term = attrs.get("term")
        if student and term:
            existing = Enrollment.objects.filter(school=school, student=student, term=term)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    f"{student.full_name} is already enrolled for {term}."
                )
        return attrs

    def create(self, validated_data):
        validated_data["school"] = self.context["request"].school
        return super().create(validated_data)
