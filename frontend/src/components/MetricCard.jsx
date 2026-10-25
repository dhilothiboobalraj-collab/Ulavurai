export default function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="metric-card">
      {Icon && <span className="metric-icon"><Icon size={19} /></span>}
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      {detail && <span className="muted">{detail}</span>}
    </article>
  );
}
