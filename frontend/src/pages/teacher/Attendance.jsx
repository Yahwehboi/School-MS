import { useEffect, useState } from "react";
import { academicsAPI, attendanceAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { CalendarCheck, Save, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "present", label: "Present", icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
  { value: "absent",  label: "Absent",  icon: XCircle,     color: "text-red-500 bg-red-50 border-red-200" },
  { value: "late",    label: "Late",    icon: Clock,       color: "text-amber-500 bg-amber-50 border-amber-200" },
  { value: "excused", label: "Excused", icon: AlertCircle, color: "text-blue-500 bg-blue-50 border-blue-200" },
];

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [subjects, setSubjects]       = useState([]);
  const [terms, setTerms]             = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [attendance, setAttendance]   = useState({});
  const [date, setDate]               = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    Promise.all([
      academicsAPI.subjects({ teacher: user?.id, page_size: 50 }),
      academicsAPI.terms(),
    ]).then(([s, t]) => {
      setSubjects(s.data.results || []);
      const termList = t.data.results || [];
      setTerms(termList);
      const current = termList.find(x => x.is_current);
      if (current) setSelectedTerm(current.id);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedSubject || !selectedTerm) return;
    const sub = subjects.find(s => s.id === selectedSubject);
    if (!sub) return;
    setLoading(true);
    academicsAPI.enrollments({ class_room: sub.class_room, term: selectedTerm, page_size: 60 })
      .then(r => {
        const enrs = r.data.results || [];
        setEnrollments(enrs);
        // Default everyone to present
        const defaults = {};
        enrs.forEach(e => { defaults[e.student] = "present"; });
        setAttendance(defaults);
      })
      .catch(() => toast.error("Failed to load students."))
      .finally(() => setLoading(false));
  }, [selectedSubject, selectedTerm]);

  const markAll = (status) => {
    const all = {};
    enrollments.forEach(e => { all[e.student] = status; });
    setAttendance(all);
  };

  const handleSave = async () => {
    if (!selectedSubject || !selectedTerm) return toast.error("Select a subject and term.");
    const sub = subjects.find(s => s.id === selectedSubject);
    if (!sub) return;
    setSaving(true);
    try {
      await attendanceAPI.bulkMark({
        class_room_id: sub.class_room,
        term_id: selectedTerm,
        date,
        entries: enrollments.map(e => ({
          student_id: e.student,
          status: attendance[e.student] || "present",
        })),
      });
      toast.success(`Attendance saved for ${date}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save attendance.");
    } finally { setSaving(false); }
  };

  const counts = enrollments.reduce((acc, e) => {
    const s = attendance[e.student] || "present";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-500 text-sm mt-0.5">Daily attendance for your class</p>
        </div>
        <button onClick={handleSave} disabled={saving || !enrollments.length}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold
                     px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm
                     disabled:opacity-40">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Attendance"}
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject / Class</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input text-sm">
              <option value="">Select subject...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} — {s.class_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Term</label>
            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input text-sm">
              {terms.map(t => <option key={t.id} value={t.id}>{t.session_name} — {t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input text-sm" />
          </div>
        </div>

        {enrollments.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">Mark all as:</span>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => markAll(value)}
                className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all
                           hover:scale-105 bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200">
                All {label}
              </button>
            ))}
            <div className="ml-auto flex gap-3 text-xs">
              <span className="text-green-600 font-semibold">✓ {counts.present || 0} present</span>
              <span className="text-red-500 font-semibold">✗ {counts.absent || 0} absent</span>
              <span className="text-amber-500 font-semibold">⏱ {counts.late || 0} late</span>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Student ID</th>
                <th className="table-header text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array(6).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={3} className="table-cell"><div className="h-10 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16 text-gray-400">
                    <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Select a subject to mark attendance</p>
                  </td>
                </tr>
              ) : enrollments.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="table-cell font-semibold text-gray-900">{e.student_name}</td>
                  <td className="table-cell font-mono text-xs text-gray-500">{e.student_id_no}</td>
                  <td className="table-cell">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {STATUS_OPTIONS.map(({ value, label, color }) => (
                        <button key={value} onClick={() => setAttendance(prev => ({ ...prev, [e.student]: value }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                            ${attendance[e.student] === value
                              ? color + " scale-105 shadow-sm"
                              : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                            }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
