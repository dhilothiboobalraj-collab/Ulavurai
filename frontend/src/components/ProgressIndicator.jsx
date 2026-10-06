export default function ProgressIndicator({ current, total, language }) {
  const tamil = language === "ta";
  return (
    <div className="farmer-progress" aria-label={`${tamil ? "கேள்வி" : "Question"} ${current} ${tamil ? " / " : "of"} ${total}`}>
      <div className="progress-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            className={index + 1 <= current ? "progress-dot progress-dot-active" : "progress-dot"}
            key={index}
          />
        ))}
      </div>
      <span>{tamil ? `கேள்வி ${current} / ${total}` : `Question ${current} of ${total}`}</span>
    </div>
  );
}
