import { ArrowLeft, AlertTriangle, Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import AnalysisCard from "../components/AnalysisCard.jsx";
import FeatureImportance from "../components/FeatureImportance.jsx";
import RecommendationCard from "../components/RecommendationCard.jsx";
import { api } from "../services/api.js";
import { useEffect, useState } from "react";

export default function Results() {
  const { state } = useLocation();
  const result = state?.result;
  const [importance, setImportance] = useState([]);
  const [importanceError, setImportanceError] = useState("");
  useEffect(() => {
    api.importance()
      .then((data) => setImportance(data.feature_importance))
      .catch((reason) => setImportanceError(reason.message));
  }, []);

  if (!result) {
    return <div className="page empty-state"><h1>No recommendation yet</h1><p>Enter field measurements to see a model prediction.</p><Link className="button button-primary" to="/predict">Start a recommendation</Link></div>;
  }
  const top = result.recommendations?.[0];
  const farmerGuideContext = result.advisory_context?.farmer_guide;
  return (
    <div className="page">
      <Link className="back-link" to="/predict"><ArrowLeft size={16} /> Adjust measurements</Link>
      <section className="result-hero">
        <div>
          <p className="eyebrow"><Check size={14} /> MODEL RECOMMENDATION</p>
          <h1>{result.best_crop}</h1>
          <p>Highest-ranked crop from the existing trained model.</p>
        </div>
        <div className="confidence-badge">
          <span>MODEL SCORE</span><strong>{top && Number.isFinite(top.confidence) ? `${top.confidence.toFixed(2)}%` : "—"}</strong>
          <small>uncalibrated vote fraction</small>
        </div>
      </section>
      {result.warnings?.length > 0 && <div className="alert alert-warning"><AlertTriangle size={18} /><div>{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></div>}
      {farmerGuideContext && (
        <section className="panel">
          <p className="eyebrow">EASY FARMER GUIDE CONTEXT</p>
          <h2>Selections carried into this analysis</h2>
          <p>
            These selections are saved as context only. The Random Forest
            recommendation uses the seven measurements shown below, not the
            district, challenge, goal, season, or soil-type selection.
          </p>
          <dl className="input-values">
            {Object.entries({
              District: farmerGuideContext.district,
              Challenge: farmerGuideContext.issue,
              Goal: farmerGuideContext.goal,
              Irrigation: farmerGuideContext.irrigation,
              Season: farmerGuideContext.season,
              "Sowing month": farmerGuideContext.sowing_month,
              "Selected soil type": farmerGuideContext.soil_type,
            }).filter(([, value]) => value !== null && value !== undefined && value !== "")
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{String(value).replaceAll("_", " ")}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
      <div className="results-grid">
        <RecommendationCard recommendations={result.recommendations} />
        <section className="panel">
          <p className="eyebrow">WHY THIS CROP WAS RECOMMENDED</p>
          <h2>Model context</h2>
          <p className="explanation-copy">{result.explanation?.summary}</p>
          <div className="input-values">
            {result.explanation?.input_values?.map((item) => <div key={item.feature}><span>{item.name}</span><strong>{Number(item.value).toFixed(2)}</strong></div>)}
          </div>
        </section>
      </div>
      <div className="results-grid analysis-grid">
        <AnalysisCard title="Soil profile" items={result.soil_analysis} />
        <AnalysisCard title="Environmental conditions" items={result.environment_analysis} />
      </div>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">GLOBAL MODEL SIGNALS</p><h2>Feature importance</h2></div><Link to="/analytics" className="text-link">Model analytics</Link></div>
        {importanceError && <div className="alert alert-error" role="alert">{importanceError}</div>}
        <FeatureImportance items={importance} />
      </section>
    </div>
  );
}
