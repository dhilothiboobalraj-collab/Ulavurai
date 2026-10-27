import { lazy, Suspense, useEffect, useState } from "react";
import { Activity, Leaf, LogOut, Menu, Sprout, X } from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth.jsx";
import { useAuth } from "./auth/AuthProvider.jsx";
import About from "./pages/About.jsx";
import Analytics from "./pages/Analytics.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import FarmerGuide from "./pages/FarmerGuide.jsx";
import History from "./pages/History.jsx";
import Home from "./pages/Home.jsx";
import InterfaceTabs from "./components/InterfaceTabs.jsx";
import Predict from "./pages/Predict.jsx";
import Results from "./pages/Results.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import { api } from "./services/api.js";

const FieldToolkit = lazy(() => import("./pages/FieldToolkit.jsx"));

const links = [
  ["/", "Home"],
  ["/toolkit", "Field toolkit"],
  ["/analytics", "Analytics"],
  ["/history", "History"],
  ["/about", "About"],
];

export default function App() {
  const { signOut, user } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage signUp />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/*" element={<Dashboard
          logoutError={logoutError}
          logoutPending={logoutPending}
          onLogout={async () => {
            setLogoutError("");
            setLogoutPending(true);
            try {
              const { error } = await signOut();
              if (error) setLogoutError(error.message);
            } catch (error) {
              setLogoutError(error.message || "Unable to sign out.");
            } finally {
              setLogoutPending(false);
            }
          }}
          user={user}
        />} />
      </Route>
    </Routes>
  );
}

function Dashboard({ logoutError, logoutPending, onLogout, user }) {
  const [health, setHealth] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    api.health().then(setHealth).catch((reason) => setHealth({ status: "offline", error: reason.message }));
    const timer = window.setInterval(() => {
      api.health().then(setHealth).catch((reason) => setHealth({ status: "offline", error: reason.message }));
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><Sprout size={21} /></span>
          <span>Ulavurai<small>SMART CROP ADVISORY PLATFORM</small></span>
        </Link>
        <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? "nav nav-open" : "nav"}>
          {links.map(([to, title]) => <NavLink key={to} to={to} end={to === "/"} onClick={() => setMenuOpen(false)}>{title}</NavLink>)}
        </nav>
        <div className={`system-status ${health?.status === "ok" ? "status-online" : "status-offline"}`}>
          <Activity size={14} /> {health?.status === "ok" ? "Model online" : "API unavailable"}
        </div>
        <div className="auth-user">
          <span title={user.email}>{user.email}</span>
          <button className="button button-quiet logout-button" type="button" onClick={onLogout} disabled={logoutPending}>
            <LogOut size={15} /> {logoutPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      <InterfaceTabs />
      {logoutError && <div className="global-error" role="alert">{logoutError}</div>}
      {health?.status === "not_ready" && <div className="global-error" role="alert"><Leaf size={16} /> {health.error}</div>}
      <main><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/toolkit" element={
          <Suspense fallback={<div className="page loading-state" role="status">Loading field toolkit…</div>}>
            <FieldToolkit />
          </Suspense>
        } />
        <Route path="/farmer" element={<FarmerGuide />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/results" element={<Results />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/history" element={<History />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Home />} />
      </Routes></main>
      <footer className="footer"><span>ULAVURAI</span><span>Model outputs are informational and dataset-based.</span></footer>
    </div>
  );
}
