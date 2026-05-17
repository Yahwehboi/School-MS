from rest_framework import serializers
from apps.accounts.serializers import UserSerializer, UserCreateSerializer
from apps.accounts.models import User
from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    """Full student profile — used in detail views."""
    user = UserSerializer(read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    current_class_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id", "user", "full_name", "student_id", "date_of_birth", "gender",
            "address", "state_of_origin", "blood_group",
            "guardian_name", "guardian_phone", "guardian_email", "guardian_relationship",
            "admission_date", "is_active", "current_class_name", "created_at",
        ]

    def get_current_class_name(self, obj):
        c = obj.current_class
        return str(c) if c else None


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight — used in list views (fast loading)."""
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    current_class_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ["id", "student_id", "full_name", "email", "gender", "is_active", "current_class_name"]

    def get_current_class_name(self, obj):
        c = obj.current_class
        return str(c) if c else None


class StudentCreateSerializer(serializers.Serializer):
    """
    Creates a User + Student profile in one request.
    Admin fills in one form, both records are created atomically.
    """
    # User fields
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    # Student profile fields
    student_id = serializers.CharField(max_length=20)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Student.Gender.choices, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    state_of_origin = serializers.CharField(max_length=50, required=False, allow_blank=True)
    admission_date = serializers.DateField(required=False, allow_null=True)
    guardian_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    guardian_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    guardian_email = serializers.EmailField(required=False, allow_blank=True)
    guardian_relationship = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_student_id(self, value):
        school = self.context["request"].school
        if Student.objects.filter(school=school, student_id=value).exists():
            raise serializers.ValidationError("This student ID is already in use at your school.")
        return value

    def create(self, validated_data):
        from django.db import transaction

        user_fields = ["email", "first_name", "last_name", "phone", "password"]
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        school = self.context["request"].school

        with transaction.atomic():
            user = User.objects.create_user(
                role=User.Role.STUDENT,
                school=school,
                **user_data,
            )
            student = Student.objects.create(
                user=user,
                school=school,
                **validated_data,
            )
        return student


class StudentUpdateSerializer(serializers.ModelSerializer):
    """Update student profile fields only (not the user account)."""
    class Meta:
        model = Student
        fields = [
            "date_of_birth", "gender", "address", "state_of_origin",
            "blood_group", "guardian_name", "guardian_phone",
            "guardian_email", "guardian_relationship",
        ]
