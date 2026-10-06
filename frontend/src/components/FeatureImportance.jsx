export default function FeatureImportance({ items = [] }) {
  if (!items.length) {
    return <p className="muted">Feature importance is unavailable in the saved model.</p>;
  }
  const maximum = Math.max(...items.map((item) => item.importance), 0.0001);
  return (
    <div className="importance-list">
      {items.map((item) => (
        <div className="importance-row" key={item.feature}>
          <div className="importance-label">
            <span>{item.name}</span>
            <span>{(item.importance * 100).toFixed(1)}%</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item.importance / maximum) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="fine-print">
        Global Random Forest feature importance; it does not establish cause or
        explain an individual prediction.
      </p>
    </div>
  );
}
