import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) errs.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = "Enter a valid email.";
    if (!formData.password) errs.password = "Password is required.";
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}! 🍔`);
      navigate(user.role === "admin" ? "/admin" : "/menu", { replace: true });
    } catch (err) {
      const msg = err?.message || "Login failed. Please try again.";
      toast.error(msg);
      if (msg.toLowerCase().includes("password")) setErrors({ password: "Incorrect password." });
      else if (msg.toLowerCase().includes("invalid")) setErrors({ email: "No account found with this email." });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const creds = role === "admin"
      ? { email: "admin@orderflow.com", password: "admin123" }
      : { email: "user@orderflow.com",  password: "user123"  };
    setFormData(creds);
    setErrors({});
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🍔</span>
          <span style={styles.logoText}>OrderFlow</span>
        </div>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue ordering</p>

        <div style={styles.demoRow}>
          <span style={styles.demoLabel}>Try demo:</span>
          <button style={styles.demoBtn} onClick={() => fillDemo("user")} type="button">👤 User</button>
          <button style={{ ...styles.demoBtn, ...styles.demoBtnAdmin }} onClick={() => fillDemo("admin")} type="button">🛡️ Admin</button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email address</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>✉️</span>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="you@example.com" autoFocus
                style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }} />
            </div>
            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔒</span>
              <input type={showPassword ? "text" : "password"} name="password" value={formData.password}
                onChange={handleChange} placeholder="Enter your password"
                style={{ ...styles.input, ...(errors.password ? styles.inputError : {}) }} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={styles.eyeBtn} tabIndex={-1}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && <span style={styles.errorText}>{errors.password}</span>}
          </div>

          <button type="submit" disabled={loading}
            style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnLoading : {}) }}>
            {loading ? <span style={styles.spinnerRow}><span style={styles.spinner} />Signing in...</span> : "Sign In →"}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account? <Link to="/register" style={styles.switchLink}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: "24px", position: "relative", overflow: "hidden" },
  bgBlob1: { position: "absolute", top: "-200px", right: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)", pointerEvents: "none" },
  bgBlob2: { position: "absolute", bottom: "-200px", left: "-200px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,53,0.05) 0%, transparent 70%)", pointerEvents: "none" },
  card: { width: "100%", maxWidth: "420px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "40px", boxShadow: "var(--shadow-lg)", animation: "fadeIn 0.4s ease forwards" },
  logoRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" },
  logoIcon: { fontSize: "1.8rem" },
  logoText: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "var(--color-primary)" },
  title: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.75rem", color: "var(--color-text-primary)", marginBottom: "6px" },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "24px" },
  demoRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", padding: "12px 14px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" },
  demoLabel: { color: "var(--color-text-muted)", fontSize: "0.8rem", marginRight: "4px" },
  demoBtn: { padding: "5px 12px", fontSize: "0.8rem", fontWeight: 600, background: "var(--color-bg-input)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer" },
  demoBtnAdmin: { color: "var(--color-primary)", borderColor: "rgba(255,107,53,0.3)" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: "14px", fontSize: "0.95rem", pointerEvents: "none", zIndex: 1 },
  input: { paddingLeft: "40px", paddingRight: "16px", height: "48px", fontSize: "0.95rem", background: "var(--color-bg-input)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", width: "100%", outline: "none", transition: "border-color 150ms ease" },
  inputError: { borderColor: "var(--color-error)", boxShadow: "0 0 0 3px rgba(229,80,74,0.15)" },
  eyeBtn: { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", padding: "4px" },
  errorText: { fontSize: "0.8rem", color: "var(--color-error)" },
  submitBtn: { marginTop: "8px", height: "50px", background: "var(--color-primary)", color: "#fff", fontSize: "1rem", fontWeight: 700, border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-display)", transition: "all 150ms ease" },
  submitBtnLoading: { opacity: 0.7, cursor: "not-allowed" },
  spinnerRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  spinner: { width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" },
  switchText: { textAlign: "center", marginTop: "20px", fontSize: "0.875rem", color: "var(--color-text-muted)" },
  switchLink: { color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" },
};