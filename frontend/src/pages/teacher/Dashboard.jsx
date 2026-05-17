import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { academicsAPI, resultsAPI, attendanceAPI, commsAPI } from "../../services/api";
import { ClipboardList, CalendarCheck, BookOpen, Megaphone, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className="card hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-emerald-600 group-hover:gap-2 transition-all">
        View <ArrowUpRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [subjects, setSubjects]           = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    Promise.all([
      academicsAPI.subjects({ teacher: user?.id }),
      commsAPI.announcements(),
    ]).then(([s, a]) => {
      setSubjects(s.data.results || []);
      setAnnouncements((a.data.results || []).slice(0, 3));
    }).finally(() => setLoading(false));
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.first_name} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Welcome to your teacher dashboard.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={BookOpen}     label="My Subjects"   value={subjects.length} color="bg-emerald-500" to="/teacher/results" />
        <StatCard icon={ClipboardList} label="Results Entry" value="Active"          color="bg-blue-500"    to="/teacher/results" />
        <StatCard icon={CalendarCheck} label="Attendance"    value="Mark Today"      color="bg-violet-500"  to="/teacher/attendance" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My subjects */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">My Subjects</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : subjects.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No subjects assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {subjects.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-all">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.class_name || "—"}</p>
                  </div>
                  <span className="badge badge-green text-xs">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">School Notices</h2>
          {announcements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No announcements.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                    {a.is_pinned && <span className="badge badge-blue">Pinned</span>}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
