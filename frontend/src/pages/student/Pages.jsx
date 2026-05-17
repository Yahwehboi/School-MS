import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { resultsAPI, attendanceAPI, academicsAPI, commsAPI } from "../../services/api";
import { ClipboardList, CalendarCheck, TrendingUp, Megaphone, ArrowUpRight, Download, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

// ── Dashboard ──────────────────────────────────────────────────────────────
export function StudentDashboard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [currentTerm, setCurrentTerm]     = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    Promise.all([academicsAPI.terms(), commsAPI.announcements()])
      .then(([t, a]) => {
        const current = (t.data.results || []).find(x => x.is_current);
        setCurrentTerm(current || null);
        setAnnouncements((a.data.results || []).slice(0, 3));
      })
      .finally(() => setLoading(false));
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
          {currentTerm ? `${currentTerm.session_name} — ${currentTerm.name} Term` : "Welcome to your student portal."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/student/results" className="card hover:shadow-md transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">My Results</p>
              <p className="text-xl font-bold text-gray-900 mt-1">View Scores</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-violet-600 group-hover:gap-2 transition-all">
            View results <ArrowUpRight className="w-3 h-3" />
          </div>
        </Link>

        <Link to="/student/attendance" className="card hover:shadow-md transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Attendance</p>
              <p className="text-xl font-bold text-gray-900 mt-1">My Record</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-emerald-600 group-hover:gap-2 transition-all">
            View attendance <ArrowUpRight className="w-3 h-3" />
          </div>
        </Link>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Term</p>
              <p className="text-xl font-bold text-gray-900 mt-1 capitalize">
                {currentTerm ? currentTerm.name : "—"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">{currentTerm?.session_name || "—"}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-gray-900 mb-4">School Notices</h2>
        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                  {a.is_pinned && <span className="badge badge-blue">Pinned</span>}
                </div>
                <p className="text-xs text-gray-500">{a.body}</p>
                <p className="text-xs text-gray-300 mt-1">{new Date(a.published_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Results ────────────────────────────────────────────────────────────────
const GRADE_COLOR = {
  A:"badge-green", B:"badge-blue", C:"badge-yellow",
  D:"badge-yellow", E:"badge-red", F:"badge-red"
};

export function StudentResults() {
  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [enrollment, setEnrollment]     = useState(null);
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [downloading, setDownloading]   = useState(false);

  useEffect(() => {
    academicsAPI.terms().then(r => {
      const list = r.data.results || [];
      setTerms(list);
      const current = list.find(x => x.is_current);
      if (current) setSelectedTerm(current.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setLoading(true);
    academicsAPI.enrollments({ term: selectedTerm, page_size: 5 })
      .then(r => {
        const enrs = r.data.results || [];
        const myEnrollment = enrs[0];
        setEnrollment(myEnrollment || null);
        if (myEnrollment) {
          return resultsAPI.list({
            term: selectedTerm,
            enrollment: myEnrollment.id,
            page_size: 50,
          });
        }
        return { data: { results: [] } };
      })
      .then(r => setResults(r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedTerm]);

  const published = results.filter(r => r.is_published);
  const total = published.reduce((sum, r) => sum + (r.total || 0), 0);
  const avg   = published.length ? (total / published.length).toFixed(1) : 0;

  const handleDownloadPDF = async () => {
    if (!enrollment || !selectedTerm) return toast.error("No results to download.");
    if (published.length === 0) return toast.error("No published results yet.");
    setDownloading(true);
    try {
      toast("Generating report card...", { icon: "⏳" });
      const response = await api.get("/api/results/report-card/pdf/", {
        params: {
          enrollment_id: enrollment.id,
          term_id: selectedTerm,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const termName = terms.find(t => t.id === selectedTerm)?.name || "term";
      link.setAttribute("download", `report_card_${termName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report card downloaded!");
    } catch {
      toast.error("Failed to generate PDF. Ensure results are published.");
    } finally { setDownloading(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your academic performance by term</p>
        </div>
        {published.length > 0 && (
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600
                       hover:bg-primary-700 text-white text-sm font-semibold
                       rounded-xl transition-all disabled:opacity-50">
            {downloading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Download className="w-4 h-4" /> Download Report Card</>
            }
          </button>
        )}
      </div>

      <div className="card p-4 max-w-xs">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Term</label>
        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input text-sm">
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.session_name} — {t.name} Term</option>
          ))}
        </select>
      </div>

      {enrollment && published.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Class",       value: enrollment.class_name },
            { label: "Total Score", value: total.toFixed(1) },
            { label: "Average",     value: `${avg}%` },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Subject</th>
                <th className="table-header text-center">CA (40)</th>
                <th className="table-header text-center">Exam (60)</th>
                <th className="table-header text-center">Total</th>
                <th className="table-header text-center">Grade</th>
                <th className="table-header text-center">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}>{Array(6).fill(0).map((_, j) => (
                  <td key={j} className="table-cell">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}</tr>
              )) : published.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No published results yet</p>
                    <p className="text-xs mt-1">Results will appear once your teacher publishes them</p>
                  </td>
                </tr>
              ) : published.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell font-semibold text-gray-900">{r.subject_name}</td>
                  <td className="table-cell text-center font-mono">{r.ca_score ?? "—"}</td>
                  <td className="table-cell text-center font-mono">{r.exam_score ?? "—"}</td>
                  <td className="table-cell text-center font-bold font-mono">{r.total ?? "—"}</td>
                  <td className="table-cell text-center">
                    {r.grade
                      ? <span className={`badge ${GRADE_COLOR[r.grade] || "badge-gray"}`}>{r.grade}</span>
                      : "—"
                    }
                  </td>
                  <td className="table-cell text-center text-xs text-gray-500">{r.remark || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Attendance ─────────────────────────────────────────────────────────────
export function StudentAttendance() {
  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    academicsAPI.terms().then(r => {
      const list = r.data.results || [];
      setTerms(list);
      const current = list.find(x => x.is_current);
      if (current) setSelectedTerm(current.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setLoading(true);
    attendanceAPI.summary({ term: selectedTerm, page_size: 1 })
      .then(r => setSummary((r.data.results || [])[0] || null))
      .finally(() => setLoading(false));
  }, [selectedTerm]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your attendance record by term</p>
      </div>

      <div className="card p-4 max-w-xs">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Term</label>
        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input text-sm">
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.session_name} — {t.name} Term</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label:"Total Days",  value: summary.total_days,    color:"text-gray-900" },
              { label:"Present",     value: summary.days_present,  color:"text-green-600" },
              { label:"Absent",      value: summary.days_absent,   color:"text-red-500" },
              { label:"Late",        value: summary.days_late,     color:"text-amber-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Attendance Rate</span>
              <span className={`text-lg font-bold ${
                summary.attendance_percentage >= 75 ? "text-green-600" : "text-red-500"
              }`}>
                {summary.attendance_percentage}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700
                  ${summary.attendance_percentage >= 75 ? "bg-green-500" : "bg-red-400"}`}
                style={{ width: `${summary.attendance_percentage}%` }}
              />
            </div>
            {summary.attendance_percentage < 75 && (
              <p className="text-xs text-red-500 mt-2">
                ⚠ Your attendance is below the 75% minimum requirement.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="card text-center py-16 text-gray-400">
          <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No attendance records for this term yet</p>
        </div>
      )}
    </div>
  );
}