import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import AdminLayout   from "./components/layout/AdminLayout";
import TeacherLayout from "./components/layout/TeacherLayout";
import StudentLayout from "./components/layout/StudentLayout";

// Auth
import LoginPage from "./pages/LoginPage";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import StudentsPage   from "./pages/admin/StudentsPage";
import ResultsPage    from "./pages/admin/ResultsPage";
import { AttendancePage, AcademicsPage, FinancePage, CommsPage, StaffPage } from "./pages/admin/OtherPages";

// Teacher pages
import TeacherDashboard  from "./pages/teacher/Dashboard";
import TeacherResults    from "./pages/teacher/Results";
import TeacherAttendance from "./pages/teacher/Attendance";
import { CommsPage as TeacherComms } from "./pages/admin/OtherPages";

// Student pages
import { StudentDashboard, StudentResults, StudentAttendance } from "./pages/student/Pages";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontFamily: "Plus Jakarta Sans, sans-serif",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#2563eb", secondary: "white" } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/"      element={<Navigate to="/login" replace />} />

          {/* ── Admin ── */}
          <Route path="/admin" element={
            <ProtectedRoute roles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index                element={<AdminDashboard />} />
            <Route path="students"      element={<StudentsPage />} />
            <Route path="staff"         element={<StaffPage />} />
            <Route path="academics"     element={<AcademicsPage />} />
            <Route path="results"       element={<ResultsPage />} />
            <Route path="attendance"    element={<AttendancePage />} />
            <Route path="finance"       element={<FinancePage />} />
            <Route path="comms"         element={<CommsPage />} />
          </Route>

          {/* ── Teacher ── */}
          <Route path="/teacher" element={
            <ProtectedRoute roles={["teacher"]}>
              <TeacherLayout />
            </ProtectedRoute>
          }>
            <Route index             element={<TeacherDashboard />} />
            <Route path="results"    element={<TeacherResults />} />
            <Route path="attendance" element={<TeacherAttendance />} />
            <Route path="comms"      element={<TeacherComms />} />
          </Route>

          {/* ── Student ── */}
          <Route path="/student" element={
            <ProtectedRoute roles={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }>
            <Route index             element={<StudentDashboard />} />
            <Route path="results"    element={<StudentResults />} />
            <Route path="attendance" element={<StudentAttendance />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
