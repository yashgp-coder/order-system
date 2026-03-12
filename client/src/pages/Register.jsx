import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Name is required.";
    else if (formData.name.trim().length < 2) errs.name = "Name must be at least 2 characters.";
    if (!formData.email.trim()) errs.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = "Enter a valid email.";
    if (!formData.password) errs.password = "Password is required.";
    else if (formData.password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (!formData.confirmPassword) errs.confirmPassword = "Please confirm your password.";
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = "Passwords do not match.";
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
      const user = await register(formData.name.trim(), formData.email, formData.password);
      toast.success(`Account created! Welcome, ${user.name.split(" ")[0]}! 🎉`);
      navigate("/menu", { replace: true });
    } catch (err) {
      const msg = err?.message || "Registration failed.";
      toast.error(msg);
      if (msg.toLowerCase().includes("use")) setErrors({ email: "This email is already registered." });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: "", color: "transparent" };
    let score = 0;
    if (pwd.length >= 6)  score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: "Weak",   color: "var(--color-error)"   };
    if (score <= 3) return { level: 2, label: "Fair",   color: "var(--color-warning)"  };
    return              { level: 3, label: "Strong", color: "var(--color-success)"  };
  };
  const strength = getPasswordStrength(formData.password);

  return (
    <div style={styles.page}>
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🍔</span>
          <span style={styles.logoText}>OrderFlow</span>
        </div>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Start ordering your favourite food</p>

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {/* Name */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full name</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>👤</span>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder="John Doe" autoFocus
                style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }} />
            </div>
            {errors.name && <span style={styles.errorText}>{errors.name}</span>}
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email address</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>✉️</span>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="you@example.com"
                style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }} />
            </div>
            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔒</span>
              <input type={showPassword ? "text" : "password"} name="password" value={formData.password}
                onChange={handleChange} placeholder="Min. 6 characters"
                style={{ ...styles.input, ...(errors.password ? styles.inputError : {}) }} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={styles.eyeBtn} tabIndex={-1}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && <span style={styles.errorText}>{errors.password}</span>}
            {formData.password && (
              <div style={styles.strengthWrap}>
                <div style={styles.strengthBarTrack}>
                  {[1,2,3].map((i) => (
                    <div key={i} style={{ ...styles.strengthBarSegment, background: i <= strength.level ? strength.color : "var(--color-border)" }} />
                  ))}
                </div>
                <span style={{ ...styles.strengthLabel, color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Confirm password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔑</span>
              <input type={showPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} placeholder="Repeat your password"
                style={{ ...styles.input, ...(errors.confirmPassword ? styles.inputError : {}) }} />
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <span style={styles.matchIcon}>✅</span>
              )}
            </div>
            {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
          </div>

          <button type="submit" disabled={loading}
            style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnLoading : {}) }}>
            {loading ? <span style={styles.spinnerRow}><span style={styles.spinner} />Creating account...</span> : "Create Account →"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account? <Link to="/login" style={styles.switchLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: "24px", position: "relative", overflow: "hidden" },
  bgBlob1: { position: "absolute", top: "-200px", left: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,53,0.07) 0%, transparent 70%)", pointerEvents: "none" },
  bgBlob2: { position: "absolute", bottom: "-200px", right: "-200px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(76,175,130,0.06) 0%, transparent 70%)", pointerEvents: "none" },
  card: { width: "100%", maxWidth: "440px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "40px", boxShadow: "var(--shadow-lg)", animation: "fadeIn 0.4s ease forwards" },
  logoRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" },
  logoIcon: { fontSize: "1.8rem" },
  logoText: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem", color: "var(--color-primary)" },
  title: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.75rem", color: "var(--color-text-primary)", marginBottom: "6px" },
  subtitle: { color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "24px" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: "14px", fontSize: "0.95rem", pointerEvents: "none", zIndex: 1 },
  input: { paddingLeft: "40px", paddingRight: "16px", height: "48px", fontSize: "0.95rem", background: "var(--color-bg-input)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", width: "100%", outline: "none", transition: "border-color 150ms ease" },
  inputError: { borderColor: "var(--color-error)", boxShadow: "0 0 0 3px rgba(229,80,74,0.15)" },
  eyeBtn: { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", padding: "4px" },
  matchIcon: { position: "absolute", right: "12px", fontSize: "1rem" },
  errorText: { fontSize: "0.8rem", color: "var(--color-error)" },
  strengthWrap: { display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" },
  strengthBarTrack: { display: "flex", gap: "4px", flex: 1 },
  strengthBarSegment: { height: "4px", flex: 1, borderRadius: "2px", transition: "background 300ms ease" },
  strengthLabel: { fontSize: "0.75rem", fontWeight: 600, minWidth: "42px" },
  submitBtn: { marginTop: "8px", height: "50px", background: "var(--color-primary)", color: "#fff", fontSize: "1rem", fontWeight: 700, border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-display)", transition: "all 150ms ease" },
  submitBtnLoading: { opacity: 0.7, cursor: "not-allowed" },
  spinnerRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  spinner: { width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" },
  switchText: { textAlign: "center", marginTop: "20px", fontSize: "0.875rem", color: "var(--color-text-muted)" },
  switchLink: { color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" },
};