export default function RecommendationCard({ recommendations = [] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MODEL PROBABILITIES</p>
          <h2>Top recommendations</h2>
        </div>
      </div>
      <div className="recommendation-list">
        {recommendations.map((item) => (
          <div className="recommendation-row" key={item.crop}>
            <span className="recommendation-rank">{String(item.rank).padStart(2, "0")}</span>
            <strong>{item.crop}</strong>
            <div className="recommendation-probability">
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${item.confidence}%` }} />
              </div>
              <span>{item.confidence.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className="fine-print">Confidence values are the saved model's predict_proba outputs.</p>
    </section>
  );
}
