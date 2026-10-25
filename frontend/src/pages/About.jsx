import { useEffect, useState } from "react";
import { Database, Gauge, Layers3, ShieldCheck, Sprout, Workflow } from "lucide-react";
import { api } from "../services/api.js";

export default function About() {
  const [metrics, setMetrics] = useState(null);
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.metrics(), api.features()])
      .then(([modelMetrics, featureData]) => {
        setMetrics(modelMetrics);
        setFeatures(featureData.features);
      })
      .catch((reason) => setError(reason.message));
  }, []);
  const accuracy = metrics?.test_metrics?.accuracy;

  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <p className="eyebrow"><Sprout size={14} /> ABOUT SEASONSENSE</p>
        <h1>SeasonSense AI</h1>
        <p className="about-platform-subtitle">Smart Crop Advisory Platform</p>
        <p>SeasonSense AI is a dual-interface seasonal crop advisory application for Tamil Nadu. It keeps detailed technical analysis available to experts while providing a simpler Tamil/English, voice-supported flow for farmers. Both experiences share the same application and trained model where model inputs are available.</p>
      </header>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!metrics && !error && <section className="panel loading-state" role="status">Loading saved model information…</section>}
      <div className="about-stack">
        <article className="panel about-item"><Workflow /><div><h2>Problem and proposed solution</h2><p>Farmers make crop choices under varying soil and environmental conditions. SeasonSense AI uses a trained machine-learning classifier to suggest suitable crops from the measurements provided, alongside dataset-relative analysis for context.</p></div></article>
        <article className="panel about-item"><Layers3 /><div><h2>Inputs and outputs</h2><p>Inputs are N, P, K, temperature, humidity, soil pH, and rainfall{features.length ? ` (${features.length} model features)` : ""}. Outputs include the recommended crop, top three probability-ranked recommendations, model probabilities, soil and environmental analysis, and fitted-model feature importance.</p></div></article>
        <article className="panel about-item"><Database /><div><h2>Dataset</h2><p>The project uses the Crop Recommendation dataset{metrics ? ` with ${metrics.rows.toLocaleString()} records and ${metrics.crop_classes.length} crop labels` : ""}. Soil and environmental categories are calculated relative to the training dataset.</p></div></article>
        <article className="panel about-item"><ShieldCheck /><div><h2>Model and evaluation</h2><p>The saved Random Forest Classifier is served as-is; the application does not retrain or replace it. Model comparison used validation data; final performance below is read from the existing held-out test metrics.</p></div></article>
        <article className="panel about-item"><Gauge /><div><h2>Model performance</h2><p><strong>Test Accuracy: {accuracy === undefined ? "Loading…" : `${(accuracy * 100).toFixed(2)}%`}</strong>. This is the held-out test result recorded for the existing trained model, not a guarantee of future prediction accuracy.</p></div></article>
        <article className="panel about-item"><Sprout /><div><h2>Technology and responsible use</h2><p>Python, scikit-learn, FastAPI, SQLite, React, Vite, JavaScript, HTML, and CSS. Recommendations are dataset-based decision support—not a promise of yield or a substitute for local agronomic advice. Inputs outside the training-data range are flagged.</p></div></article>
        <article className="panel about-item"><Layers3 /><div><h2>One agricultural intelligence system, two user experiences</h2><p>Experts receive detailed scientific and ML analysis. Farmers receive simple Tamil/English picture and voice guidance. Both interfaces share the same backend, database, recommendation service, and saved Random Forest. Without measured model inputs, the farmer guide offers situation guidance instead of guessing a crop.</p></div></article>
        <article className="panel about-item"><Sprout /><div><h2>Easy Farmer Guide modes</h2><p>Quick Farmer Guidance uses the farmer's selected water, reported weather concern, soil awareness, and goal to show safe general actions; it is not an AI crop prediction. AI Crop Recommendation requires all seven measured values: N, P, K, pH, temperature, humidity, and rainfall. Missing values are never filled or inferred.</p></div></article>
        <article className="panel about-item"><ShieldCheck /><div><h2>Current service limitations</h2><p>No live weather service, live market-price service, yield prediction model, or district-specific soil database is integrated. Expert contextual fields are saved for advisory context only and do not affect the Random Forest unless they are one of its seven named model inputs.</p></div></article>
      </div>
    </div>
  );
}
