import { useEffect, useState } from "react";
import { Activity, Leaf, Menu, Sprout, X } from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import About from "./pages/About.jsx";
import Analytics from "./pages/Analytics.jsx";
import FarmerGuide from "./pages/FarmerGuide.jsx";
import History from "./pages/History.jsx";
import Home from "./pages/Home.jsx";
import InterfaceTabs from "./components/InterfaceTabs.jsx";
import Predict from "./pages/Predict.jsx";
import Results from "./pages/Results.jsx";
import { api } from "./services/api.js";

const links = [
  ["/", "Home"],
  ["/analytics", "Analytics"],
  ["/history", "History"],
  ["/about", "About"],
];

export default function App() {
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
          <span>SeasonSense<span className="brand-ai"> AI</span><small>SMART CROP ADVISORY PLATFORM</small></span>
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
      </header>
      <InterfaceTabs />
      {health?.status === "not_ready" && <div className="global-error" role="alert"><Leaf size={16} /> {health.error}</div>}
      <main><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/farmer" element={<FarmerGuide />} />
        <Route path="/farmer-guide" element={<FarmerGuide />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/results" element={<Results />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/history" element={<History />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Home />} />
      </Routes></main>
      <footer className="footer"><span>SEASONSENSE AI</span><span>Model outputs are informational and dataset-based.</span></footer>
    </div>
  );
}
