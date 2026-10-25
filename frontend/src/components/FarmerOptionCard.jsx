export default function FarmerOptionCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
  ariaLabel,
}) {
  return (
    <button
      className={`farmer-option${selected ? " farmer-option-selected" : ""}`}
      type="button"
      aria-pressed={Boolean(selected)}
      aria-label={ariaLabel ?? title}
      onClick={onClick}
    >
      <span className="farmer-option-icon" aria-hidden="true">{icon}</span>
      <span className="farmer-option-title">{title}</span>
      {subtitle && <span className="farmer-option-subtitle">{subtitle}</span>}
    </button>
  );
}
