import { useCallback, useEffect, useState } from "react";
import { Clock3, Trash2 } from "lucide-react";
import { api } from "../services/api.js";

const NUMERIC_COLUMNS = [
  ["N", "N"], ["P", "P"], ["K", "K"], ["temperature", "Temperature"],
  ["humidity", "Humidity"], ["ph", "pH"], ["rainfall", "Rainfall"],
];
const readableChoice = (value) => String(value).replaceAll("_", " ");

export default function History() {
  const [records, setRecords] = useState([]);
  const [farmerSessions, setFarmerSessions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    api.history().then((data) => {
      setRecords(data.predictions);
      setFarmerSessions(data.farmer_sessions ?? []);
      setError("");
    })
      .catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function clear() {
    if (!window.confirm("Clear all saved prediction history?")) return;
    try {
      await api.clearHistory();
      setRecords([]);
      setFarmerSessions([]);
      setError("");
    } catch (reason) {
      setError(reason.message);
    }
  }

  return (
    <div className="page">
      <header className="page-heading page-heading-row">
        <div><p className="eyebrow"><Clock3 size={14} /> PREDICTION HISTORY</p><h1>Past field assessments.</h1><p>Stored locally in this project's SQLite database.</p></div>
        <button className="button button-quiet" type="button" onClick={clear} disabled={!records.length && !farmerSessions.length}><Trash2 size={16} /> Clear history</button>
      </header>
      {error && (
        <div className="alert alert-error history-error" role="alert">
          <span>{error}</span>
          <button className="text-button" type="button" onClick={load}>Try again</button>
        </div>
      )}
      <section className="panel">
        {loading ? <p className="muted">Loading history…</p> :
          records.length ? <div className="table-wrap"><table className="history-table">
            <thead><tr><th>Date</th>{NUMERIC_COLUMNS.map(([, title]) => <th key={title}>{title}</th>)}<th>Recommended crop</th><th>Model score</th><th>Advisory context</th></tr></thead>
            <tbody>{records.map((row) => <tr key={row.id}>
              <td>{new Date(row.timestamp).toLocaleString()}</td>
              {NUMERIC_COLUMNS.map(([key]) => <td key={key}>{Number(row[key]).toFixed(2)}</td>)}
              <td className="crop-cell">{row.predicted_crop}</td><td>{Number(row.confidence).toFixed(2)}%</td>
              <td>{[row.advisory_context?.district, row.advisory_context?.season, row.advisory_context?.farm_area_ha !== undefined && `${row.advisory_context.farm_area_ha} ha`].filter(Boolean).join(" · ") || "—"}</td>
            </tr>)}</tbody>
          </table></div> :
            <div className="empty-state"><Clock3 size={26} /><h2>No predictions saved</h2><p>Completed recommendations will appear here.</p></div>}
      </section>
      <section className="panel farmer-history-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">EASY FARMER GUIDE</p><h2>Farmer guide sessions</h2></div>
        </div>
        {loading ? <p className="muted">Loading farmer sessions…</p> :
          farmerSessions.length ? <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Language</th><th>District</th><th>Field location</th><th>Soil choice</th><th>Water</th><th>Reported problem</th><th>Goal</th><th>Crop model status</th></tr></thead>
            <tbody>{farmerSessions.map((session) => <tr key={session.id}>
              <td>{new Date(session.timestamp).toLocaleString()}</td>
              <td>{session.language === "ta" ? "தமிழ்" : "English"}</td>
              <td>{session.district}</td>
              <td>{session.result?.risk_context?.field_location
                ? `${session.result.risk_context.field_location.latitude.toFixed(5)}, ${session.result.risk_context.field_location.longitude.toFixed(5)}`
                : "—"}</td>
              <td>{readableChoice(session.soil_choice)}</td>
              <td>{readableChoice(session.water_choice)}</td>
              <td>{readableChoice(session.weather_problem)}</td>
              <td>{readableChoice(session.farmer_goal)}</td>
              <td>{session.model_prediction_available ? session.predicted_crop : "Not available - measurements needed"}</td>
            </tr>)}</tbody>
          </table></div> :
            <p className="muted">No Easy Farmer Guide sessions saved.</p>}
      </section>
    </div>
  );
}
