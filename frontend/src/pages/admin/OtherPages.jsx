import { useEffect, useState } from "react";
import api, { attendanceAPI, academicsAPI, financeAPI, commsAPI, usersAPI, studentsAPI } from "../../services/api";
import { CalendarCheck, BookOpen, Wallet, Megaphone, Users, UserPlus, X, CheckCircle, AlertCircle, Search, Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";

// ── Attendance ─────────────────────────────────────────────────────────────
export function AttendancePage() {
  const [summary, setSummary] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    academicsAPI.terms().then(r => {
      const ts = r.data.results || [];
      setTerms(ts);
      const current = ts.find(x => x.is_current);
      if (current) setSelectedTerm(current.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setLoading(true);
    attendanceAPI.summary({ term: selectedTerm, page_size: 50 })
      .then(r => setSummary(r.data.results || []))
      .catch(() => toast.error("Failed to load attendance."))
      .finally(() => setLoading(false));
  }, [selectedTerm]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 text-sm mt-0.5">Student attendance summary by term</p>
      </div>
      <div className="card p-4 max-w-xs">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Term</label>
        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input text-sm">
          <option value="">Select term...</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.session_name} — {t.name}</option>)}
        </select>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header text-center">Total Days</th>
                <th className="table-header text-center">Present</th>
                <th className="table-header text-center">Absent</th>
                <th className="table-header text-center">Late</th>
                <th className="table-header text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array(6).fill(0).map((_, i) => (
                <tr key={i}>{Array(6).fill(0).map((_, j) => (
                  <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : summary.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                  <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No attendance data for this term</p>
                </td></tr>
              ) : summary.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{s.student_name}</td>
                  <td className="table-cell text-center">{s.total_days}</td>
                  <td className="table-cell text-center text-green-600 font-semibold">{s.days_present}</td>
                  <td className="table-cell text-center text-red-500 font-semibold">{s.days_absent}</td>
                  <td className="table-cell text-center text-amber-500 font-semibold">{s.days_late}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${s.attendance_percentage}%` }} />
                      </div>
                      <span className={`font-bold text-sm ${s.attendance_percentage >= 75 ? "text-green-600" : "text-red-500"}`}>
                        {s.attendance_percentage}%
                      </span>
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

// ── Term Manager (used inside AcademicsPage) ───────────────────────────────
function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    name: "", start_date: "", end_date: "", is_current: false,
  });

  const load = () => {
    academicsAPI.sessions()
      .then(r => setSessions(r.data.results || []));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/academics/sessions/", form);
      toast.success("Session added!");
      setShowForm(false);
      setForm({ name: "", start_date: "", end_date: "", is_current: false });
      load();
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Failed to add session.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleSetCurrent = async (sessionId) => {
    try {
      await api.patch(`/api/academics/sessions/${sessionId}/`, { is_current: true });
      toast.success("Current session updated!");
      load();
    } catch { toast.error("Failed to update session."); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Academic Sessions</h2>
          <p className="text-xs text-gray-400 mt-0.5">e.g. 2024/2025, 2025/2026</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Session
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
          <form onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Session Name * <span className="font-normal text-gray-400">(e.g. 2025/2026)</span>
              </label>
              <input value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="input text-sm" placeholder="2025/2026" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm(f => ({...f, start_date: e.target.value}))}
                className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date *</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm(f => ({...f, end_date: e.target.value}))}
                className="input text-sm" required />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_current}
                  onChange={e => setForm(f => ({...f, is_current: e.target.checked}))}
                  className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm font-medium text-gray-700">Set as current</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end
                            pt-2 border-t border-blue-100">
              <button type="button" onClick={() => setShowForm(false)}
                className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? "Adding..." : "Add Session"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-header">Session</th>
              <th className="table-header">Start Date</th>
              <th className="table-header">End Date</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  No sessions yet
                </td>
              </tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="table-cell font-bold text-gray-900">{s.name}</td>
                <td className="table-cell text-sm text-gray-500">{s.start_date}</td>
                <td className="table-cell text-sm text-gray-500">{s.end_date}</td>
                <td className="table-cell text-center">
                  <span className={s.is_current ? "badge-green" : "badge-gray"}>
                    {s.is_current ? "Current" : "Past"}
                  </span>
                </td>
                <td className="table-cell text-center">
                  {!s.is_current && (
                    <button onClick={() => handleSetCurrent(s.id)}
                      className="text-xs text-primary-600 hover:text-primary-800
                                 hover:bg-primary-50 px-2 py-1 rounded-lg
                                 transition-all font-medium">
                      Set Current
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function TermManager() {
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    session: "", name: "first",
    start_date: "", end_date: "",
    next_term_begins: "", is_current: false,
  });

  const load = () => {
    Promise.all([academicsAPI.sessions(), academicsAPI.terms()])
      .then(([s, t]) => {
        setSessions(s.data.results || []);
        setTerms(t.data.results || []);
      });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/academics/terms/", form);
      toast.success("Term added!");
      setShowForm(false);
      setForm({ session:"", name:"first", start_date:"", end_date:"", next_term_begins:"", is_current:false });
      load();
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(" ") : "Failed to add term.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleSetCurrent = async (termId) => {
    try {
      await api.patch(`/api/academics/terms/${termId}/`, { is_current: true });
      toast.success("Current term updated!");
      load();
    } catch { toast.error("Failed to update term."); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Terms & Sessions</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage academic terms</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Term
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Session *</label>
              <select value={form.session} onChange={e => setForm(f => ({...f, session: e.target.value}))} className="input text-sm" required>
                <option value="">Select session...</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Term *</label>
              <select value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input text-sm" required>
                <option value="first">First Term</option>
                <option value="second">Second Term</option>
                <option value="third">Third Term</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date *</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} className="input text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Next Term Begins</label>
              <input type="date" value={form.next_term_begins} onChange={e => setForm(f => ({...f, next_term_begins: e.target.value}))} className="input text-sm" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_current} onChange={e => setForm(f => ({...f, is_current: e.target.checked}))} className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm font-medium text-gray-700">Set as current term</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end pt-1 border-t border-blue-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? "Adding..." : "Add Term"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-header">Term</th>
              <th className="table-header">Session</th>
              <th className="table-header">Start</th>
              <th className="table-header">End</th>
              <th className="table-header">Next Term</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {terms.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No terms yet</td></tr>
            ) : terms.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="table-cell font-semibold text-gray-900 capitalize">{t.name} Term</td>
                <td className="table-cell text-gray-600">{t.session_name}</td>
                <td className="table-cell text-sm text-gray-500">{t.start_date}</td>
                <td className="table-cell text-sm text-gray-500">{t.end_date}</td>
                <td className="table-cell text-sm text-gray-500">{t.next_term_begins || "—"}</td>
                <td className="table-cell text-center">
                  <span className={t.is_current ? "badge-green" : "badge-gray"}>
                    {t.is_current ? "Current" : "Past"}
                  </span>
                </td>
                <td className="table-cell text-center">
                  {!t.is_current && (
                    <button onClick={() => handleSetCurrent(t.id)}
                      className="text-xs text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-2 py-1 rounded-lg transition-all font-medium">
                      Set Current
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Academics ──────────────────────────────────────────────────────────────
export function AcademicsPage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", code: "", teacher: "" });
  const [newClass, setNewClass] = useState({ name: "", level: "JSS1", arm: "" });
  const [saving, setSaving] = useState(false);

  const CLASS_LEVELS = ["JSS1","JSS2","JSS3","SS1","SS2","SS3","P1","P2","P3","P4","P5","P6"];

  const load = () => {
    Promise.all([
      academicsAPI.classes(),
      usersAPI.list({ role: "teacher", page_size: 50 }),
    ]).then(([c, t]) => {
      setClasses(c.data.results || []);
      setTeachers(t.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const loadSubjects = (classroom) => {
    setSelectedClass(classroom);
    setSubjectLoading(true);
    setShowAddSubject(false);
    academicsAPI.subjects({ class_room: classroom.id, page_size: 50 })
      .then(r => setSubjects(r.data.results || []))
      .finally(() => setSubjectLoading(false));
  };

  const handleAssignTeacher = async (subjectId, teacherId) => {
    try {
      await api.patch(`/api/academics/subjects/${subjectId}/`, { teacher: teacherId || null });
      toast.success("Teacher assigned!");
      loadSubjects(selectedClass);
    } catch { toast.error("Failed to assign teacher."); }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/academics/subjects/", {
        name: newSubject.name,
        code: newSubject.code,
        class_room: selectedClass.id,
        teacher: newSubject.teacher || null,
      });
      toast.success("Subject added!");
      setShowAddSubject(false);
      setNewSubject({ name: "", code: "", teacher: "" });
      loadSubjects(selectedClass);
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(" ") : "Failed to add subject.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm("Remove this subject?")) return;
    try {
      await api.delete(`/api/academics/subjects/${subjectId}/`);
      toast.success("Subject removed.");
      loadSubjects(selectedClass);
    } catch { toast.error("Failed to remove subject."); }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/academics/classes/", {
        name: newClass.name || `${newClass.level}${newClass.arm ? " " + newClass.arm : ""}`,
        level: newClass.level,
        arm: newClass.arm,
        capacity: 40,
      });
      toast.success("Class added!");
      setShowAddClass(false);
      setNewClass({ name: "", level: "JSS1", arm: "" });
      load();
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(" ") : "Failed to add class.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Delete this class? This will also remove all its subjects and enrollments.")) return;
    try {
      await api.delete(`/api/academics/classes/${classId}/`);
      toast.success("Class deleted.");
      if (selectedClass?.id === classId) setSelectedClass(null);
      load();
    } catch { toast.error("Cannot delete class — it may have students enrolled."); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Academics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage classes, subjects, and teacher assignments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes list */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Classes</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click a class to manage subjects</p>
            </div>
            <button onClick={() => setShowAddClass(!showAddClass)}
              className="p-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showAddClass && (
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
              <form onSubmit={handleAddClass} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Level *</label>
                    <select value={newClass.level} onChange={e => setNewClass(c => ({...c, level: e.target.value}))} className="input text-xs py-1.5" required>
                      {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Arm/Stream</label>
                    <input value={newClass.arm} onChange={e => setNewClass(c => ({...c, arm: e.target.value}))} className="input text-xs py-1.5" placeholder="e.g. Pink, A" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Custom Name (optional)</label>
                  <input value={newClass.name} onChange={e => setNewClass(c => ({...c, name: e.target.value}))} className="input text-xs py-1.5" placeholder="Leave blank to auto-generate" />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setShowAddClass(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                    {saving ? "Adding..." : "Add Class"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {loading ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></div>
            )) : classes.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">No classes found</div>
            ) : classes.map(c => (
              <div key={c.id} className={`flex items-center hover:bg-gray-50 transition-all group
                ${selectedClass?.id === c.id ? "bg-primary-50 border-l-4 border-primary-600" : ""}`}>
                <button onClick={() => loadSubjects(c)} className="flex-1 px-5 py-3.5 text-left flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-sm ${selectedClass?.id === c.id ? "text-primary-700" : "text-gray-900"}`}>
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.student_count} students</p>
                  </div>
                  <span className="badge badge-gray text-xs">{c.level}</span>
                </button>
                <button onClick={() => handleDeleteClass(c.id)}
                  className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subjects panel */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          {!selectedClass ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <BookOpen className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium text-sm">Select a class to manage subjects</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">{selectedClass.name} — Subjects</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{subjects.length} subjects · assign teachers below</p>
                </div>
                <button onClick={() => setShowAddSubject(!showAddSubject)}
                  className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Subject
                </button>
              </div>

              {showAddSubject && (
                <div className="px-5 py-4 border-b border-gray-100 bg-blue-50">
                  <form onSubmit={handleAddSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Name *</label>
                      <input value={newSubject.name} onChange={e => setNewSubject(s => ({...s, name: e.target.value}))} className="input text-sm" placeholder="e.g. Mathematics" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Short Code</label>
                      <input value={newSubject.code} onChange={e => setNewSubject(s => ({...s, code: e.target.value}))} className="input text-sm" placeholder="e.g. MATH" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Teacher</label>
                      <select value={newSubject.teacher} onChange={e => setNewSubject(s => ({...s, teacher: e.target.value}))} className="input text-sm">
                        <option value="">No teacher yet</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex gap-2 justify-end">
                      <button type="button" onClick={() => setShowAddSubject(false)} className="btn-secondary text-xs px-3 py-2">Cancel</button>
                      <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-2">{saving ? "Adding..." : "Add Subject"}</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-header">Subject</th>
                      <th className="table-header">Code</th>
                      <th className="table-header">Assigned Teacher</th>
                      <th className="table-header text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subjectLoading ? Array(4).fill(0).map((_, i) => (
                      <tr key={i}>{Array(4).fill(0).map((_, j) => (
                        <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}</tr>
                    )) : subjects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-gray-400">
                          <p className="text-sm">No subjects yet.</p>
                          <p className="text-xs mt-1">Click "Add Subject" to get started.</p>
                        </td>
                      </tr>
                    ) : subjects.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="table-cell font-semibold text-gray-900">{s.name}</td>
                        <td className="table-cell font-mono text-xs text-gray-500">{s.code || "—"}</td>
                        <td className="table-cell">
                          <select value={s.teacher || ""} onChange={e => handleAssignTeacher(s.id, e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white min-w-36">
                            <option value="">— Unassigned —</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                          </select>
                        </td>
                        <td className="table-cell text-center">
                          <button onClick={() => handleDeleteSubject(s.id)}
                            className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-all">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <SessionManager />
      <TermManager />
    </div>
  );
}
function StudentFeeStatus({ terms }) {
  const [search, setSearch]             = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [feeStatus, setFeeStatus]       = useState(null);
  const [searching, setSearching]       = useState(false);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    const current = terms.find(t => t.is_current);
    if (current) setSelectedTerm(current.id);
  }, [terms]);

  const handleSearch = async (query) => {
    setSearch(query);
    setSelectedStudent(null);
    setFeeStatus(null);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await studentsAPI.search(query);
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSearch(`${student.full_name} (${student.student_id})`);
    setSearchResults([]);
    if (selectedTerm) loadFeeStatus(student.id, selectedTerm);
  };

  const loadFeeStatus = async (studentId, termId) => {
    if (!studentId || !termId) return;
    setLoading(true);
    try {
      const { data } = await financeAPI.studentStatus({
        student_id: studentId,
        term_id: termId,
      });
      setFeeStatus(data);
    } catch { toast.error("Failed to load fee status."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      loadFeeStatus(selectedStudent.id, selectedTerm);
    }
  }, [selectedTerm]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Search Student
            </label>
            <input value={search} onChange={e => handleSearch(e.target.value)}
              className="input text-sm" placeholder="Type student name or ID..." />
            {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 bg-white border
                              border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {searchResults.map(s => (
                  <button key={s.id} type="button" onClick={() => handleSelectStudent(s)}
                    className="w-full px-4 py-3 text-left hover:bg-primary-50
                               border-b border-gray-50 last:border-0 transition-colors">
                    <p className="text-sm font-semibold text-gray-900">{s.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {s.student_id} · {s.current_class_name || "No class"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Term</label>
            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
              className="input text-sm">
              <option value="">Select term...</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.session_name} — {t.name} {t.is_current ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card text-center py-12 text-gray-400">
          <p>Loading fee status...</p>
        </div>
      )}

      {feeStatus && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Student</p>
              <p className="font-bold text-gray-900 text-sm">{feeStatus.student_name}</p>
              <p className="text-xs text-gray-400">{feeStatus.student_id_no}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Total Expected</p>
              <p className="text-xl font-bold text-gray-900">
                ₦{parseFloat(feeStatus.total_expected).toLocaleString()}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Total Paid</p>
              <p className="text-xl font-bold text-green-600">
                ₦{parseFloat(feeStatus.total_paid).toLocaleString()}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Balance</p>
              <p className={`text-xl font-bold ${
                feeStatus.is_cleared ? "text-green-600" : "text-red-500"
              }`}>
                ₦{parseFloat(feeStatus.total_balance).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Fee Breakdown</h3>
              <span className={`badge ${feeStatus.is_cleared ? "badge-green" : "badge-red"}`}>
                {feeStatus.is_cleared ? "Fully Cleared" : "Has Outstanding"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Fee Type</th>
                    <th className="table-header text-right">Expected</th>
                    <th className="table-header text-right">Paid</th>
                    <th className="table-header text-right">Balance</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(feeStatus.fees || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                        No fee structures set up for this term
                      </td>
                    </tr>
                  ) : (feeStatus.fees || []).map((fee, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{fee.fee_type_display}</td>
                      <td className="table-cell text-right font-mono text-sm">
                        ₦{parseFloat(fee.amount_expected).toLocaleString()}
                      </td>
                      <td className="table-cell text-right font-mono text-sm text-green-600">
                        ₦{parseFloat(fee.amount_paid).toLocaleString()}
                      </td>
                      <td className="table-cell text-right font-mono text-sm text-red-500">
                        ₦{parseFloat(fee.balance).toLocaleString()}
                      </td>
                      <td className="table-cell text-center">
                        <span className={fee.is_cleared ? "badge-green" : "badge-yellow"}>
                          {fee.is_cleared ? "Cleared" : "Owing"}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-gray-500">
                        {fee.receipts?.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!feeStatus && !loading && selectedStudent && (
        <div className="card text-center py-12 text-gray-400">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No fee records found for this student in the selected term</p>
        </div>
      )}

      {!selectedStudent && !loading && (
        <div className="card text-center py-12 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Search for a student to view their fee status</p>
        </div>
      )}
    </div>
  );
}
// ── Finance ────────────────────────────────────────────────────────────────
export function FinancePage() {
  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    student: "", fee_structure: "", term: "",
    fee_type: "school_fees", amount_expected: "",
    amount_paid: "", payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [feeForm, setFeeForm] = useState({
    class_room: "", term: "", fee_type: "school_fees",
    amount: "", description: "", is_mandatory: true,
  });

  const FEE_TYPES = [
    { value: "school_fees", label: "School Fees" },
    { value: "development", label: "Development Levy" },
    { value: "exam_fee", label: "Exam Fee" },
    { value: "uniform", label: "Uniform" },
    { value: "books", label: "Books" },
    { value: "transport", label: "Transport" },
    { value: "other", label: "Other" },
  ];

  const PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "online", label: "Online (Paystack)" },
    { value: "pos", label: "POS" },
  ];

  useEffect(() => {
    Promise.all([academicsAPI.terms(), academicsAPI.classes()])
      .then(([t, c]) => {
        const termList = t.data.results || [];
        setTerms(termList);
        setClasses(c.data.results || []);
        const current = termList.find(x => x.is_current);
        if (current) {
          setSelectedTerm(current.id);
          setPaymentForm(f => ({ ...f, term: current.id }));
          setFeeForm(f => ({ ...f, term: current.id }));
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setLoading(true);
    Promise.all([
      financeAPI.payments({ term: selectedTerm, page_size: 50 }),
      financeAPI.feeStructures({ term: selectedTerm }),
    ]).then(([p, f]) => {
      setPayments(p.data.results || []);
      setFeeStructures(f.data.results || []);
    }).finally(() => setLoading(false));
  }, [selectedTerm]);

  const handleStudentSearch = async (query) => {
    setStudentSearch(query);
    setSelectedStudent(null);
    if (query.length < 2) { setStudentResults([]); return; }
    setSearchLoading(true);
    try {
      const { data } = await studentsAPI.search(query);
      setStudentResults(data.results || []);
    } catch {
      setStudentResults([]);
    } finally { setSearchLoading(false); }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.full_name} (${student.student_id})`);
    setStudentResults([]);
    setPaymentForm(f => ({ ...f, student: student.id }));
  };

  const handleDownloadReceipt = async (receiptNumber) => {
    try {
      toast("Generating receipt...", { icon: "⏳" });
      const response = await api.get(`/api/finance/receipt/${receiptNumber}/pdf/`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `receipt_${receiptNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Receipt downloaded!");
    } catch { toast.error("Failed to generate receipt."); }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await financeAPI.recordPayment(paymentForm);
      toast.success("Payment recorded!");
      setShowPaymentForm(false);
      setSelectedStudent(null);
      setStudentSearch("");
      setPaymentForm(f => ({
        ...f, student: "", amount_paid: "", amount_expected: "", note: "",
        payment_date: new Date().toISOString().split("T")[0],
      }));
      const p = await financeAPI.payments({ term: selectedTerm, page_size: 50 });
      setPayments(p.data.results || []);
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(" ") : "Failed to record payment.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleAddFeeStructure = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/finance/fee-structures/", feeForm);
      toast.success("Fee structure added!");
      setShowFeeForm(false);
      const f = await financeAPI.feeStructures({ term: selectedTerm });
      setFeeStructures(f.data.results || []);
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(" ") : "Failed to add fee.";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
  const totalOutstanding = payments.reduce((sum, p) => sum + parseFloat(p.balance || 0), 0);

  const filteredPayments = payments.filter(p =>
    !paymentSearch ||
    p.student_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.student_id_no?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.receipt_number?.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fee structures, payments, and receipts</p>
        </div>
        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input text-sm max-w-48">
          <option value="">Select term...</option>
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.session_name} — {t.name} {t.is_current ? "(Current)" : ""}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">₦{totalCollected.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-red-500">₦{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key:"payments", label:"Payments" },
          { key:"fees",     label:"Fee Structures" },
          { key:"status",   label:"Student Status" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "payments" && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-bold text-gray-900 text-sm">Payment Records</h2>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)}
                placeholder="Search student or receipt..." className="input text-xs pl-8 py-2" />
            </div>
            <button onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </button>
          </div>

          {showPaymentForm && (
            <div className="px-5 py-4 border-b border-gray-100 bg-blue-50">
              <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Student * {selectedStudent && <span className="text-green-600 font-normal">— selected</span>}
                  </label>
                  <input value={studentSearch} onChange={e => handleStudentSearch(e.target.value)}
                    className="input text-sm" placeholder="Type student name or ID..."
                    required={!selectedStudent} />
                  {searchLoading && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
                  {studentResults.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                      {studentResults.map(s => (
                        <button key={s.id} type="button" onClick={() => handleSelectStudent(s)}
                          className="w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors">
                          <p className="text-sm font-semibold text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.student_id} · {s.current_class_name || "No class"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedStudent && (
                    <div className="mt-1.5 px-3 py-2 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-green-800">{selectedStudent.full_name}</p>
                        <p className="text-xs text-green-600">{selectedStudent.student_id} · {selectedStudent.current_class_name}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedStudent(null); setStudentSearch(""); setPaymentForm(f => ({ ...f, student: "" })); }}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fee Type *</label>
                  <select value={paymentForm.fee_type} onChange={e => setPaymentForm(f => ({...f, fee_type: e.target.value}))} className="input text-sm" required>
                    {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount Expected (₦) *</label>
                  <input type="number" value={paymentForm.amount_expected} onChange={e => setPaymentForm(f => ({...f, amount_expected: e.target.value}))} className="input text-sm" placeholder="e.g. 45000" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount Paid (₦) *</label>
                  <input type="number" value={paymentForm.amount_paid} onChange={e => setPaymentForm(f => ({...f, amount_paid: e.target.value}))} className="input text-sm" placeholder="e.g. 45000" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Method</label>
                  <select value={paymentForm.payment_method} onChange={e => setPaymentForm(f => ({...f, payment_method: e.target.value}))} className="input text-sm">
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Date *</label>
                  <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({...f, payment_date: e.target.value}))} className="input text-sm" required />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Note</label>
                  <input value={paymentForm.note} onChange={e => setPaymentForm(f => ({...f, note: e.target.value}))} className="input text-sm" placeholder="Optional note..." />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end border-t border-blue-100 pt-2">
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="btn-secondary text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? "Recording..." : "Record Payment"}</button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Student</th>
                  <th className="table-header">Fee Type</th>
                  <th className="table-header text-right">Expected</th>
                  <th className="table-header text-right">Paid</th>
                  <th className="table-header text-right">Balance</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Receipt</th>
                  <th className="table-header text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(9).fill(0).map((_, j) => (
                    <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                )) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400">
                      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">{paymentSearch ? "No payments match your search" : "No payments recorded yet"}</p>
                      {!paymentSearch && <p className="text-xs mt-1">Click "Record Payment" to add one</p>}
                    </td>
                  </tr>
                ) : filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-semibold text-sm text-gray-900">{p.student_name}</p>
                      <p className="text-xs text-gray-400">{p.student_id_no}</p>
                    </td>
                    <td className="table-cell text-sm">{p.fee_type_display}</td>
                    <td className="table-cell text-right font-mono text-sm">₦{parseFloat(p.amount_expected).toLocaleString()}</td>
                    <td className="table-cell text-right font-mono text-sm text-green-600 font-semibold">₦{parseFloat(p.amount_paid).toLocaleString()}</td>
                    <td className="table-cell text-right font-mono text-sm text-red-500">₦{parseFloat(p.balance).toLocaleString()}</td>
                    <td className="table-cell text-sm text-gray-500 capitalize">{p.payment_method}</td>
                    <td className="table-cell text-sm text-gray-500">{p.payment_date}</td>
                    <td className="table-cell">
                      <button onClick={() => handleDownloadReceipt(p.receipt_number)}
                        className="font-mono text-xs text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-1">
                        {p.receipt_number} <span className="text-gray-300">↓</span>
                      </button>
                    </td>
                    <td className="table-cell text-center">
                      <span className={p.is_fully_paid ? "badge-green" : "badge-yellow"}>
                        {p.is_fully_paid ? "Cleared" : "Owing"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "fees" && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-sm">Fee Structures</h2>
            <button onClick={() => setShowFeeForm(!showFeeForm)}
              className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Fee
            </button>
          </div>

          {showFeeForm && (
            <div className="px-5 py-4 border-b border-gray-100 bg-blue-50">
              <form onSubmit={handleAddFeeStructure} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Class *</label>
                  <select value={feeForm.class_room} onChange={e => setFeeForm(f => ({...f, class_room: e.target.value}))} className="input text-sm" required>
                    <option value="">Select class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fee Type *</label>
                  <select value={feeForm.fee_type} onChange={e => setFeeForm(f => ({...f, fee_type: e.target.value}))} className="input text-sm" required>
                    {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₦) *</label>
                  <input type="number" value={feeForm.amount} onChange={e => setFeeForm(f => ({...f, amount: e.target.value}))} className="input text-sm" placeholder="e.g. 45000" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                  <input value={feeForm.description} onChange={e => setFeeForm(f => ({...f, description: e.target.value}))} className="input text-sm" placeholder="Optional description" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={feeForm.is_mandatory} onChange={e => setFeeForm(f => ({...f, is_mandatory: e.target.checked}))} className="w-4 h-4 rounded accent-primary-600" />
                    <span className="text-sm font-medium text-gray-700">Mandatory</span>
                  </label>
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end border-t border-blue-100 pt-2">
                  <button type="button" onClick={() => setShowFeeForm(false)} className="btn-secondary text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? "Adding..." : "Add Fee Structure"}</button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Class</th>
                  <th className="table-header">Fee Type</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Description</th>
                  <th className="table-header text-center">Mandatory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feeStructures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-gray-400">
                      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No fee structures yet</p>
                      <p className="text-xs mt-1">Add fee structures to start recording payments</p>
                    </td>
                  </tr>
                ) : feeStructures.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="table-cell font-semibold text-gray-900">{f.class_name}</td>
                    <td className="table-cell">{f.fee_type_display}</td>
                    <td className="table-cell text-right font-mono font-semibold text-gray-900">₦{parseFloat(f.amount).toLocaleString()}</td>
                    <td className="table-cell text-sm text-gray-500">{f.description || "—"}</td>
                    <td className="table-cell text-center">
                      <span className={f.is_mandatory ? "badge-green" : "badge-gray"}>
                        {f.is_mandatory ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "status" && (
        <StudentFeeStatus terms={terms} />
      )}
    </div>
  );
}

// ── Communications ─────────────────────────────────────────────────────────
export function CommsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    commsAPI.announcements()
      .then(r => setAnnouncements(r.data.results || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await commsAPI.createAnnouncement(form);
      toast.success("Announcement posted!");
      setShowForm(false);
      setForm({ title: "", body: "", audience: "all" });
      load();
    } catch { toast.error("Failed to post announcement."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-500 text-sm mt-0.5">School announcements and notices</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Megaphone className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="card border-primary-100">
          <h3 className="font-bold text-gray-900 mb-4">Post Announcement</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="input" required placeholder="Announcement title" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Message *</label>
              <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} className="input resize-none" rows={4} required placeholder="Write your announcement..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Audience</label>
              <select value={form.audience} onChange={e => setForm(f => ({...f, audience: e.target.value}))} className="input">
                <option value="all">Everyone</option>
                <option value="teachers">Teachers Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Posting..." : "Post Announcement"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? Array(3).fill(0).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-gray-100" />
        )) : announcements.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No announcements yet</p>
          </div>
        ) : announcements.map(a => (
          <div key={a.id} className="card hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-gray-900">{a.title}</h3>
                  {a.is_pinned && <span className="badge badge-blue">Pinned</span>}
                  <span className="badge badge-gray capitalize">{a.audience}</span>
                </div>
                <p className="text-sm text-gray-600">{a.body}</p>
                <p className="text-xs text-gray-400 mt-2">
                  By {a.author_name} · {new Date(a.published_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleTogglePin(a.id, a.is_pinned)}
                  className={`text-xs px-2 py-1.5 rounded-lg transition-all font-medium
                    ${a.is_pinned
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}>
                  {a.is_pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-400
                             hover:bg-red-100 hover:text-red-600 transition-all font-medium">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Staff ──────────────────────────────────────────────────────────────────
export function StaffPage() {
  const [teachers, setTeachers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", password: "Teacher@1234",
  });

  const load = () => {
    usersAPI.list({ role: "teacher", page_size: 50 })
      .then(r => {
        setTeachers(r.data.results || []);
        setCount(r.data.count || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersAPI.create({ ...form, role: "teacher", confirm_password: form.password });
      toast.success(`${form.first_name} ${form.last_name} added as teacher!`);
      setShowForm(false);
      setForm({ first_name:"", last_name:"", email:"", phone:"", password:"Teacher@1234" });
      load();
    } catch (err) {
      const errors = err.response?.data;
      const msg = errors ? Object.values(errors).flat().join(" ") : "Failed to create teacher.";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-0.5">{count} teachers registered</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      {showForm && (
        <div className="card border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">New Teacher Account</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key:"first_name", label:"First Name", required:true },
              { key:"last_name",  label:"Last Name",  required:true },
              { key:"email",      label:"Email Address", required:true, type:"email" },
              { key:"phone",      label:"Phone Number" },
              { key:"password",   label:"Default Password", required:true },
            ].map(({ key, label, required, type="text" }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="input text-sm" required={required} />
              </div>
            ))}
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary text-sm">{submitting ? "Creating..." : "Create Teacher Account"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Teacher</th>
                <th className="table-header">Email</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Status</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array(4).fill(0).map((_, i) => (
                <tr key={i}>{Array(4).fill(0).map((_, j) => (
                  <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No teachers yet. Add your first teacher above.</p>
                  </td>
                </tr>
              ) : teachers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center
                                      justify-center text-white text-xs font-bold flex-shrink-0">
                        {t.first_name?.[0]}{t.last_name?.[0]}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{t.full_name}</p>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-gray-500">{t.email}</td>
                  <td className="table-cell text-sm text-gray-500">{t.phone || "—"}</td>
                  <td className="table-cell">
                    <span className={t.is_active ? "badge-green" : "badge-red"}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    {t.is_active ? (
                      <button
                        onClick={() => handleDeactivateTeacher(t.id, t.full_name)}
                        className="text-xs text-red-400 hover:text-red-600
                                   hover:bg-red-50 px-2 py-1 rounded-lg transition-all">
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateTeacher(t.id, t.full_name)}
                        className="text-xs text-green-600 hover:text-green-800
                                   hover:bg-green-50 px-2 py-1 rounded-lg transition-all">
                        Reactivate
                      </button>
                    )}
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
const handleDeactivateTeacher = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    try {
      await usersAPI.deactivate(id);
      toast.success(`${name} has been deactivated.`);
      load();
    } catch { toast.error("Failed to deactivate teacher."); }
  };

  const handleActivateTeacher = async (id, name) => {
    if (!window.confirm(`Reactivate ${name}?`)) return;
    try {
      await api.patch(`/api/auth/users/${id}/`, { is_active: true });
      toast.success(`${name} has been reactivated.`);
      load();
    } catch { toast.error("Failed to reactivate teacher."); }
  };