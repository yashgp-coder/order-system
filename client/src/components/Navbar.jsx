import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { totalItems, toggleCart } = useCart();
  const { connected } = useSocket();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    toast.success("Logged out successfully.");
    navigate("/login", { replace: true });
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>

        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <Link to="/menu" style={styles.logo}>
          <span style={styles.logoIcon}>🍔</span>
          <span style={styles.logoText}>OrderFlow</span>
          {/* Live connection dot */}
          <span style={{ ...styles.liveDot, background: connected ? "var(--color-success)" : "var(--color-error)" }}
            title={connected ? "Live updates on" : "Reconnecting..."} />
        </Link>

        {/* ── Nav Links ─────────────────────────────────────────────────────── */}
        <div style={styles.links}>
          <Link to="/menu" style={{ ...styles.link, ...(isActive("/menu") ? styles.linkActive : {}) }}>
            Menu
          </Link>
          <Link to="/orders" style={{ ...styles.link, ...(isActive("/orders") ? styles.linkActive : {}) }}>
            My Orders
          </Link>
          {isAdmin && (
            <>
              <Link to="/admin" style={{ ...styles.link, ...styles.linkAdmin, ...(isActive("/admin") && !isActive("/admin/pipeline") ? styles.linkAdminActive : {}) }}>
                🛡️ Dashboard
              </Link>
              <Link to="/admin/pipeline" style={{ ...styles.link, ...styles.linkAdmin, ...(isActive("/admin/pipeline") ? styles.linkAdminActive : {}) }}>
                🔄 Pipeline
              </Link>
            </>
          )}
        </div>

        {/* ── Right Side ────────────────────────────────────────────────────── */}
        <div style={styles.right}>
          {/* Hamburger — mobile only */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="nav-mobile-menu"
          style={styles.hamburger}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

        {/* Cart Button */}
          {!isAdmin && (
            <button onClick={toggleCart} style={styles.cartBtn} aria-label="Open cart">
              <span style={styles.cartIcon}>🛒</span>
              {totalItems > 0 && (
                <span style={styles.cartBadge}>{totalItems > 99 ? "99+" : totalItems}</span>
              )}
            </button>
          )}

          {/* User Dropdown */}
          <div style={styles.userWrap} ref={dropdownRef}>
            <button onClick={() => setMenuOpen((v) => !v)} style={styles.userBtn}>
              <span style={styles.userAvatar}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
              <span style={styles.userName}>{user?.name?.split(" ")[0]}</span>
              <span style={{ ...styles.chevron, transform: menuOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
            </button>

            {menuOpen && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <p style={styles.dropdownName}>{user?.name}</p>
                  <p style={styles.dropdownEmail}>{user?.email}</p>
                  <span style={styles.roleBadge}>{user?.role}</span>
                </div>
                <div style={styles.dropdownDivider} />
                <Link to="/orders" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                  📋 My Orders
                </Link>
                {isAdmin && (
                  <Link to="/admin" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                    🛡️ Admin Dashboard
                  </Link>
                )}
                <div style={styles.dropdownDivider} />
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    {/* Mobile dropdown */}
    {mobileOpen && (
      <div style={styles.mobileMenu}>
        <Link to="/menu"   style={styles.mobileLink} onClick={() => setMobileOpen(false)}>🍔 Menu</Link>
        <Link to="/orders" style={styles.mobileLink} onClick={() => setMobileOpen(false)}>📋 My Orders</Link>
        {isAdmin && <Link to="/admin"    style={styles.mobileLink} onClick={() => setMobileOpen(false)}>🛡️ Dashboard</Link>}
        {isAdmin && <Link to="/admin/pipeline" style={styles.mobileLink} onClick={() => setMobileOpen(false)}>🔄 Pipeline</Link>}
        <button onClick={() => { logout(); setMobileOpen(false); }} style={styles.mobileLinkBtn}>👋 Logout</button>
      </div>
    )}
    </nav>
  );
}

const styles = {
  nav: {
    position: "sticky", top: 0, zIndex: "var(--z-sticky)",
    background: "rgba(15,15,15,0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--color-border)",
  },
  inner: {
    maxWidth: "1200px", margin: "0 auto",
    padding: "0 24px", height: "64px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "24px",
  },
  logo: {
    display: "flex", alignItems: "center", gap: "8px",
    textDecoration: "none", flexShrink: 0,
  },
  logoIcon: { fontSize: "1.4rem" },
  logoText: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: "1.2rem", color: "var(--color-primary)",
  },
  liveDot: {
    width: "7px", height: "7px", borderRadius: "50%",
    display: "inline-block", marginLeft: "2px",
    transition: "background 300ms ease",
  },
  links: { display: "flex", alignItems: "center", gap: "4px", flex: 1 },
  link: {
    padding: "6px 14px", borderRadius: "var(--radius-md)",
    color: "var(--color-text-secondary)", fontWeight: 500,
    fontSize: "0.9rem", textDecoration: "none",
    transition: "all 150ms ease",
    fontFamily: "var(--font-body)",
  },
  linkActive: {
    background: "rgba(255,107,53,0.12)",
    color: "var(--color-primary)",
  },
  linkAdmin: { color: "var(--color-warning)" },
  linkAdminActive: {
    background: "rgba(245,200,66,0.12)",
    color: "var(--color-warning)",
  },
  right: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  cartBtn: {
    position: "relative", width: "42px", height: "42px",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
    transition: "all 150ms ease",
    fontSize: "1.1rem",
  },
  cartIcon: { fontSize: "1.1rem" },
  cartBadge: {
    position: "absolute", top: "-6px", right: "-6px",
    background: "var(--color-primary)", color: "#fff",
    fontSize: "0.65rem", fontWeight: 700,
    minWidth: "18px", height: "18px",
    borderRadius: "var(--radius-full)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 4px",
    border: "2px solid var(--color-bg)",
  },
  userWrap: { position: "relative" },
  userBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "6px 12px 6px 6px",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-full)",
    cursor: "pointer", transition: "all 150ms ease",
  },
  userAvatar: {
    width: "30px", height: "30px", borderRadius: "50%",
    background: "var(--color-primary)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "0.85rem",
  },
  userName: {
    color: "var(--color-text-primary)", fontSize: "0.875rem",
    fontWeight: 500, maxWidth: "80px",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  chevron: {
    color: "var(--color-text-muted)", fontSize: "0.7rem",
    transition: "transform 200ms ease", display: "inline-block",
  },
  dropdown: {
    position: "absolute", top: "calc(100% + 8px)", right: 0,
    minWidth: "220px",
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    overflow: "hidden",
    animation: "fadeIn 0.15s ease forwards",
    zIndex: "var(--z-dropdown)",
  },
  dropdownHeader: { padding: "14px 16px" },
  dropdownName: {
    color: "var(--color-text-primary)", fontWeight: 600,
    fontSize: "0.9rem", marginBottom: "2px",
  },
  dropdownEmail: { color: "var(--color-text-muted)", fontSize: "0.78rem", marginBottom: "8px" },
  roleBadge: {
    display: "inline-block", padding: "2px 8px",
    background: "rgba(255,107,53,0.15)", color: "var(--color-primary)",
    borderRadius: "var(--radius-full)", fontSize: "0.72rem",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
  },
  dropdownDivider: { height: "1px", background: "var(--color-border)" },
  dropdownItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "11px 16px", color: "var(--color-text-secondary)",
    textDecoration: "none", fontSize: "0.875rem",
    transition: "all 150ms ease",
    fontFamily: "var(--font-body)",
  },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: "10px",
    width: "100%", padding: "11px 16px",
    background: "none", border: "none",
    color: "var(--color-error)", fontSize: "0.875rem",
    cursor: "pointer", textAlign: "left",
    fontFamily: "var(--font-body)",
    transition: "all 150ms ease",
  },
};
