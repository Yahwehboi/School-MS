from rest_framework import serializers
from .models import FeeStructure, Payment


class FeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source="class_room.name", read_only=True)
    term_name = serializers.CharField(source="term.__str__", read_only=True)
    fee_type_display = serializers.CharField(source="get_fee_type_display", read_only=True)

    class Meta:
        model = FeeStructure
        fields = [
            "id", "class_room", "class_name", "term", "term_name",
            "fee_type", "fee_type_display", "amount", "description", "is_mandatory",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        validated_data["school"] = self.context["request"].school
        return super().create(validated_data)


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_no = serializers.CharField(source="student.student_id", read_only=True)
    term_name = serializers.CharField(source="term.__str__", read_only=True)
    fee_type_display = serializers.CharField(source="get_fee_type_display", read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id", "student", "student_name", "student_id_no",
            "fee_structure", "term", "term_name",
            "fee_type", "fee_type_display",
            "amount_expected", "amount_paid", "balance", "is_fully_paid",
            "receipt_number", "payment_method", "payment_status",
            "payment_date", "transaction_reference", "note",
            "recorded_by", "recorded_by_name", "created_at",
        ]
        read_only_fields = ["id", "receipt_number", "balance", "recorded_by", "created_at"]

    def create(self, validated_data):
        validated_data["school"] = self.context["request"].school
        validated_data["recorded_by"] = self.context["request"].user
        return super().create(validated_data)


class StudentFeeStatusSerializer(serializers.Serializer):
    """
    Full fee position for one student in one term:
    what they owe, what they've paid, what's outstanding.
    """
    student_id = serializers.UUIDField()
    student_name = serializers.CharField()
    student_id_no = serializers.CharField()
    term_name = serializers.CharField()
    fees = serializers.ListField(child=serializers.DictField())
    total_expected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    is_cleared = serializers.BooleanField()
