# 🏫 School Management Website with Student Result Portal

> A full-stack web application built for a private secondary school — replacing manual, WhatsApp-based processes with a live, accessible online platform.

---

## 🔍 Problem Statement

A private secondary school was managing student results and parent communication entirely through WhatsApp messages and printed sheets. Parents had no reliable way to check results. Staff spent hours distributing result slips. There was no central record system, and data was frequently lost or inconsistent.

This project replaced that entire workflow with a structured, digital solution.

---

## 🎯 Project Objectives

- Build a professional school website with key information for parents and prospective students
- Develop a secure student result-checking portal accessible from any device
- Create a backend database to store, manage, and retrieve student records reliably
- Reduce administrative workload for school staff

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Python (Flask) |
| Database | MySQL |
| Styling | Custom CSS + Responsive Design |
| Version Control | Git / GitHub |

---

## ✨ Features

- **Responsive school website** — works on mobile, tablet, and desktop
- **Student result portal** — students/parents enter a unique ID to retrieve results
- **Admin interface** — school staff can upload and update result records
- **MySQL database** — normalised schema for students, subjects, terms, and scores
- **Form validation** — frontend and backend input validation for data integrity
- **Secure login** — basic authentication for admin access

---

## 🗄️ Database Schema (Simplified)

```
students
├── student_id (PK)
├── full_name
├── class
└── term

subjects
├── subject_id (PK)
└── subject_name

results
├── result_id (PK)
├── student_id (FK → students)
├── subject_id (FK → subjects)
├── score
├── grade
└── term
```

---

## 🔄 Development Process

### Phase 1 — Requirements Gathering
- Met with school management to document their result distribution workflow
- Identified pain points: delayed distribution, lost records, no parent access

### Phase 2 — Design
- Wireframed the school website layout
- Designed the result portal user flow (ID input → result display)
- Created ER diagram for the database schema

### Phase 3 — Development
- Built responsive frontend with HTML/CSS/JS
- Developed Flask backend with route handling and form processing
- Set up MySQL database and wrote queries for result retrieval
- Connected frontend forms to backend endpoints

### Phase 4 — Data Migration
- Imported existing student records from spreadsheets into the database
- Cleaned and standardised name formatting and class labels

### Phase 5 — Deployment & Handover
- Deployed the application
- Trained staff on uploading and managing results
- Documented the admin workflow

---

## 📈 Results & Impact

| Metric | Outcome |
|---|---|
| Result processing time | ⬇️ 60% reduction |
| Website visits (first month) | 500+ |
| Parent adoption of portal | 80% within weeks of launch |
| Staff time spent on result distribution | Significantly reduced |

---

## 🚀 How to Run Locally

```bash
# Clone the repository
git clone https://github.com/Yahwehboi/school-management-website.git

# Navigate to project folder
cd school-management-website

# Install dependencies
pip install flask mysql-connector-python

# Set up your MySQL database
# Import the provided schema.sql file into your MySQL instance

# Run the app
python app.py
```

Then open `http://localhost:5000` in your browser.

---
screenshots/School MS.png
---

## 🔮 Future Improvements

- Add SMS notification when new results are uploaded
- Introduce fee payment tracking module
- Build a parent dashboard with term-on-term result comparison
- Add timetable and school calendar sections

---

## 👤 Author

**Agboola Anuoluwapo David**
Data Analyst | Web Developer | CS Graduate

- 🌐 Portfolio: [yahwehboi.github.io](https://yahwehboi.github.io)
- 💼 LinkedIn: [linkedin.com/in/anuoluwapo-agboola-b11000195](https://linkedin.com/in/anuoluwapo-agboola-b11000195)
- 📧 agboolaanouluwapo@gmail.com

---

## 📄 License

MIT License — free to use for educational and portfolio purposes.
