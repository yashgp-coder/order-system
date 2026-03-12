import axios from "axios";

// ── Base Instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "/api",
  timeout: 15000, // 15 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request Interceptor: Attach JWT token ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
      // Token expired or invalid — clear local storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")) {
        window.location.href = "/login";
      }
    }

    // Normalize error message
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
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

// ── Menu Endpoints ────────────────────────────────────────────────────────────
export const menuAPI = {
  getAll: (category) =>
    api.get("/menu", { params: category ? { category } : {} }),
  getById: (id) => api.get(`/menu/${id}`),
};

// ── Order Endpoints ───────────────────────────────────────────────────────────
export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: () => api.get("/orders/my"),
  getById: (id) => api.get(`/orders/${id}`),
  getQueuePosition: (id) => api.get(`/orders/${id}/queue`),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel`),
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
  getByItems:  (itemIds) => api.get("/recommendations",          { params: { itemIds: itemIds.join(",") } }),
  getPersonal: ()        => api.get("/recommendations/personal"),
};

export default api;
