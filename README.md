# SchoolMS — School Management System

A modular, multi-tenant school management platform built with Django REST Framework + React.
Designed to be sold and deployed for multiple schools from a single codebase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Django 5 + Django REST Framework |
| Auth | JWT (SimpleJWT) — access + refresh tokens |
| Database | PostgreSQL 16 |
| PDF Generation | WeasyPrint (HTML → PDF) |
| Task Queue | Celery + Redis (Phase 4) |
| Frontend | React + Vite + Tailwind CSS |
| Deployment | Docker + Nginx + DigitalOcean/VPS |

---

## Project Structure

```
schoolms/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py       ← shared settings
│   │   │   ├── dev.py        ← development overrides
│   │   │   └── prod.py       ← production (security hardened)
│   │   ├── urls.py           ← root URL config
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── core/             ← School model, middleware, permissions, pagination
│   │   ├── accounts/         ← Custom User, JWT auth, role management
│   │   ├── students/         ← Student profiles, registration
│   │   ├── academics/        ← Sessions, terms, classes, subjects, enrollment
│   │   ├── results/          ← Score entry, grading, report cards, PDF
│   │   ├── attendance/       ← Daily marking, summaries
│   │   ├── finance/          ← Fee structures, payments, receipts, PDF
│   │   └── comms/            ← Announcements
│   ├── templates/
│   │   ├── results/report_card.html   ← PDF report card template
│   │   └── finance/receipt.html       ← PDF receipt template
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## Quick Start (Local Development)

### Option A — Docker (recommended)

```bash
# 1. Clone and enter project
git clone <repo> schoolms && cd schoolms

# 2. Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env — generate a SECRET_KEY:
#   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# 3. Start everything
docker compose up --build

# 4. In a new terminal — run migrations and seed demo data
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_school

# 5. API is live at http://localhost:8000
# 6. API docs at http://localhost:8000/api/docs/
```

### Option B — Manual (virtualenv)

```bash
cd backend

# Create and activate virtualenv
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env and configure DATABASE_URL to your local Postgres
cp .env.example .env

# Run migrations
python manage.py migrate

# Seed demo school
python manage.py seed_school

# Start dev server
python manage.py runserver
```

---

## API Endpoints Reference

### Authentication  `/api/auth/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/login/` | Login → returns JWT + user info | Public |
| POST | `/logout/` | Blacklist refresh token | Auth |
| POST | `/token/refresh/` | Get new access token | Auth |
| GET/PUT | `/me/` | Own profile | Auth |
| POST | `/change-password/` | Change own password | Auth |
| POST | `/set-parent-pin/` | Student sets 6-digit parent PIN | Student |
| POST | `/parent-login/` | Parent logs in with student email + PIN | Public |
| GET | `/users/` | List school users | Admin |
| POST | `/users/` | Create user account | Admin |
| GET/PUT/DELETE | `/users/<id>/` | Manage user | Admin |

### School Core  `/api/core/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/school-info/?subdomain=` | Get school info (for login page) | Public |

### Students  `/api/students/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/` | List all students | Admin/Teacher |
| POST | `/` | Create student + user account | Admin |
| GET | `/me/` | Own student profile | Student |
| GET/PUT | `/<id>/` | Student detail | Admin |
| DELETE | `/<id>/` | Deactivate student | Admin |

### Academics  `/api/academics/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET/POST | `/sessions/` | Academic sessions | Admin/Auth |
| GET/POST | `/terms/` | Terms | Admin/Auth |
| GET/POST | `/classes/` | Classrooms | Admin/Teacher |
| GET/POST | `/subjects/` | Subjects | Admin/Teacher |
| GET/POST | `/enrollments/` | Enroll students in classes | Admin |

### Results  `/api/results/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET/POST | `/grade-scale/` | View/set grading bands | Admin |
| POST | `/grade-scale/setup-default/` | Seed Nigerian grading scale | Admin |
| GET/POST | `/` | List/enter results | Admin/Teacher |
| POST | `/bulk-entry/` | Enter all scores for a subject | Admin/Teacher |
| POST | `/compute-positions/` | Rank students in class | Admin |
| POST | `/publish/` | Make results visible to students | Admin |
| GET | `/report-card/` | JSON report card | Auth |
| GET | `/report-card/pdf/` | PDF report card download | Auth |

### Attendance  `/api/attendance/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET/POST | `/` | List/create attendance records | Admin/Teacher |
| POST | `/bulk-mark/` | Mark entire class attendance | Admin/Teacher |
| GET | `/summary/` | Attendance stats per student/term | Auth |
| GET | `/me/` | Own attendance (student) | Student |

