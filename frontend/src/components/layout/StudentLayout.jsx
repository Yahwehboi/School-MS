import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import {
  GraduationCap, LayoutDashboard, ClipboardList,
  CalendarCheck, LogOut, Menu, X, Bell, ChevronRight
} from "lucide-react";

const NAV = [
  { to: "/student",           icon: LayoutDashboard, label: "Dashboard",  end: true },
  { to: "/student/results",   icon: ClipboardList,   label: "My Results" },
  { to: "/student/attendance",icon: CalendarCheck,   label: "Attendance" },
];

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out.");
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-bold text-gray-900 text-base block">SmartSchool</span>
          <span className="text-gray-400 text-xs">Student Portal</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      <div className="px-5 pt-5 pb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</span>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onClose}>
            {({ isActive }) => (
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all cursor-pointer group
                ${isActive ? "bg-violet-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                <Icon className={`flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`}
                  style={{ width: "18px", height: "18px" }} />
                <span className="flex-1">{label}</span>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? "text-violet-200" : "text-gray-200"}`} />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-500
                     hover:bg-red-50 hover:text-red-600 transition-all text-sm font-medium">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 shadow-sm">
        <SidebarContent />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 shadow-xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
            <Bell className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
