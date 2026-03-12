import axios from "axios";

// ── Base URL ──────────────────────────────────────────────────────────────────
// In development: Vite proxy rewrites /api → localhost:5000 (no env var needed)
// In production:  VITE_API_URL must be set to your Render server URL at build time
const BASE_URL =
  import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL + "/api"
    : "https://order-system-sand.vercel.app/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Request Interceptor: Attach JWT token ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle auth errors globally ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    if (response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")) {
        window.location.href = "/login";
      }
    }

    const message =
      response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    return Promise.reject({ ...error, message });
  }
);

// ── Auth Endpoints ────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login:    (data) => api.post("/auth/login", data),
  getMe:    ()     => api.get("/auth/me"),
};

// ── Menu Endpoints ────────────────────────────────────────────────────────────
export const menuAPI = {
  getAll:  (params) => api.get("/menu", { params }),
  getById: (id)     => api.get(`/menu/${id}`),
};

// ── Order Endpoints ───────────────────────────────────────────────────────────
export const orderAPI = {
  create:           (data) => api.post("/orders", data),
  getMyOrders:      ()     => api.get("/orders/my"),
  getById:          (id)   => api.get(`/orders/${id}`),
  cancelOrder:      (id)   => api.patch(`/orders/${id}/cancel`),
};

// ── Admin Endpoints ───────────────────────────────────────────────────────────
export const adminAPI = {
  getStats:          ()           => api.get("/admin/stats"),
  getAllOrders:       (params)     => api.get("/admin/orders", { params }),
  updateOrderStatus: (id, status) => api.patch(`/admin/orders/${id}/status`, { status }),
  getQueue:          ()           => api.get("/admin/queue"),
};

// ── Recommendation Endpoints ──────────────────────────────────────────────────
export const recommendAPI = {
  getPersonal: ()        => api.get("/recommendations/personal"),
  getSimilar:  (itemIds) => api.get("/recommendations/similar", { params: { itemIds: itemIds.join(",") } }),
  getTrending: ()        => api.get("/recommendations/trending"),
};

export default api;
