import { useEffect, useState, useRef } from "react";
import api, { studentsAPI, academicsAPI } from "../../services/api";
import { Search, UserPlus, Users, ChevronLeft, ChevronRight, Upload, Download, X, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

function Avatar({ name }) {
  const initials = name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
  const colors = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

const EMPTY_FORM = {
  first_name: "", last_name: "", student_id: "",
  gender: "", guardian_name: "", guardian_phone: "",
  password: "Student@1234", class_room: "", term: "",
};

export default function StudentsPage() {
  const [students, setStudents]     = useState([]);
  const [count, setCount]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [mode, setMode]             = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [classes, setClasses]       = useState([]);
  const [terms, setTerms]           = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [batchRows, setBatchRows]   = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [batchDone, setBatchDone]   = useState(false);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await studentsAPI.list({ page, search: search || undefined, page_size: 15 });
      setStudents(data.results || []);
      setCount(data.count || 0);
    } catch { toast.error("Failed to load students."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, search]);

  useEffect(() => {
    Promise.all([academicsAPI.classes(), academicsAPI.terms()])
      .then(([c, t]) => {
        const classList = c.data.results || [];
        const termList  = t.data.results || [];
        setClasses(classList);
        setTerms(termList);
        const current = termList.find(x => x.is_current);
        if (current) setForm(f => ({ ...f, term: current.id }));
      });
  }, []);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
const handleRemoveFromClass = async (studentId, className) => {
    if (!window.confirm(`Remove this student from ${className}? Their results will remain but they will no longer appear in class lists.`)) return;
    try {
      // Find and delete the active enrollment
      const { data } = await academicsAPI.enrollments({ student: studentId, page_size: 5 });
      const activeEnrollment = (data.results || []).find(e => e.is_active);
      if (!activeEnrollment) return toast.error("No active enrollment found.");
      await api.delete(`/api/academics/enrollments/${activeEnrollment.id}/`);
      toast.success("Student removed from class.");
      load();
    } catch {
      toast.error("Failed to remove student from class.");
    }
  };

  const handleDeactivateStudent = async (studentId, studentName) => {
    if (!window.confirm(`Deactivate ${studentName}? They will no longer be able to log in.`)) return;
    try {
      await studentsAPI.deactivate(studentId);
      toast.success(`${studentName} has been deactivated.`);
      load();
    } catch {
      toast.error("Failed to deactivate student.");
    }
  };
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const emailBase = form.student_id.toLowerCase().replace(/[^a-z0-9]/g, "");
      const payload = {
        ...form,
        email: `${emailBase}@student.school.local`,
        confirm_password: form.password,
      };
      const { data: student } = await studentsAPI.create(payload);
      if (form.class_room && form.term) {
        try {
          await academicsAPI.enroll({
            student: student.id,
            class_room: form.class_room,
            term: form.term,
          });
        } catch {
          toast("Student created but enrollment failed.", { icon: "⚠️" });
        }
      }
      toast.success(`${form.first_name} ${form.last_name} registered and enrolled!`);
      setMode(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      const errors = err.response?.data;
      const msg = errors ? Object.values(errors).flat().join(" ") : "Failed to create student.";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = evt.target.result.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
        return {
          first_name:     obj["first_name"]    || obj["firstname"]    || "",
          last_name:      obj["last_name"]     || obj["lastname"]     || "",
          student_id:     obj["student_id"]    || obj["studentid"]    || "",
          gender:         obj["gender"]        || "",
          guardian_name:  obj["guardian_name"] || obj["guardianname"] || "",
          guardian_phone: obj["guardian_phone"]|| obj["guardianphone"]|| "",
          password:       obj["password"]      || "Student@1234",
        };
      });
      setBatchRows(rows);
      setBatchResults([]);
      setBatchDone(false);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = "first_name,last_name,student_id,gender,guardian_name,guardian_phone";
    const sample  = "Chidi,Okonkwo,GFS/2024/001,M,Mr Okonkwo,08098765432";
    const blob = new Blob([headers + "\n" + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
  };

  const handleBatchSubmit = async () => {
    if (!batchRows.length) return toast.error("No rows to upload.");
    setSubmitting(true);
    const results = [];
    for (const row of batchRows) {
      try {
        const emailBase = (row.student_id || row.first_name)
          .toLowerCase().replace(/[^a-z0-9]/g, "");
        const payload = {
          ...row,
          email: `${emailBase}@student.school.local`,
          confirm_password: row.password || "Student@1234",
        };
        await studentsAPI.create(payload);
        results.push({ name: `${row.first_name} ${row.last_name}`, success: true });
      } catch (err) {
        const msg = err.response?.data
          ? Object.values(err.response.data).flat().join(" ")
          : "Error";
        results.push({ name: `${row.first_name} ${row.last_name}`, success: false, error: msg });
      }
    }
    setBatchResults(results);
    setBatchDone(true);
    setSubmitting(false);
    const ok = results.filter(r => r.success).length;
    toast.success(`${ok} of ${results.length} students created.`);
    load();
  };

  const totalPages = Math.ceil(count / 15);

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-0.5">{count} students enrolled</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode(mode === "batch" ? null : "batch");
              setBatchRows([]); setBatchResults([]); setBatchDone(false);
            }}
            className="btn-secondary flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> Batch Upload
          </button>
          <button
            onClick={() => setMode(mode === "single" ? null : "single")}
            className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Single student form */}
      {mode === "single" && (
        <div className="card border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">New Student Registration</h3>
            <button onClick={() => setMode(null)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSingleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key:"first_name",     label:"First Name",       required:true },
              { key:"last_name",      label:"Last Name",        required:true },
              { key:"student_id", label:"Student ID (auto-generated, editable)", required:true, placeholder:"Select class first" },
              { key:"guardian_name",  label:"Parent/Guardian Name" },
              { key:"guardian_phone", label:"Parent/Guardian Phone" },
              { key:"password",       label:"Default Password", required:true },
            ].map(({ key, label, required, type="text", placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={type}
                  value={form[key] || ""}
                  placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input text-sm"
                  required={required}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({...f, gender: e.target.value}))}
                className="input text-sm">
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
           <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={form.class_room}
                onChange={e => {
                  const selectedClass = classes.find(c => c.id === e.target.value);
                  const year = new Date().getFullYear();
                  const classCode = selectedClass?.name || "SCH";
                  // Count existing students to generate next ID
                  const nextNum = String(count + 1).padStart(3, "0");
                  const autoId = `${classCode}/${year}/${nextNum}`;
                  setForm(f => ({
                    ...f,
                    class_room: e.target.value,
                    student_id: autoId,
                  }));
                }}
                className="input text-sm"
                required>
                <option value="">Select class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Term <span className="text-red-500">*</span>
              </label>
              <select
                value={form.term}
                onChange={e => setForm(f => ({...f, term: e.target.value}))}
                className="input text-sm"
                required>
                <option value="">Select term...</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.session_name} — {t.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setMode(null)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary text-sm">
                {submitting ? "Registering..." : "Register & Enroll Student"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch upload form */}
      {mode === "batch" && (
        <div className="card border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Batch Student Upload</h3>
            <button onClick={() => setMode(null)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex gap-3 mb-4">
            <button onClick={downloadTemplate}
              className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Download CSV Template
            </button>
            <button onClick={() => fileRef.current.click()}
              className="btn-primary flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" /> Choose CSV File
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Download the template, fill it in Excel or Google Sheets, save as CSV, then upload.
            Default password will be <code className="bg-gray-100 px-1 rounded">Student@1234</code> unless specified.
          </p>

          {batchRows.length > 0 && !batchDone && (
            <>
              <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                  Preview — {batchRows.length} students found in CSV
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["First Name","Last Name","Student ID","Gender"].map(h => (
                          <th key={h} className="table-header">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="table-cell">{r.first_name}</td>
                          <td className="table-cell">{r.last_name}</td>
                          <td className="table-cell font-mono text-xs">{r.student_id}</td>
                          <td className="table-cell">{r.gender === "M" ? "Male" : r.gender === "F" ? "Female" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleBatchSubmit} disabled={submitting}
                  className="btn-primary flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {submitting ? "Creating students..." : `Upload ${batchRows.length} Students`}
                </button>
              </div>
            </>
          )}

          {batchDone && batchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">Upload Results:</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {batchResults.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg text-sm
                    ${r.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {r.success
                      ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    }
                    <span className="font-medium">{r.name}</span>
                    {!r.success && <span className="text-xs ml-1 opacity-75">— {r.error}</span>}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setBatchRows([]); setBatchResults([]);
                  setBatchDone(false); fileRef.current.value = "";
                }}
                className="btn-secondary text-sm mt-2">
                Upload More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, ID, or email..."
            className="input pl-10 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Student ID</th>
                <th className="table-header">Class</th>
                <th className="table-header">Gender</th>
                <th className="table-header">Status</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array(8).fill(0).map((_, i) => (
                <tr key={i}>{Array(5).fill(0).map((_, j) => (
                  <td key={j} className="table-cell">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}</tr>
              )) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No students found</p>
                  </td>
                </tr>
              ) : students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.full_name} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.student_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs text-gray-600">{s.student_id}</td>
                  <td className="table-cell">
                    {s.current_class_name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-cell">
                    {s.gender === "M" ? "Male" : s.gender === "F" ? "Female" : "—"}
                  </td>
                 <td className="table-cell">
                    <span className={s.is_active ? "badge-green" : "badge-red"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2">
                      {s.current_class_name && (
                        <button
                          onClick={() => handleRemoveFromClass(s.id, s.current_class_name)}
                          className="text-xs text-amber-500 hover:text-amber-700
                                     hover:bg-amber-50 px-2 py-1 rounded-lg transition-all
                                     whitespace-nowrap">
                          Remove from class
                        </button>
                      )}
                      <button
                        onClick={() => handleDeactivateStudent(s.id, s.full_name)}
                        className="text-xs text-red-400 hover:text-red-600
                                   hover:bg-red-50 px-2 py-1 rounded-lg transition-all">
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages} · {count} total</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
                className="btn-secondary p-2 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page === totalPages}
                className="btn-secondary p-2 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}