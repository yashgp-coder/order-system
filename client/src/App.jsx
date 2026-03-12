import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { SocketProvider } from "./context/SocketContext";

import Navbar      from "./components/Navbar";
import CartDrawer  from "./components/CartDrawer";
import Login       from "./pages/Login";
import Register    from "./pages/Register";
import Menu        from "./pages/Menu";
import Cart          from "./pages/Cart";
import Orders        from "./pages/Orders";
import OrderTracking from "./pages/OrderTracking";
import LiveNotifications from "./components/LiveNotifications";
import AdminDashboard from "./pages/AdminDashboard";
import QueueVisualization from "./components/QueueVisualization";

// ── Placeholder for pages built in later stages ───────────────────────────────
const PlaceholderPage = ({ title }) => (
  <div style={{
    minHeight: "calc(100vh - 64px)",
    display: "flex", alignItems: "center",
    justifyContent: "center", flexDirection: "column", gap: "16px",
    background: "var(--color-bg)", color: "var(--color-text-primary)",
    fontFamily: "var(--font-display)",
  }}>
    <div style={{ fontSize: "3rem" }}>🍔</div>
    <h1 style={{ fontSize: "2rem" }}>{title}</h1>
    <p style={{ color: "var(--color-text-secondary)" }}>Coming in the next stage...</p>
  </div>
);

// ── Loading Screen ────────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "var(--color-bg)", gap: "12px",
  }}>
    <div style={{
      width: "40px", height: "40px",
      border: "3px solid var(--color-border)",
      borderTopColor: "var(--color-primary)",
      borderRadius: "50%", animation: "spin 0.8s linear infinite",
    }} />
    <span style={{
      fontFamily: "var(--font-display)",
      color: "var(--color-text-secondary)", fontSize: "1.1rem",
    }}>Loading OrderFlow...</span>
  </div>
);

// ── Route Guards ──────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/menu" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/menu" replace />;
  return children;
};

// ── Layout wrapper — renders Navbar + CartDrawer for authenticated pages ──────
const AppLayout = ({ children }) => (
  <>
    <Navbar />
    <CartDrawer />
    <LiveNotifications />   {/* ← add this line */}
    {children}
  </>
);

// ── Router ────────────────────────────────────────────────────────────────────
const AppRouter = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/menu" replace />} />

    {/* Auth — Stage 3 ✅ */}
    <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
    <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

    {/* Menu — Stage 4 ✅ */}
    <Route path="/menu" element={
      <ProtectedRoute>
        <AppLayout><Menu /></AppLayout>
      </ProtectedRoute>
    } />

    {/* Cart + Orders — Stage 5 */}
        <Route path="/cart" element={
      <ProtectedRoute><AppLayout><Cart /></AppLayout></ProtectedRoute>
    } />
    <Route path="/orders" element={
      <ProtectedRoute><AppLayout><Orders /></AppLayout></ProtectedRoute>
    } />
    <Route path="/orders/:id" element={
      <ProtectedRoute><AppLayout><OrderTracking /></AppLayout></ProtectedRoute>
    } />

    {/* Admin — Stage 7 ✅ */}
      <Route path="/admin" element={
        <AdminRoute><AppLayout><AdminDashboard /></AppLayout></AdminRoute>
    } />
    <Route path="/admin/pipeline" element={
        <AdminRoute>
          <AppLayout>
            <div style={{ padding: "32px 24px 80px", maxWidth: "1400px", margin: "0 auto" }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem",
                color: "var(--color-text-primary)", marginBottom: "24px" }}>Live Pipeline</h1>
              <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)", padding: "24px" }}>
                <QueueVisualization />
              </div>
            </div>
          </AppLayout>
        </AdminRoute>
      } />

    <Route path="*" element={<PlaceholderPage title="404 — Page Not Found" />} />
  </Routes>
);

// ── Root App ──────────────────────────────────────────────────────────────────
const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <SocketProvider>
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "var(--color-bg-card)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontFamily: "var(--font-body)",
                fontSize: "0.9rem",
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "var(--color-success)", secondary: "var(--color-bg-card)" } },
              error:   { iconTheme: { primary: "var(--color-error)",   secondary: "var(--color-bg-card)" } },
            }}
          />
        </SocketProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
