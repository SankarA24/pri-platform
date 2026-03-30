import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ChallengePage from "./pages/ChallengePage";
import Dashboard from "./pages/DashboardPage";
import CareerPage from "./pages/CareerPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import HistoryPage from "./pages/HistoryPage";
import GlitchStatsPage from "./pages/GlitchStatsPage";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "Inter, sans-serif" }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/career" replace />;
  return children;
}

function AppRoutes() {
  const [priScore, setPriScore] = useState(null);
  const [careerScore, setCareerScore] = useState(null);
  const { user } = useAuth();

  const wrap = (Page, props = {}) => (
    <ProtectedRoute>
      <Layout priScore={priScore} careerScore={careerScore}>
        <Page {...props} />
      </Layout>
    </ProtectedRoute>
  );

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/career"} replace /> : <AuthPage />} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/challenge" replace />} />
      <Route path="/challenge" element={wrap(ChallengePage, { onScoreUpdate: setPriScore })} />
      <Route path="/dashboard" element={wrap(Dashboard)} />
      <Route path="/career" element={wrap(CareerPage, { onCareerScoreUpdate: setCareerScore })} />
      <Route path="/history" element={wrap(HistoryPage)} />
      <Route path="/glitch" element={wrap(GlitchStatsPage)} />
      <Route path="*" element={<Navigate to={user ? "/challenge" : "/auth"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
