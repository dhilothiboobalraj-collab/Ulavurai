import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import FeatureImportance from "../components/FeatureImportance.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { api } from "../services/api.js";

const formatPercent = (value) => value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [importance, setImportance] = useState([]);
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.metrics(), api.importance(), api.features()])
      .then(([data, ranking, featureData]) => {
        setMetrics(data);
        setImportance(ranking.feature_importance);
        setFeatures(featureData.features);
      })
      .catch((reason) => setError(reason.message));
  }, []);

  const test = metrics?.test_metrics;
  const validation = metrics?.validation_metrics ?? {};
  const selectedValidation = validation[metrics?.selected_model];
  return (
    <div className="page">
      <header className="page-heading">
        <p className="eyebrow"><BarChart3 size={14} /> MODEL ANALYTICS</p>
        <h1>Evidence behind the recommendation.</h1>
        <p>Every displayed result is loaded from the saved model or its training metrics.</p>
      </header>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!metrics && !error && <section className="panel loading-state" role="status">Loading saved model analytics…</section>}
      {metrics && <>
        <section className="metric-grid analytics-metrics">
          <MetricCard label="SELECTED MODEL" value={metrics.selected_model} detail={metrics.selection_metric} />
          <MetricCard label="TEST ACCURACY" value={formatPercent(test?.accuracy)} detail="Held-out test set" />
          <MetricCard label="TEST PRECISION · MACRO" value={formatPercent(test?.precision_macro)} />
          <MetricCard label="TEST RECALL · MACRO" value={formatPercent(test?.recall_macro)} />
          <MetricCard label="TEST F1 · MACRO" value={formatPercent(test?.f1_macro)} />
        </section>
        <section className="panel feature-summary">
          <div className="panel-heading">
            <div><p className="eyebrow">MODEL INPUTS</p><h2>{features.length} features</h2></div>
          </div>
          <div className="feature-chips">
            {features.map((feature) => <span key={feature.name}>{feature.label} ({feature.name})</span>)}
          </div>
          <p className="fine-print">
            Classifier selection used validation macro F1
            {selectedValidation ? ` (${formatPercent(selectedValidation.f1_macro)})` : ""}.
            The test set was held out for final evaluation and was not used for selection.
            {metrics.split && ` Saved split: ${metrics.split.training_percent}% train, ${metrics.split.validation_percent}% validation, ${metrics.split.test_percent}% test.`}
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">FITTED RANDOM FOREST</p><h2>Feature importance</h2></div></div>
          <FeatureImportance items={importance} />
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">VALIDATION SPLIT</p><h2>Compared classifiers</h2></div></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Model</th><th>Accuracy</th><th>Precision · macro</th><th>Recall · macro</th><th>F1 · macro</th></tr></thead>
            <tbody>{Object.entries(validation).map(([name, score]) =>
              <tr className={name === metrics.selected_model ? "selected-row" : ""} key={name}>
                <td>{name}{name === metrics.selected_model && <span className="selected-tag"> SELECTED</span>}</td>
                <td>{formatPercent(score.accuracy)}</td>
                <td>{formatPercent(score.precision_macro)}</td>
                <td>{formatPercent(score.recall_macro)}</td>
                <td>{formatPercent(score.f1_macro)}</td>
              </tr>)}</tbody>
          </table></div>
          <p className="fine-print">Comparison scores are validation results from the saved metrics. Final test scores above come from the separate held-out test split. Training accuracy is not present in the metrics file.</p>
        </section>
      </>}
    </div>
  );
}
