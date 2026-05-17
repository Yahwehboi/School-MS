import { useEffect, useState } from "react";
import { academicsAPI, resultsAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ClipboardList, Save, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function TeacherResults() {
  const { user } = useAuth();
  const [subjects, setSubjects]           = useState([]);
  const [terms, setTerms]                 = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm]   = useState("");
  const [enrollments, setEnrollments]     = useState([]);
  const [scores, setScores]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);

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
        // Pre-fill existing scores
        return resultsAPI.list({ term: selectedTerm, subject: selectedSubject, page_size: 60 });
      })
      .then(r => {
        const existing = {};
        (r.data.results || []).forEach(res => {
          existing[res.enrollment] = { ca: res.ca_score ?? "", exam: res.exam_score ?? "" };
        });
        setScores(existing);
      })
      .catch(() => toast.error("Failed to load class."))
      .finally(() => setLoading(false));
  }, [selectedSubject, selectedTerm]);

  const setScore = (enrollId, field, val) => {
    setScores(prev => ({
      ...prev,
      [enrollId]: { ...prev[enrollId], [field]: val }
    }));
  };

  const handleSave = async () => {
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
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save scores.");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results Entry</h1>
          <p className="text-gray-500 text-sm mt-0.5">Enter CA and exam scores for your subjects</p>
        </div>
        <button onClick={handleSave} disabled={saving || !enrollments.length}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold
                     px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm
                     disabled:opacity-40">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Scores"}
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">My Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input text-sm">
              <option value="">Select subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.class_name || "—"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Term</label>
            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input text-sm">
              {terms.map(t => <option key={t.id} value={t.id}>{t.session_name} — {t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">
              {loading ? "Loading..." : `${enrollments.length} students`}
            </span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            <span>CA max: 40</span>
            <span>Exam max: 60</span>
          </div>
        </div>
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
                  <td key={j} className="table-cell"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Select a subject to see students</p>
                  </td>
                </tr>
              ) : enrollments.map(e => {
                const ca   = scores[e.id]?.ca   ?? "";
                const exam = scores[e.id]?.exam ?? "";
                const total = (ca !== "" && exam !== "")
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
                                   focus:outline-none focus:ring-2 focus:ring-emerald-400
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
                                   focus:outline-none focus:ring-2 focus:ring-emerald-400
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
      </div>
    </div>
  );
}
