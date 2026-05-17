import { useEffect, useState } from "react";
import { studentsAPI, usersAPI, academicsAPI, commsAPI } from "../../services/api";
import { Users, BookOpen, ClipboardList, CalendarCheck, TrendingUp, Megaphone, ArrowUpRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className="card hover:shadow-md transition-all group cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {value ?? <span className="text-gray-200">—</span>}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-primary-600 group-hover:gap-2 transition-all">
        View all <ArrowUpRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats]             = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [students, teachers, classes, terms, anns] = await Promise.all([
          studentsAPI.list({ page_size: 1 }),
          usersAPI.list({ role: "teacher", page_size: 1 }),
          academicsAPI.classes(),
          academicsAPI.terms(),
          commsAPI.announcements(),
        ]);
        const termList = terms.data.results || [];
        const current  = termList.find(t => t.is_current);
        setCurrentTerm(current || null);
        setStats({
          students: students.data.count || 0,
          teachers: teachers.data.count || 0,
          classes:  classes.data.results?.length || 0,
          term:     current ? `${current.name} Term` : "No active term",
        });
        setAnnouncements((anns.data.results || []).slice(0, 4));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        <p className="text-gray-500 mt-1 text-sm">
          {currentTerm
            ? `${currentTerm.session_name} · ${currentTerm.name} Term`
            : "School Management Dashboard"
          }
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? Array(4).fill(0).map((_, i) => (
          <div key={i} className="card h-32 animate-pulse bg-gray-100" />
        )) : (
          <>
            <StatCard icon={Users}        label="Total Students" value={stats.students} color="bg-blue-500"    to="/admin/students" />
            <StatCard icon={GraduationCap} label="Teachers"       value={stats.teachers} color="bg-emerald-500" to="/admin/staff" />
            <StatCard icon={BookOpen}     label="Classes"        value={stats.classes}  color="bg-violet-500"  to="/admin/academics" />
            <StatCard icon={TrendingUp}   label="Current Term"   value={stats.term}     color="bg-amber-500"   to="/admin/academics" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label:"Add New Student",   to:"/admin/students",      icon:Users,         color:"text-blue-600 bg-blue-50" },
              { label:"Add Teacher",        to:"/admin/staff",         icon:GraduationCap, color:"text-emerald-600 bg-emerald-50" },
              { label:"Enter Scores",       to:"/admin/results/entry", icon:ClipboardList, color:"text-violet-600 bg-violet-50" },
              { label:"Mark Attendance",    to:"/admin/attendance",    icon:CalendarCheck, color:"text-rose-600 bg-rose-50" },
              { label:"Post Announcement",  to:"/admin/comms",         icon:Megaphone,     color:"text-amber-600 bg-amber-50" },
              { label:"Record Payment",     to:"/admin/finance",       icon:TrendingUp,    color:"text-teal-600 bg-teal-50" },
            ].map(({ label, to, icon: Icon, color }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                  {label}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-primary-400" />
              </Link>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Announcements</h2>
            <Link to="/admin/comms" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-4 rounded-xl bg-gray-50 hover:bg-primary-50 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{a.title}</p>
                    {a.is_pinned && <span className="badge badge-blue text-xs">Pinned</span>}
                    <span className="badge badge-gray capitalize ml-auto">{a.audience}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
