import { useEffect, useState } from "react";
import api, { resultsAPI, academicsAPI } from "../../services/api";
import { ClipboardList, CheckCircle, RefreshCw, Filter, Save, Edit3 } from "lucide-react";
import toast from "react-hot-toast";

const GRADE_COLOR = {
  A: "badge-green", B: "badge-blue", C: "badge-yellow",
  D: "badge-yellow", E: "badge-red",  F: "badge-red"
};

export default function ResultsPage() {
  const [mode, setMode]                   = useState("view"); // "view" | "entry"
  const [results, setResults]             = useState([]);
  const [terms, setTerms]                 = useState([]);
  const [classes, setClasses]             = useState([]);
  const [subjects, setSubjects]           = useState([]);
  const [enrollments, setEnrollments]     = useState([]);
  const [selectedTerm, setSelectedTerm]   = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [scores, setScores]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [acting, setActing]               = useState("");

  // Load terms and classes on mount
  useEffect(() => {
    Promise.all([academicsAPI.terms(), academicsAPI.classes()]).then(([t, c]) => {
      const termList  = t.data.results || [];
      const classList = c.data.results || [];
      setTerms(termList);
      setClasses(classList);
      const current = termList.find(x => x.is_current);
      if (current) setSelectedTerm(current.id);
    });
  }, []);

  // Load subjects when class changes
  useEffect(() => {
    setSelectedSubject("");
    setSubjects([]);
    setEnrollments([]);
    setScores({});
    if (!selectedClass) return;
    academicsAPI.subjects({ class_room: selectedClass, page_size: 50 })
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.results || []);
        setSubjects(list);
      });
  }, [selectedClass]);

  // Load results or enrollments when filters change
  useEffect(() => {
    if (!selectedTerm || !selectedClass) { setResults([]); return; }
    if (mode === "view") loadResults();
    if (mode === "entry" && selectedSubject) loadEnrollments();
  }, [selectedTerm, selectedClass, selectedSubject, mode, classes]);

  const loadResults = () => {
    setLoading(true);
    const params = { term: selectedTerm, page_size: 200 };
    if (selectedSubject) params.subject = selectedSubject;
    resultsAPI.list(params)
      .then(r => {
        const all       = r.data.results || [];
        const className = classes.find(c => c.id === selectedClass)?.name;
        setResults(className ? all.filter(res => res.class_name === className) : all);
      })
      .catch(() => toast.error("Failed to load results."))
      .finally(() => setLoading(false));
  };

  const loadEnrollments = () => {
    if (!selectedSubject || !selectedTerm || !selectedClass) return;
    setLoading(true);
    academicsAPI.enrollments({ class_room: selectedClass, term: selectedTerm, page_size: 60 })
      .then(r => {
        const enrs = r.data.results || [];
        setEnrollments(enrs);
        // Pre-fill existing scores
        return resultsAPI.list({ term: selectedTerm, subject: selectedSubject, page_size: 60 });
      })
      .then(r => {
        const existing = {};
        (r.data.results || []).forEach(res => {
          existing[res.enrollment] = {
            ca:   res.ca_score   ?? "",
            exam: res.exam_score ?? "",
          };
        });
        setScores(existing);
      })
      .catch(() => toast.error("Failed to load students."))
      .finally(() => setLoading(false));
  };

  const setScore = (enrollId, field, val) => {
    setScores(prev => ({
      ...prev,
      [enrollId]: { ...prev[enrollId], [field]: val },
    }));
  };

  const handleSaveScores = async () => {
    if (!selectedSubject || !selectedTerm) return toast.error("Select a subject and term.");
    setSaving(true);
    try {
      const entries = enrollments.map(e => ({
        enrollment_id: e.id,
        ca_score:   scores[e.id]?.ca   !== "" ? parseFloat(scores[e.id]?.ca)   : null,
        exam_score: scores[e.id]?.exam !== "" ? parseFloat(scores[e.id]?.exam) : null,
      }));
      await resultsAPI.bulkEntry({
        subject_id: selectedSubject,
        term_id:    selectedTerm,
        entries,
      });
      toast.success("Scores saved successfully!");
      loadEnrollments();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save scores.");
    } finally { setSaving(false); }
  };

  const handleComputePositions = async () => {
    if (!selectedTerm || !selectedClass) return toast.error("Select a term and class first.");
    setActing("positions");
    try {
      await resultsAPI.computePositions({ term_id: selectedTerm, class_room_id: selectedClass });
      toast.success("Positions computed!");
      if (mode === "view") loadResults();
    } catch { toast.error("Failed to compute positions."); }
    finally { setActing(""); }
  };

  const handlePublish = async () => {
    if (!selectedTerm || !selectedClass) return toast.error("Select a term and class first.");
    setActing("publish");
    try {
      await resultsAPI.publish({ term_id: selectedTerm, class_room_id: selectedClass });
      toast.success("Results published! Students can now view them.");
      if (mode === "view") loadResults();
    } catch { toast.error("Failed to publish."); }
    finally { setActing(""); }
  };

  const handleDeleteResult = async (resultId, studentName, subjectName) => {
    if (!window.confirm(`Delete ${studentName}'s ${subjectName} result?`)) return;
    try {
      await api.delete(`/api/results/${resultId}/`);
      toast.success("Result deleted.");
      loadResults();
    } catch { toast.error("Failed to delete result."); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results</h1>
          <p className="text-gray-500 text-sm mt-0.5">View results and enter scores</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleComputePositions} disabled={!!acting || !selectedClass}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${acting === "positions" ? "animate-spin" : ""}`} />
            Compute Positions
          </button>
          <button onClick={handlePublish} disabled={!!acting || !selectedClass}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40">
            <CheckCircle className="w-4 h-4" />
            {acting === "publish" ? "Publishing..." : "Publish Results"}
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => { setMode("view"); setResults([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
            ${mode === "view"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"}`}>
          <ClipboardList className="w-4 h-4" /> View Results
        </button>
        <button onClick={() => { setMode("entry"); setResults([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
            ${mode === "entry"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"}`}>
          <Edit3 className="w-4 h-4" /> Enter Scores
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600">
            {mode === "view" ? "Filter Results" : "Select Class & Subject"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Term *</label>
            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input text-sm">
              <option value="">Select term...</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.session_name} — {t.name} {t.is_current ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Class *</label>
            <select value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(""); }}
              className="input text-sm">
              <option value="">Select class...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Subject {mode === "entry" && <span className="text-red-500">*</span>}
              {!selectedClass && <span className="text-gray-300 font-normal"> (select class first)</span>}
            </label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="input text-sm"
              disabled={!selectedClass || subjects.length === 0}>
              <option value="">{mode === "view" ? "All subjects" : "Select subject..."}</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedClass && subjects.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">No subjects found for this class</p>
            )}
          </div>
        </div>
      </div>

      {/* ── VIEW MODE ── */}
      {mode === "view" && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-600 text-sm">
              {loading ? "Loading..." : `${results.length} result records`}
              {selectedClass && classes.find(c => c.id === selectedClass) &&
                ` · ${classes.find(c => c.id === selectedClass).name}`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Student</th>
                  <th className="table-header">Class</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header text-center">CA (40)</th>
                  <th className="table-header text-center">Exam (60)</th>
                  <th className="table-header text-center">Total</th>
                  <th className="table-header text-center">Grade</th>
                  <th className="table-header text-center">Remark</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? Array(6).fill(0).map((_, i) => (
                  <tr key={i}>{Array(10).fill(0).map((_, j) => (
                    <td key={j} className="table-cell">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}</tr>
                )) : results.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-gray-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">
                        {!selectedClass
                          ? "Select a term and class to view results"
                          : "No results found"}
                      </p>
                    </td>
                  </tr>
                ) : results.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.student_name}</p>
                        <p className="text-xs text-gray-400">{r.student_id_no}</p>
                      </div>
                    </td>
                    <td className="table-cell text-gray-500 text-xs">{r.class_name}</td>
                    <td className="table-cell font-medium">{r.subject_name}</td>
                    <td className="table-cell text-center font-mono text-sm">{r.ca_score ?? "—"}</td>
                    <td className="table-cell text-center font-mono text-sm">{r.exam_score ?? "—"}</td>
                    <td className="table-cell text-center font-bold font-mono">{r.total ?? "—"}</td>
                    <td className="table-cell text-center">
                      {r.grade
                        ? <span className={`badge ${GRADE_COLOR[r.grade] || "badge-gray"}`}>{r.grade}</span>
                        : "—"}
                    </td>
                    <td className="table-cell text-center text-xs text-gray-500">{r.remark || "—"}</td>
                    <td className="table-cell text-center">
                      <span className={r.is_published ? "badge-green" : "badge-yellow"}>
                        {r.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <button
                        onClick={() => handleDeleteResult(r.id, r.student_name, r.subject_name)}
                        className="text-xs text-red-400 hover:text-red-600
                                   hover:bg-red-50 px-2 py-1 rounded-lg transition-all">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ENTRY MODE ── */}
      {mode === "entry" && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-600 text-sm">
                {loading ? "Loading..." : `${enrollments.length} students`}
                {selectedSubject && subjects.find(s => s.id === selectedSubject) &&
                  ` · ${subjects.find(s => s.id === selectedSubject).name}`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>CA max: 40</span>
              <span>Exam max: 60</span>
              <button onClick={handleSaveScores} disabled={saving || !enrollments.length}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold
                           px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm
                           disabled:opacity-40">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Scores"}
              </button>
            </div>
          </div>

          {!selectedSubject ? (
            <div className="text-center py-16 text-gray-400">
              <Edit3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Select a class and subject to enter scores</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Student</th>
                    <th className="table-header">Student ID</th>
                    <th className="table-header text-center">CA Score (0–40)</th>
                    <th className="table-header text-center">Exam Score (0–60)</th>
                    <th className="table-header text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? Array(6).fill(0).map((_, i) => (
                    <tr key={i}>{Array(5).fill(0).map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-8 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}</tr>
                  )) : enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-gray-400">
                        <p>No students enrolled in this class for the selected term</p>
                      </td>
                    </tr>
                  ) : enrollments.map(e => {
                    const ca   = scores[e.id]?.ca   ?? "";
                    const exam = scores[e.id]?.exam ?? "";
                    const total = ca !== "" && exam !== ""
                      ? (parseFloat(ca) + parseFloat(exam)).toFixed(1)
                      : "—";
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="table-cell font-semibold text-gray-900">{e.student_name}</td>
                        <td className="table-cell font-mono text-xs text-gray-500">{e.student_id_no}</td>
                        <td className="table-cell text-center">
                          <input
                            type="number" min="0" max="40" step="0.5"
                            value={ca}
                            onChange={ev => setScore(e.id, "ca", ev.target.value)}
                            placeholder="0–40"
                            className="w-24 px-3 py-1.5 text-center rounded-lg border border-gray-200
                                       focus:outline-none focus:ring-2 focus:ring-primary-400
                                       text-sm font-mono mx-auto block"
                          />
                        </td>
                        <td className="table-cell text-center">
                          <input
                            type="number" min="0" max="60" step="0.5"
                            value={exam}
                            onChange={ev => setScore(e.id, "exam", ev.target.value)}
                            placeholder="0–60"
                            className="w-24 px-3 py-1.5 text-center rounded-lg border border-gray-200
                                       focus:outline-none focus:ring-2 focus:ring-primary-400
                                       text-sm font-mono mx-auto block"
                          />
                        </td>
                        <td className="table-cell text-center font-bold font-mono text-gray-900">
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
