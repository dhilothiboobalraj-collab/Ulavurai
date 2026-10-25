import FarmerOptionCard from "./FarmerOptionCard.jsx";

export default function FarmerQuestionCard({
  title,
  hint,
  options,
  value,
  onChange,
  columns = 2,
}) {
  return (
    <section className="farmer-question panel" aria-labelledby="farmer-question-title">
      <div className="farmer-question-heading">
        <p className="eyebrow">FARMER GUIDE</p>
        <h1 id="farmer-question-title">{title}</h1>
        {hint && <p>{hint}</p>}
      </div>
      <div className={`farmer-option-grid farmer-option-grid-${columns}`}>
        {options.map((option) => (
          <FarmerOptionCard
            key={option.value}
            icon={option.icon}
            title={option.title}
            subtitle={option.subtitle}
            ariaLabel={option.ariaLabel}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </section>
  );
}
