from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends JWT login to include user info in the token response.
    Frontend gets role, name, and school in one call — no extra request needed.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Reject inactive users clearly
        if not user.is_active:
            raise serializers.ValidationError("Your account has been deactivated. Contact your school admin.")

        data["user"] = {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.get_full_name(),
            "role": user.role,
            "school_id": str(user.school_id) if user.school_id else None,
            "profile_photo": user.profile_photo.url if user.profile_photo else None,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    """Read-only user representation — used in nested serializers."""
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name",
                  "phone", "role", "profile_photo", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Used by admins to create teacher/student accounts.
    Password is auto-set and must be changed on first login (handled frontend side).
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "role", "password", "confirm_password"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request:
            validated_data["school"] = request.school or request.user.school
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Used by a user to update their own profile."""
    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "profile_photo"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class SetParentPinSerializer(serializers.Serializer):
    """
    Student sets a 6-digit PIN that a parent can use on the same login page
    to access a read-only view of results and attendance.
    """
    pin = serializers.CharField(min_length=6, max_length=6)

    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("PIN must be 6 digits.")
        return value

    def save(self):
        user = self.context["request"].user
        user.parent_pin = self.validated_data["pin"]
        user.save(update_fields=["parent_pin"])
        return user


class ParentPinLoginSerializer(serializers.Serializer):
    """
    Parent enters: student ID (email) + parent PIN.
    Returns a read-only token scoped to viewing that student's data.
    """
    student_email = serializers.EmailField()
    pin = serializers.CharField(min_length=6, max_length=6)

    def validate(self, attrs):
        try:
            student = User.objects.get(email=attrs["student_email"], role="student", is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("Student not found.")

        if not student.parent_pin or student.parent_pin != attrs["pin"]:
            raise serializers.ValidationError("Invalid PIN.")

        attrs["student"] = student
        return attrs
