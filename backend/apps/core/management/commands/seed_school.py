"""
Management command: seed_school

Creates a fully-configured demo school with:
  - School record
  - Admin + teacher + student accounts
  - Classes, subjects, terms
  - Grade scale
  - Sample results and attendance

Usage:
  python manage.py seed_school
  python manage.py seed_school --subdomain testschool --name "Test Academy"
"""
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Seeds a demo school with realistic data for development and testing."

    def add_arguments(self, parser):
        parser.add_argument("--subdomain", default="demo", help="School subdomain slug")
        parser.add_argument("--name", default="Greenfield Academy", help="School name")

    def handle(self, *args, **options):
        subdomain = options["subdomain"]
        name = options["name"]

        self.stdout.write(self.style.MIGRATE_HEADING(f"\n🏫 Seeding school: {name} ({subdomain})\n"))

        with transaction.atomic():
            school = self._create_school(name, subdomain)
            admin = self._create_admin(school)
            teachers = self._create_teachers(school)
            session, term = self._create_academic_structure(school)
            classes = self._create_classes(school, teachers)
            self._create_grade_scale(school)
            students = self._create_students(school, classes, term)
            self._create_results(school, students, term)
            self._create_attendance(school, students, term)
            self._create_announcements(school, admin)

        self.stdout.write(self.style.SUCCESS("\n✅ Seed complete!\n"))
        self.stdout.write(f"   School:   {name}")
        self.stdout.write(f"   Subdomain: {subdomain}")
        self.stdout.write(f"   Admin:    admin@{subdomain}.schoolms.app  / Password: Admin@1234")
        self.stdout.write(f"   Teacher:  teacher1@{subdomain}.schoolms.app / Password: Teacher@1234")
        self.stdout.write(f"   Student:  student1@{subdomain}.schoolms.app / Password: Student@1234\n")

    # ------------------------------------------------------------------

    def _create_school(self, name, subdomain):
        from apps.core.models import School
        school, created = School.objects.get_or_create(
            subdomain=subdomain,
            defaults={
                "name": name,
                "address": "12 Education Avenue, Victoria Island, Lagos",
                "phone": "+234 801 234 5678",
                "email": f"info@{subdomain}.schoolms.app",
            }
        )
        status = "Created" if created else "Already exists"
        self.stdout.write(f"  School — {status}: {school.name}")
        return school

    def _create_admin(self, school):
        from apps.accounts.models import User
        admin, created = User.objects.get_or_create(
            email=f"admin@{school.subdomain}.schoolms.app",
            defaults={
                "first_name": "School", "last_name": "Admin",
                "role": "admin", "school": school, "is_active": True,
            }
        )
        if created:
            admin.set_password("Admin@1234")
            admin.save()
        self.stdout.write(f"  Admin — {'Created' if created else 'Exists'}: {admin.email}")
        return admin

    def _create_teachers(self, school):
        from apps.accounts.models import User
        teachers_data = [
            ("Amara", "Okafor", "Mathematics"),
            ("Chibuike", "Eze", "English Language"),
            ("Ngozi", "Adeyemi", "Basic Science"),
            ("Emeka", "Nwosu", "Social Studies"),
        ]
        teachers = []
        for i, (first, last, subject) in enumerate(teachers_data, 1):
            email = f"teacher{i}@{school.subdomain}.schoolms.app"
            teacher, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first, "last_name": last,
                    "role": "teacher", "school": school, "is_active": True,
                }
            )
            if created:
                teacher.set_password("Teacher@1234")
                teacher.save()
            teachers.append(teacher)
        self.stdout.write(f"  Teachers — {len(teachers)} ready")
        return teachers

    def _create_academic_structure(self, school):
        from apps.academics.models import AcademicSession, Term
        session, _ = AcademicSession.objects.get_or_create(
            school=school, name="2024/2025",
            defaults={"start_date": date(2024, 9, 9), "end_date": date(2025, 7, 25), "is_current": True}
        )
        term, _ = Term.objects.get_or_create(
            school=school, session=session, name="first",
            defaults={
                "start_date": date(2024, 9, 9),
                "end_date": date(2024, 12, 13),
                "is_current": True,
                "next_term_begins": date(2025, 1, 13),
            }
        )
        self.stdout.write(f"  Session: {session.name} | Term: {term.get_name_display()}")
        return session, term

    def _create_classes(self, school, teachers):
        from apps.academics.models import ClassRoom, Subject
        classes_data = [
    ("JSS1", "JSS1", ""),
    ("JSS2", "JSS2", ""),
    ("JSS3", "JSS3", ""),
    ("SS1",  "SS1",  ""),
    ("SS2",  "SS2",  ""),
    ("SS3",  "SS3",  ""),
]
        subject_names = ["Mathematics", "English Language", "Basic Science", "Social Studies", "Civic Education", "Agricultural Science", "Computer Studies"]
        classes = []
        for name, level, arm in classes_data:
            classroom, _ = ClassRoom.objects.get_or_create(
                school=school, name=name,
                defaults={"level": level, "arm": arm, "form_teacher": teachers[0], "capacity": 40}
            )
            classes.append(classroom)
            for i, subject_name in enumerate(subject_names):
                Subject.objects.get_or_create(
                    school=school, class_room=classroom, name=subject_name,
                    defaults={"code": subject_name[:4].upper(), "teacher": teachers[i % len(teachers)]}
                )
        self.stdout.write(f"  Classes: {len(classes)} created with {len(subject_names)} subjects each")
        return classes

    def _create_grade_scale(self, school):
        from apps.results.models import GradeScale, get_default_grade_scale
        count = 0
        for entry in get_default_grade_scale():
            _, created = GradeScale.objects.get_or_create(
                school=school, grade=entry["grade"],
                defaults={"remark": entry["remark"], "min_score": entry["min_score"], "max_score": entry["max_score"]}
            )
            if created:
                count += 1
        self.stdout.write(f"  Grade scale — {count} grades configured")

    def _create_students(self, school, classes, term):
        from apps.accounts.models import User
        from apps.students.models import Student
        from apps.academics.models import Enrollment

        first_names = ["Chidi", "Adaeze", "Emeka", "Ngozi", "Obinna", "Chioma", "Uche", "Amara", "Kelechi", "Ifunanya"]
        last_names = ["Okonkwo", "Nwosu", "Adeyemi", "Balogun", "Eze", "Obi", "Chukwu", "Nwachukwu", "Madu", "Okafor"]

        students = []
        count = 0
        for i, classroom in enumerate(classes):
            for j in range(8):  # 8 students per class
                idx = (i * 8 + j) % 10
                email = f"student{i*8+j+1}@{school.subdomain}.schoolms.app"
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "first_name": first_names[idx],
                        "last_name": last_names[(idx + j) % 10],
                        "role": "student", "school": school,
                    }
                )
                if created:
                    user.set_password("Student@1234")
                    user.save()

                student_id = f"GFS/{classroom.level}/{str(j+1).zfill(3)}"
                student, _ = Student.objects.get_or_create(
                    school=school, user=user,
                    defaults={
                        "student_id": f"{student_id}-{i}",
                        "gender": "M" if j % 2 == 0 else "F",
                        "admission_date": date(2024, 9, 9),
                        "guardian_name": f"Mr/Mrs {last_names[(idx+j) % 10]}",
                        "guardian_phone": f"+234 80{random.randint(1000000, 9999999)}",
                    }
                )
                Enrollment.objects.get_or_create(
                    school=school, student=student, term=term,
                    defaults={"class_room": classroom, "is_active": True}
                )
                students.append(student)
                count += 1

        self.stdout.write(f"  Students — {count} created across {len(classes)} classes")
        return students

    def _create_results(self, school, students, term):
        from apps.academics.models import Enrollment, Subject
        from apps.results.models import Result

        count = 0
        for student in students:
            enrollment = student.enrollments.filter(term=term).first()
            if not enrollment:
                continue
            subjects = enrollment.class_room.subjects.filter(school=school, is_active=True)
            for subject in subjects:
                ca = round(random.uniform(18, 38), 1)
                exam = round(random.uniform(28, 58), 1)
                Result.objects.get_or_create(
                    school=school, enrollment=enrollment, subject=subject, term=term,
                    defaults={
                        "ca_score": ca,
                        "exam_score": exam,
                        "is_published": True,
                    }
                )
                count += 1

        # Compute positions after bulk insert
        from apps.academics.models import ClassRoom
        for classroom in ClassRoom.objects.filter(school=school):
            Result.compute_positions(school, term, classroom)

        self.stdout.write(f"  Results — {count} entries created and positions computed")

    def _create_attendance(self, school, students, term):
        from apps.attendance.models import Attendance, AttendanceSummary
        from apps.accounts.models import User

        admin = User.objects.filter(school=school, role="admin").first()
        count = 0
        # Mark 10 school days
        start = date(2024, 9, 9)
        school_days = [start + timedelta(days=i) for i in range(14) if (start + timedelta(days=i)).weekday() < 5][:10]

        for student in students:
            enrollment = student.enrollments.first()
            if not enrollment:
                continue
            for day in school_days:
                status = random.choices(
                    ["present", "present", "present", "absent", "late"],
                    weights=[70, 70, 70, 10, 5]
                )[0]
                Attendance.objects.get_or_create(
                    school=school, student=student, date=day,
                    defaults={
                        "class_room": enrollment.class_room,
                        "term": term,
                        "status": status,
                        "marked_by": admin,
                    }
                )
                count += 1
            AttendanceSummary.recompute(school, student, term)

        self.stdout.write(f"  Attendance — {count} records across {len(school_days)} school days")

    def _create_announcements(self, school, admin):
        from apps.comms.models import Announcement
        announcements = [
            ("Welcome Back!", "Welcome to the 2024/2025 academic session. We wish all students a productive term.", "all", True),
            ("Staff Meeting", "All teaching staff are reminded of the meeting scheduled for Friday 3pm in the conference room.", "teachers", False),
            ("First Term Exam Timetable", "The first term examination timetable has been released. Students should check the notice board.", "students", False),
        ]
        for title, body, audience, pinned in announcements:
            Announcement.objects.get_or_create(
                school=school, title=title,
                defaults={"body": body, "audience": audience, "is_pinned": pinned, "author": admin}
            )
        self.stdout.write(f"  Announcements — {len(announcements)} created")
