import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, name: form.name };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      login(data.token, data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/career");
    } catch (e) {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div style={{
        width: "100%", maxWidth: 440, padding: "0 24px"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 12, padding: "8px 16px", marginBottom: 16
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>PRI</span>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </div>
          <div style={{ color: "#64748b", fontSize: 14 }}>
            {mode === "login" ? "Sign in to your Career Intelligence account" : "Start your personalized career analysis"}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#111118", border: "1px solid #1e1e2e",
          borderRadius: 20, padding: 32
        }}>
          {/* Mode toggle */}
          <div style={{
            display: "flex", background: "#0d0d15", borderRadius: 10,
            padding: 4, marginBottom: 24
          }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                background: mode === m ? "#6366f1" : "transparent",
                color: mode === m ? "#fff" : "#64748b",
                fontWeight: 600, fontSize: 14, cursor: "pointer",
                transition: "all 0.2s"
              }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Fields */}
          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Full Name</label>
              <input
                value={form.name} onChange={set("name")} onKeyDown={handleKey}
                placeholder="Vikash Kumar"
                style={{
                  width: "100%", padding: "11px 14px", background: "#0d0d15",
                  border: "1px solid #1e1e2e", borderRadius: 10, color: "#e2e8f0",
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s"
                }}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#1e1e2e"}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Email</label>
            <input
              type="email" value={form.email} onChange={set("email")} onKeyDown={handleKey}
              placeholder="you@example.com"
              style={{
                width: "100%", padding: "11px 14px", background: "#0d0d15",
                border: "1px solid #1e1e2e", borderRadius: 10, color: "#e2e8f0",
                fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#1e1e2e"}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Password</label>
            <input
              type="password" value={form.password} onChange={set("password")} onKeyDown={handleKey}
              placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
              style={{
                width: "100%", padding: "11px 14px", background: "#0d0d15",
                border: "1px solid #1e1e2e", borderRadius: 10, color: "#e2e8f0",
                fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#1e1e2e"}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "10px 14px", color: "#f87171",
              fontSize: 13, marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: loading ? "#374151" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s"
          }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, color: "#475569", fontSize: 13 }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {mode === "login" ? "Register here" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
