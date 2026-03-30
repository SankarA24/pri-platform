import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const C = {
  bg: "#0a0a0f", card: "#111118", border: "#1e1e2e",
  text: "#e2e8f0", muted: "#64748b", purple: "#6366f1",
  green: "#10b981", yellow: "#f59e0b", red: "#ef4444", blue: "#3b82f6"
};

const Badge = ({ level }) => {
  const map = { Strong: [C.green, "#052e16"], Developing: [C.yellow, "#1c1209"], "Early Stage": [C.red, "#1f0909"] };
  const [fg, bg] = map[level] || [C.muted, C.card];
  return <span style={{ background: bg, color: fg, border: `1px solid ${fg}40`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{level}</span>;
};

const StatCard = ({ label, value, sub, color = C.purple }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
    <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
    <div style={{ color, fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{value ?? "—"}</div>
    {sub && <div style={{ color: C.muted, fontSize: 12 }}>{sub}</div>}
  </div>
);

const Bar = ({ label, value, max, color = C.purple }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ color: C.text, fontSize: 13 }}>{label}</span>
      <span style={{ color, fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
    <div style={{ background: "#1e1e2e", borderRadius: 4, height: 6 }}>
      <div style={{ width: `${(value / max) * 100}%`, background: color, borderRadius: 4, height: 6, transition: "width 0.8s ease" }} />
    </div>
  </div>
);

export default function AdminPage() {
  const { authFetch, user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);

  useEffect(() => {
    Promise.all([
      authFetch("/api/admin/analytics").then(r => r.json()),
      authFetch("/api/admin/students").then(r => r.json())
    ]).then(([a, s]) => {
      setAnalytics(a);
      setStudents(Array.isArray(s) ? s : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const viewStudent = async (id) => {
    setSelectedStudent(id);
    const res = await authFetch(`/api/admin/student/${id}`);
    const data = await res.json();
    setStudentDetail(data);
    setTab("studentDetail");
  };


  const exportCSV = () => {
    const headers = ["Name","Email","Field","Target Role","Latest Score","Readiness","Analyses","Joined"];
    const rows = students.map(s => [
      s.name, s.email, s.field||"", s.target_role||"",
      s.latest_score||"", s.readiness||"", s.analysis_count||0,
      new Date(s.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "students_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = (s) => s >= 75 ? C.green : s >= 55 ? C.yellow : C.red;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "Inter, sans-serif" }}>
      Loading analytics...
    </div>
  );

  const a = analytics || {};
  const scores = a.scores || {};
  const maxRoleCount = Math.max(...(a.topRoles || []).map(r => r.count), 1);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif", color: C.text }}>
      {/* Top bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, padding: "6px 12px", fontWeight: 800, fontSize: 16, color: "#fff" }}>PRI</div>
          <span style={{ color: C.muted, fontSize: 14 }}>Admin Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: C.muted, fontSize: 13 }}>{user?.email}</span>
          <button onClick={() => navigate("/career")} style={{ background: "#1e1e2e", border: "none", color: C.text, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Student View</button>
          <button onClick={logout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "32px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[["overview", "Overview"], ["students", "Students"], ...(tab === "studentDetail" ? [["studentDetail", "Student Detail"]] : [])].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
              background: tab === id ? C.purple : "#1e1e2e",
              color: tab === id ? "#fff" : C.muted
            }}>{label}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              <StatCard label="Total Students" value={a.users?.total || 0} sub={`${a.users?.active_week || 0} active this week`} color={C.purple} />
              <StatCard label="Students Analyzed" value={scores.students_analyzed || 0} sub="ran full pipeline" color={C.blue} />
              <StatCard label="Avg Career Score" value={scores.avg_score ? `${scores.avg_score}/100` : "—"} sub={`Range: ${scores.min_score || 0}–${scores.max_score || 0}`} color={C.green} />
              <StatCard label="Avg Resume Score" value={scores.avg_resume_score ? `${scores.avg_resume_score}/100` : "—"} sub="from resume uploads" color={C.yellow} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {/* Readiness distribution */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Readiness Distribution</div>
                {[
                  ["Strong", scores.strong_count, C.green],
                  ["Developing", scores.developing_count, C.yellow],
                  ["Early Stage", scores.early_count, C.red]
                ].map(([label, count, color]) => {
                  const total = (scores.strong_count || 0) + (scores.developing_count || 0) + (scores.early_count || 0);
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: C.text, fontSize: 13 }}>{label}</span>
                        <span style={{ color, fontWeight: 700 }}>{count || 0} <span style={{ color: C.muted, fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ background: "#1e1e2e", borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${pct}%`, background: color, borderRadius: 4, height: 8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top target roles */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Top Target Roles</div>
                {(a.topRoles || []).map(r => (
                  <Bar key={r.target_role} label={r.target_role} value={r.count} max={maxRoleCount} color={C.purple} />
                ))}
                {!(a.topRoles?.length) && <div style={{ color: C.muted, fontSize: 13 }}>No data yet</div>}
              </div>

              {/* Avg score by role */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Avg Score by Role</div>
                {(a.scoreByRole || []).map(r => (
                  <Bar key={r.target_role} label={r.target_role} value={`${r.avg_score}/100`} max={100} color={scoreColor(r.avg_score)} />
                ))}
                {!(a.scoreByRole?.length) && <div style={{ color: C.muted, fontSize: 13 }}>No data yet</div>}
              </div>
            </div>
          </>
        )}

        {/* ── STUDENTS TAB ── */}
        {tab === "students" && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>All Students ({students.length})</div>
              <button onClick={exportCSV} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #1e2a45", background: "transparent", color: "#10b981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>⬇ Export CSV</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0d0d15" }}>
                    {["Name", "Email", "Field", "Target Role", "Latest Score", "Readiness", "Analyses", "Joined", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} style={{ borderTop: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = "#15151f"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: 14 }}>{s.name}</td>
                      <td style={{ padding: "14px 16px", color: C.muted, fontSize: 13 }}>{s.email}</td>
                      <td style={{ padding: "14px 16px", color: C.muted, fontSize: 13 }}>{s.field || "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13 }}>{s.target_role || "—"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        {s.latest_score
                          ? <span style={{ color: scoreColor(s.latest_score), fontWeight: 700 }}>{s.latest_score}/100</span>
                          : <span style={{ color: C.muted }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>{s.readiness ? <Badge level={s.readiness} /> : <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={{ padding: "14px 16px", color: C.muted, fontSize: 13 }}>{s.analysis_count || 0}</td>
                      <td style={{ padding: "14px 16px", color: C.muted, fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <button onClick={() => viewStudent(s.id)} style={{
                          background: "#1e1e2e", border: "none", color: C.purple,
                          padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600
                        }}>View →</button>
                      </td>
                    </tr>
                  ))}
                  {!students.length && (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.muted }}>No students registered yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STUDENT DETAIL TAB ── */}
        {tab === "studentDetail" && studentDetail && (
          <div>
            <button onClick={() => setTab("students")} style={{ background: "#1e1e2e", border: "none", color: C.muted, padding: "8px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 24, fontSize: 13 }}>
              ← Back to Students
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
              {/* Left — user info */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 16 }}>
                  {studentDetail.user?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{studentDetail.user?.name}</div>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{studentDetail.user?.email}</div>

                {studentDetail.profile && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      ["Field", studentDetail.profile.field],
                      ["Target Role", studentDetail.profile.target_role],
                      ["GPA", studentDetail.profile.gpa],
                      ["GitHub", studentDetail.profile.github_username],
                      ["LeetCode", studentDetail.profile.leetcode_username],
                      ["Internship", studentDetail.profile.has_internship ? `Yes — ${studentDetail.profile.internship_field}` : "No"],
                      ["Hackathons", studentDetail.profile.hackathons]
                    ].filter(([, v]) => v != null).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: C.muted, fontSize: 12 }}>{k}</span>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right — score history */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Analysis History ({studentDetail.scores?.length || 0} runs)</div>
                {studentDetail.scores?.map((s, i) => (
                  <div key={i} style={{
                    background: "#0d0d15", borderRadius: 12, padding: 16, marginBottom: 12,
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12
                  }}>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Overall</div>
                      <div style={{ color: scoreColor(s.overall_score), fontWeight: 800, fontSize: 20 }}>{s.overall_score}</div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Readiness</div>
                      <Badge level={s.readiness_level} />
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Resume</div>
                      <div style={{ color: s.resume_score ? scoreColor(s.resume_score) : C.muted, fontWeight: 700 }}>
                        {s.resume_score ? `${s.resume_score}/100` : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Date</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {!studentDetail.scores?.length && <div style={{ color: C.muted, fontSize: 13 }}>No analyses run yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
