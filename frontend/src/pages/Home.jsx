import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, BarChart3, BookOpenCheck, Database, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import MetricCard from "../components/MetricCard.jsx";
import { api } from "../services/api.js";

const FEATURE_LABELS = {
  N: "Nitrogen (N)",
  P: "Phosphorus (P)",
  K: "Potassium (K)",
  temperature: "Temperature",
  humidity: "Humidity",
  ph: "Soil pH",
  rainfall: "Rainfall",
};

export default function Home() {
  const [metrics, setMetrics] = useState(null);
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.metrics(), api.features()])
      .then(([modelMetrics, featureResponse]) => {
        setMetrics(modelMetrics);
        setFeatures(featureResponse.features);
      })
      .catch((reason) => setError(reason.message));
  }, []);

  const accuracy = metrics?.test_metrics?.accuracy;
  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag"><Sprout size={15} /> DATA-LED AGRICULTURE</span>
          <h1>SeasonSense AI</h1>
          <h2 className="hero-subtitle">Intelligent Crop Recommendation Using Machine Learning</h2>
          <p>
            Enter N, P, K, temperature, humidity, soil pH, and rainfall. The
            existing Random Forest model returns a crop recommendation,
            probability-based confidence, top alternatives, and dataset-relative
            soil and environmental analysis.
          </p>
          <Link to="/predict" className="button button-primary">
            Get Crop Recommendation <ArrowRight size={18} />
          </Link>
          <div className="hero-note"><ArrowDown size={15} /> 7 field inputs · {metrics?.crop_classes?.length ?? "—"} crop classes</div>
        </div>
        <div className="hero-art" aria-label="Illustration of crop field rows">
          <div className="sun" />
          <div className="field-hill hill-back" />
          <div className="field-hill hill-front" />
          <div className="crop-stems">{Array.from({ length: 7 }, (_, i) =>
            <span key={i} style={{ "--i": i }} />)}</div>
          <div className="art-caption"><span>FIELD INSIGHT</span><strong>Rooted in your data</strong></div>
        </div>
      </section>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!metrics && !error && <div className="loading-state" role="status">Loading saved model information…</div>}
      <section className="metric-grid">
        <MetricCard label="SELECTED MODEL" value={metrics?.selected_model ?? "Loading…"} detail="Validation-selected classifier" icon={Sprout} />
        <MetricCard label="TEST ACCURACY" value={accuracy === undefined ? "—" : `${(accuracy * 100).toFixed(2)}%`} detail="Held-out test result from saved metrics" icon={BarChart3} />
        <MetricCard label="TRAINING RECORDS" value={metrics?.rows?.toLocaleString() ?? "—"} detail={`${metrics?.crop_classes?.length ?? "—"} crop classes`} icon={Database} />
      </section>

      <section className="experience-section">
        <div className="section-title">
          <p className="eyebrow">ONE INTELLIGENCE · TWO EXPERIENCES</p>
          <h2>Choose how you want to use SeasonSense AI</h2>
        </div>
        <div className="experience-grid">
          <Link className="experience-card experience-card-expert" to="/predict">
            <span className="experience-icon"><BookOpenCheck size={25} /></span>
            <p className="eyebrow">FOR EXPERTS &amp; STUDENTS</p>
            <h3>Expert Advisor</h3>
            <p>Detailed model predictions, feature importance, dataset analysis, analytics, and history.</p>
            <span className="experience-link">Open Expert Advisor <ArrowRight size={17} /></span>
          </Link>
          <Link className="experience-card experience-card-farmer" to="/farmer">
            <span className="experience-icon">🌾</span>
            <p className="eyebrow">FOR FARMERS · TAMIL FIRST</p>
            <h3>Easy Farmer Guide</h3>
            <p>Simple step-by-step questions, Tamil or English, large choices, and spoken guidance.</p>
            <span className="experience-link">எளிய வழிகாட்டியைத் திறக்கவும் <ArrowRight size={17} /></span>
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <p className="eyebrow">A PRACTICAL WORKFLOW</p><h2>From field measurements to a considered choice</h2>
        </div>
        <div className="steps-grid">
          <article><span>01</span><h3>Measure</h3><p>Enter N, P, K, temperature, humidity, soil pH, and rainfall.</p></article>
          <article><span>02</span><h3>Evaluate</h3><p>The saved model compares your conditions with patterns learned from the dataset.</p></article>
          <article><span>03</span><h3>Review</h3><p>Explore ranked recommendations, relative conditions, and model context.</p></article>
        </div>
      </section>
      <section className="dataset-strip">
        <div><p className="eyebrow">THE DATA BEHIND THE MODEL</p><h2>One dataset, seven signals.</h2></div>
        <div className="dataset-detail">
          <p><strong>Crop Recommendation</strong> · {metrics?.rows?.toLocaleString() ?? "—"} records · {metrics?.crop_classes?.length ?? "—"} labels.</p>
          <div className="feature-chips" aria-label="Model input features">
            {features.map((feature) => <span key={feature.name}>{FEATURE_LABELS[feature.name] ?? feature.label}</span>)}
          </div>
          <p>Recommendations are based on this dataset and are not guaranteed agricultural advice.</p>
        </div>
      </section>
    </div>
  );
}
