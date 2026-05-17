import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";
const SUBDOMAIN = "demo"; // Change this per school

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "X-School-Subdomain": SUBDOMAIN,
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh });
        localStorage.setItem("access_token", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    api.post("/api/auth/login/", { email, password }),
  logout: (refresh) =>
    api.post("/api/auth/logout/", { refresh }),
  me: () => api.get("/api/auth/me/"),
};

// ── School ────────────────────────────────────────────
export const schoolAPI = {
  info: () => api.get(`/api/core/school-info/?subdomain=${SUBDOMAIN}`),
};

// ── Students ──────────────────────────────────────────
export const studentsAPI = {
  list: (params) => api.get("/api/students/", { params }),
  search: (query) => api.get("/api/students/", { params: { search: query, page_size: 10 } }),
  get: (id) => api.get(`/api/students/${id}/`),
  create: (data) => api.post("/api/students/", data),
  update: (id, data) => api.patch(`/api/students/${id}/`, data),
  deactivate: (id) => api.delete(`/api/students/${id}/`),
};

// ── Academics ─────────────────────────────────────────
export const academicsAPI = {
  sessions: () => api.get("/api/academics/sessions/"),
  terms: (params) => api.get("/api/academics/terms/", { params }),
  classes: () => api.get("/api/academics/classes/"),
  subjects: (params) => api.get("/api/academics/subjects/", { params }),
  enrollments: (params) => api.get("/api/academics/enrollments/", { params }),
  enroll: (data) => api.post("/api/academics/enrollments/", data),
};

// ── Results ───────────────────────────────────────────
export const resultsAPI = {
  list: (params) => api.get("/api/results/", { params }),
  bulkEntry: (data) => api.post("/api/results/bulk-entry/", data),
  computePositions: (data) => api.post("/api/results/compute-positions/", data),
  publish: (data) => api.post("/api/results/publish/", data),
  reportCard: (params) => api.get("/api/results/report-card/", { params }),
  gradeScale: () => api.get("/api/results/grade-scale/"),
  setupGradeScale: () => api.post("/api/results/grade-scale/setup-default/"),
};

// ── Attendance ────────────────────────────────────────
export const attendanceAPI = {
  list: (params) => api.get("/api/attendance/", { params }),
  bulkMark: (data) => api.post("/api/attendance/bulk-mark/", data),
  summary: (params) => api.get("/api/attendance/summary/", { params }),
};

// ── Finance ───────────────────────────────────────────
export const financeAPI = {
  payments: (params) => api.get("/api/finance/payments/", { params }),
  studentStatus: (params) => api.get("/api/finance/student-status/", { params }),
  recordPayment: (data) => api.post("/api/finance/payments/", data),
  feeStructures: (params) => api.get("/api/finance/fee-structures/", { params }),
};

// ── Comms ─────────────────────────────────────────────
export const commsAPI = {
  announcements: () => api.get("/api/comms/announcements/"),
  createAnnouncement: (data) => api.post("/api/comms/announcements/", data),
};

// ── Users ─────────────────────────────────────────────
export const usersAPI = {
  list: (params) => api.get("/api/auth/users/", { params }),
  create: (data) => api.post("/api/auth/users/", data),
  deactivate: (id) => api.delete(`/api/auth/users/${id}/`),
};
export default api;
