import { ArrowLeft, AlertTriangle, Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import AnalysisCard from "../components/AnalysisCard.jsx";
import FeatureImportance from "../components/FeatureImportance.jsx";
import RecommendationCard from "../components/RecommendationCard.jsx";
import { api } from "../services/api.js";
import { useEffect, useState } from "react";

const CONTEXT_LABELS = {
  district: "District",
  village: "Village",
  latitude: "Latitude",
  longitude: "Longitude",
  season: "Season",
  crop_to_analyse: "Crop to analyse",
  farm_area_ha: "Farm area (hectares)",
  soil_type: "Soil type",
  organic_carbon_pct: "Organic carbon (%)",
  electrical_conductivity_ds_m: "Electrical conductivity (dS/m)",
  water_source: "Water source",
  irrigation_availability: "Irrigation availability",
  previous_crop: "Previous crop",
  market_price_per_quintal: "Farmer-entered price (₹/quintal)",
  farmer_objective: "Farmer objective",
};

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
      {Object.keys(result.advisory_context ?? {}).length > 0 && (
        <section className="panel">
          <p className="eyebrow">USER-PROVIDED CONTEXT · NOT MODEL FEATURES</p>
          <h2>Additional advisory context</h2>
          <div className="input-values">
            {Object.entries(result.advisory_context).map(([name, value]) => (
              !["geospatial_estimate", "weather_context"].includes(name) && (
                <div key={name}>
                  <span>{CONTEXT_LABELS[name] ?? name}</span>
                  <strong>{typeof value === "number"
                    ? value.toLocaleString()
                    : String(value).replaceAll("_", " ")}</strong>
                </div>
              )
            ))}
            </div>
            {result.advisory_context.geospatial_estimate && (
              <div className="geospatial-result-note">
                <strong>Local geospatial data context · not model features</strong>
                <p>Source: {result.advisory_context.geospatial_estimate.source}</p>
                <div className="geospatial-result-sources">
                  {Object.entries(result.advisory_context.geospatial_estimate.properties ?? {})
                    .map(([field, property]) => (
                      <span key={field}>
                        {field}: {property.value} {property.units} · {property.value_type.replaceAll("_", " ")}
                        {property.soil_depth_cm && ` · depth ${
                          Array.isArray(property.soil_depth_cm)
                            ? property.soil_depth_cm.join("–")
                            : property.soil_depth_cm
                        } cm`}
                      </span>
                    ))}
                </div>
                {Object.entries(result.advisory_context.geospatial_estimate.context_properties ?? {})
                  .map(([name, property]) => (
                    <p key={name}>
                      Context only — {name.replaceAll("_", " ")}: {property.value} {property.units}
                      {" · "}{property.value_type.replaceAll("_", " ")}
                      {" · not used as a model input"}
                    </p>
                  ))}
                {result.advisory_context.geospatial_estimate.properties
                  && Object.keys(result.advisory_context.geospatial_estimate.properties).length > 0 && (
                    <p>
                      Mapped model-input estimate acknowledged:{" "}
                      {result.advisory_context.geospatial_estimate.user_reviewed ? "Yes" : "No"}.
                    </p>
                  )}
                {result.advisory_context.geospatial_estimate.unavailable_properties?.length > 0 && (
                  <p>Not available from local soil data: {result.advisory_context.geospatial_estimate.unavailable_properties.join(", ")}.</p>
                )}
              </div>
            )}
            {result.advisory_context.weather_context && (
              <div className="geospatial-result-note">
                <strong>Current weather context · not Random Forest inputs</strong>
                <p>
                  Source: {result.advisory_context.weather_context.source}
                  {result.advisory_context.weather_context.retrieved_at
                    && ` · ${result.advisory_context.weather_context.retrieved_at}`}
                </p>
                {Object.entries(result.advisory_context.weather_context.properties ?? {})
                  .map(([name, property]) => (
                    <p key={name}>
                      {property.label}: {property.value} {property.units}
                      {" · "}{property.temporal_definition}
                      {" · modelled estimate"}
                    </p>
                  ))}
                <p>
                  Current conditions do not establish the model’s undocumented
                  seasonal temperature, humidity, or rainfall period.
                </p>
                <a
                  href={result.advisory_context.weather_context.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Weather data by Open-Meteo.com
                </a>
                {" · "}
                <a
                  href={result.advisory_context.weather_context.license_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY 4.0
                </a>
              </div>
            )}
          {result.advisory_context.market_price_per_quintal !== undefined && (
            <p className="muted">Price was entered by the user; it is not verified or sourced from live market data.</p>
          )}
        </section>
      )}
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">GLOBAL MODEL SIGNALS</p><h2>Feature importance</h2></div><Link to="/analytics" className="text-link">Model analytics</Link></div>
        {importanceError && <div className="alert alert-error" role="alert">{importanceError}</div>}
        <FeatureImportance items={importance} />
      </section>
    </div>
  );
}
