import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const C = { card: "#111118", border: "#1e1e2e", text: "#e2e8f0", muted: "#64748b", purple: "#6366f1", green: "#10b981", red: "#ef4444", yellow: "#f59e0b" };

const Field = ({ label, placeholder, value, onChange, button, onButton, loading, status }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</label>
    <div style={{ display: "flex", gap: 8 }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
        flex: 1, padding: "9px 12px", background: "#0d0d15", border: `1px solid ${C.border}`,
        borderRadius: 8, color: C.text, fontSize: 13, outline: "none"
      }} />
      <button onClick={onButton} disabled={loading || !value} style={{
        padding: "9px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 12,
        background: loading ? "#1e1e2e" : C.purple, color: "#fff", cursor: loading || !value ? "not-allowed" : "pointer", whiteSpace: "nowrap"
      }}>
        {loading ? "..." : button}
      </button>
    </div>
    {status && <div style={{ fontSize: 12, marginTop: 6, color: status.ok ? C.green : C.red }}>{status.msg}</div>}
  </div>
);

export default function ProfileSetupPanel({ onUpdate }) {
  const { authFetch, token } = useAuth();
  const [github, setGithub] = useState("");
  const [leetcode, setLeetcode] = useState("");
  const [ghStatus, setGhStatus] = useState(null);
  const [lcStatus, setLcStatus] = useState(null);
  const [resumeStatus, setResumeStatus] = useState(null);
  const [ghLoading, setGhLoading] = useState(false);
  const [lcLoading, setLcLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const connectGithub = async () => {
    setGhLoading(true); setGhStatus(null);
    try {
      const res = await authFetch("/api/profile/github", { method: "POST", body: JSON.stringify({ username: github }) });
      const data = await res.json();
      if (!res.ok) { setGhStatus({ ok: false, msg: data.error }); return; }
      setGhStatus({ ok: true, msg: `✓ ${data.public_repos} repos · ${data.topLanguages?.join(", ")}` });
      onUpdate?.();
    } catch { setGhStatus({ ok: false, msg: "Network error" }); }
    finally { setGhLoading(false); }
  };

  const connectLeetcode = async () => {
    setLcLoading(true); setLcStatus(null);
    try {
      const res = await authFetch("/api/profile/leetcode", { method: "POST", body: JSON.stringify({ username: leetcode }) });
      const data = await res.json();
      if (!res.ok) { setLcStatus({ ok: false, msg: data.error }); return; }
      setLcStatus({ ok: true, msg: `✓ ${data.total_solved} solved (E:${data.easy_solved} M:${data.medium_solved} H:${data.hard_solved})` });
      onUpdate?.();
    } catch { setLcStatus({ ok: false, msg: "Network error" }); }
    finally { setLcLoading(false); }
  };

  const uploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setResumeStatus({ ok: false, msg: "Only PDF files are accepted" }); return; }
    if (file.size > 5 * 1024 * 1024) { setResumeStatus({ ok: false, msg: "File too large (max 5MB)" }); return; }
    setResumeLoading(true); setResumeStatus(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) { setResumeStatus({ ok: false, msg: data.error }); return; }
      setResumeStatus({ ok: true, msg: `✓ Uploaded — ${data.textLength} characters extracted` });
      onUpdate?.();
    } catch { setResumeStatus({ ok: false, msg: "Upload failed" }); }
    finally { setResumeLoading(false); }
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "14px 18px", background: "none", border: "none",
        display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer"
      }}>
        <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>⚡ Enrich Profile <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>— GitHub, LeetCode, Resume</span></span>
        <span style={{ color: C.muted, fontSize: 12 }}>{open ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
            These are optional but significantly improve your analysis accuracy. Connect any or all.
          </div>

          <Field label="GitHub Username" placeholder="e.g. vikashkumar" value={github}
            onChange={setGithub} button="Connect" onButton={connectGithub} loading={ghLoading} status={ghStatus} />

          <Field label="LeetCode Username" placeholder="e.g. vikash_lc" value={leetcode}
            onChange={setLeetcode} button="Connect" onButton={connectLeetcode} loading={lcLoading} status={lcStatus} />

          {/* Resume Upload */}
          <div>
            <label style={{ display: "block", color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Resume (PDF)</label>
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px dashed ${C.border}`, borderRadius: 10, padding: "20px",
              cursor: resumeLoading ? "not-allowed" : "pointer", transition: "border-color 0.2s",
              flexDirection: "column", gap: 6
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.purple}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <span style={{ fontSize: 24 }}>📄</span>
              <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{resumeLoading ? "Uploading..." : "Click to upload PDF"}</span>
              <span style={{ color: C.muted, fontSize: 11 }}>Max 5MB · PDF only · AI will extract and rank it</span>
              <input type="file" accept=".pdf" onChange={uploadResume} style={{ display: "none" }} disabled={resumeLoading} />
            </label>
            {resumeStatus && <div style={{ fontSize: 12, marginTop: 6, color: resumeStatus.ok ? C.green : C.red }}>{resumeStatus.msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
