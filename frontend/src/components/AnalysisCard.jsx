export default function AnalysisCard({ title, items = [] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">DATASET COMPARISON</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="fine-print">Relative to the training dataset</p>
      <div className="analysis-list">
        {items.map((item) => (
          <div className="analysis-row" key={item.feature}>
            <span>{item.name}</span>
            <span className={`level level-${item.level.toLowerCase()}`}>{item.level}</span>
            <span className="muted">{Number(item.value).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