### Finance  `/api/finance/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET/POST | `/fee-structures/` | Set up fees per class/term | Admin |
| GET/POST | `/payments/` | Record payments | Admin/Teacher |
| GET | `/student-status/` | Full fee breakdown for student | Auth |
| GET | `/receipt/<no>/` | Payment receipt JSON | Admin/Teacher |
| GET | `/receipt/<no>/pdf/` | PDF receipt download | Admin/Teacher |

### Communications  `/api/comms/`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/announcements/` | List (filtered by role) | Auth |
| POST | `/announcements/` | Create announcement | Admin/Teacher |
| GET/PUT/DELETE | `/announcements/<id>/` | Manage | Admin/Teacher |

---

## Multi-School (SaaS) Architecture

Every request is identified as belonging to a school via:
1. `X-School-Subdomain` header (set by the React frontend)
2. Subdomain parsing from the `Host` header (e.g. `greenfield.schoolms.app`)

The `SchoolContextMiddleware` resolves `request.school` automatically.
All querysets are filtered to `school=request.school` — data is fully isolated between schools.

### Adding a New School

```bash
python manage.py seed_school --subdomain cityacademy --name "City Academy"
```

Or via the Django admin at `/admin/`.

---

## Authentication Flow

```
1. Frontend sends POST /api/auth/login/ with email + password
   → Returns: { access, refresh, user: { id, role, school_id, ... } }

2. Frontend stores tokens in memory (access) + httpOnly cookie (refresh)

3. Every API request includes: Authorization: Bearer <access_token>

4. Frontend sends X-School-Subdomain: <subdomain> header on every request

5. Access token expires after 8h → use POST /api/auth/token/refresh/

6. Logout: POST /api/auth/logout/ with refresh token → blacklisted
```

### Parent Access (No Separate Account)

```
1. Student sets PIN: POST /api/auth/set-parent-pin/ { "pin": "123456" }

2. Parent logs in: POST /api/auth/parent-login/
   { "student_email": "...", "pin": "123456" }
   → Returns a JWT tagged with parent_view: true

3. Parent can view results and attendance — read-only
```

---

## PDF Generation

Report cards and receipts are generated server-side using WeasyPrint.
Templates are HTML files in `backend/templates/`.

**Customizing per school:**
- Edit `templates/results/report_card.html` for report card layout
- Edit `templates/finance/receipt.html` for receipt layout
- Both templates receive school name, logo, and address automatically
- The `School.settings` JSON field can store custom colors/watermarks

---

## Grading System

Default: Percentage + Letter (A/B/C/D/E/F)

```
A  →  70–100  →  Excellent
B  →  60–69   →  Very Good
C  →  50–59   →  Good
D  →  45–49   →  Pass
E  →  40–44   →  Below Average
F  →   0–39   →  Fail
```

CA score: 0–40 | Exam score: 0–60 | Total: 0–100

Schools can customise via `POST /api/results/grade-scale/` (admin only).

---

## Build Phases

| Phase | Status | What's included |
|---|---|---|
| Phase 1 — Foundation | ✅ Done | Auth, users, students, classes, subjects, enrollment |
| Phase 2 — Academic Core | ✅ Done | Results, grading, positions, report cards, PDF |
| Phase 3 — Operations | ✅ Done | Attendance, finance, payments, receipts, announcements |
| Phase 4 — Scale | 🔜 Next | Celery tasks, SMS (Africa's Talking), Paystack, email notifications |

---

## Security Checklist

- [x] Passwords hashed with PBKDF2 (bcrypt available as drop-in)
- [x] JWT with refresh token blacklisting on logout
- [x] Role-based access control on every endpoint
- [x] School-scoped querysets (cross-school data leakage impossible)
- [x] Input validation via DRF serializers
- [x] Soft deletes (no hard data loss)
- [x] Non-root Docker user
- [x] Production: HSTS, secure cookies, SSL redirect

---

## Customizing for a New School Client

1. Create school: `python manage.py seed_school --subdomain <slug> --name "<Name>"`
2. Upload logo via Django admin
3. Adjust `School.settings` JSON for colors and report card layout
4. Set up fee structures via API or admin
5. Configure SMTP email in `.env`
6. Point subdomain DNS to server

---

## Environment Variables

See `backend/.env.example` for the full list.
Key variables: `SECRET_KEY`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, email settings.
