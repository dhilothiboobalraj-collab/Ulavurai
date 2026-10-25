import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { api } from "../services/api.js";

const FEATURES = [
  {
    name: "N",
    icon: "🌱",
    ta: "நைட்ரஜன் (N)",
    en: "Nitrogen (N)",
    taHelp: "மண் பரிசோதனை அறிக்கையில் உள்ள N மதிப்பை எழுதுங்கள்.",
    enHelp: "Enter the N value shown on your soil test report.",
    taUnit: "அறிக்கையில் உள்ள அலகு",
    enUnit: "Use the report's unit",
    min: 0,
  },
  {
    name: "P",
    icon: "🌱",
    ta: "பாஸ்பரஸ் (P)",
    en: "Phosphorus (P)",
    taHelp: "மண் பரிசோதனை அறிக்கையில் உள்ள P மதிப்பை எழுதுங்கள்.",
    enHelp: "Enter the P value shown on your soil test report.",
    taUnit: "அறிக்கையில் உள்ள அலகு",
    enUnit: "Use the report's unit",
    min: 0,
  },
  {
    name: "K",
    icon: "🌱",
    ta: "பொட்டாசியம் (K)",
    en: "Potassium (K)",
    taHelp: "மண் பரிசோதனை அறிக்கையில் உள்ள K மதிப்பை எழுதுங்கள்.",
    enHelp: "Enter the K value shown on your soil test report.",
    taUnit: "அறிக்கையில் உள்ள அலகு",
    enUnit: "Use the report's unit",
    min: 0,
  },
  {
    name: "ph",
    icon: "🧪",
    ta: "மண் pH",
    en: "Soil pH",
    taHelp: "மண் பரிசோதனை அறிக்கையில் உள்ள pH எண்ணை எழுதுங்கள்.",
    enHelp: "Enter the pH number shown on your soil test report.",
    taUnit: "அலகு இல்லை",
    enUnit: "Unitless",
    min: 0,
    max: 14,
  },
  {
    name: "temperature",
    icon: "☀️",
    ta: "வெப்பநிலை",
    en: "Temperature",
    taHelp: "உங்கள் அளவீட்டில் உள்ள வெப்பநிலையை எழுதுங்கள்.",
    enHelp: "Enter the temperature from your weather measurement.",
    taUnit: "°C",
    enUnit: "°C",
    min: -90,
    max: 60,
  },
  {
    name: "humidity",
    icon: "💧",
    ta: "காற்றின் ஈரப்பதம்",
    en: "Humidity",
    taHelp: "உங்கள் வானிலை அளவீட்டில் உள்ள மதிப்பை எழுதுங்கள்.",
    enHelp: "Enter the value from your weather measurement.",
    taUnit: "%",
    enUnit: "%",
    min: 0,
    max: 100,
  },
  {
    name: "rainfall",
    icon: "🌧️",
    ta: "மழை அளவு",
    en: "Rainfall",
    taHelp: "உங்கள் மழை அளவீட்டில் உள்ள மதிப்பை எழுதுங்கள்.",
    enHelp: "Enter the value from your rainfall measurement.",
    taUnit: "mm",
    enUnit: "mm",
    min: 0,
  },
];

const COPY = {
  ta: {
    heading: "AI பயிர் பரிந்துரை பெற 7 அளவீடுகள்",
    hint: "இந்த ஏழு உண்மையான அளவீடுகளையே ஏற்கனவே உள்ள Random Forest பயன்படுத்துகிறது. மாவட்டம் அல்லது மண் தேர்விலிருந்து இவற்றை நாங்கள் ஊகிக்கமாட்டோம்.",
    unitNote: "அளவீடுகள் மாற்றமின்றி மாதிரிக்கு அனுப்பப்படும். அறிக்கை அலகு பொருந்துமா தெரியாவிட்டால், வேளாண்மை நிபுணரிடம் உறுதிப்படுத்துங்கள்.",
    reportUnit: "அறிக்கையில் உள்ள அலகையே பயன்படுத்துங்கள்.",
    trainingRange: "பயிற்சித் தரவில் காணப்பட்ட வரம்பு",
    example: "தரவுத்தொகுப்பு உதாரணம் மட்டும்",
    exampleNote: "இந்த உதாரணத்தை உங்கள் உண்மையான அளவீடாகக் கருத வேண்டாம்.",
    unavailable: "பயிற்சித் தரவு வரம்புகளை இப்போது பெற முடியவில்லை. அளவீடுகள் உங்கள் அறிக்கை/கருவியில் இருந்து இருக்க வேண்டும்.",
    submit: "AI பயிர் பரிந்துரையைப் பெறுங்கள்",
    loading: "பரிந்துரை பெறப்படுகிறது…",
    missing: "AI பயிர் பரிந்துரைக்கு 7 அளவீடுகளும் தேவை.",
    enterMissing: "விடுபட்ட அளவீடுகளை உள்ளிடுங்கள்",
    invalid: "அளவுகள் சரியான எண் வரம்பில் இருக்க வேண்டும். உங்கள் அறிக்கையைச் சரிபார்க்கவும்.",
    quick: "விரைவு வழிகாட்டலுக்குத் திரும்பு",
  },
  en: {
    heading: "7 measurements for an AI crop recommendation",
    hint: "The existing Random Forest uses these seven measured values. We never infer them from your district or soil selection.",
    unitNote: "Values are sent without unit conversion. If you are unsure whether your report's units match the model, check with an agriculture expert.",
    reportUnit: "Use the unit printed on your report.",
    trainingRange: "Range observed in the training data",
    example: "Training-data example only",
    exampleNote: "Do not use this example as your own measurement.",
    unavailable: "Training-data ranges are unavailable right now. Enter values from your actual report or measuring device.",
    submit: "Get AI crop recommendation",
    loading: "Getting recommendation…",
    missing: "All 7 measurements are required for the AI crop recommendation.",
    enterMissing: "Enter Missing Measurements",
    invalid: "Values must be valid numbers within the allowed input limits. Check your report.",
    quick: "Back to Quick Guidance",
  },
};

function formatValue(value) {
  return Number(value).toFixed(2);
}

export default function FarmerMeasurements({
  language,
  initialValues,
  onSubmit,
  onQuickGuidance,
  loading,
}) {
  const [values, setValues] = useState(() => initialValues ?? {});
  const [error, setError] = useState("");
  const [missingNames, setMissingNames] = useState([]);
  const [featureMetadata, setFeatureMetadata] = useState({});
  const [metadataError, setMetadataError] = useState(false);
  const inputRefs = useRef({});
  const tamil = language === "ta";
  const text = COPY[language];

  useEffect(() => {
    let active = true;
    api.features()
      .then((response) => {
        if (active) {
          setFeatureMetadata(Object.fromEntries(
            response.features.map((feature) => [feature.name, feature]),
          ));
          setMetadataError(false);
        }
      })
      .catch(() => {
        if (active) setMetadataError(true);
      });
    return () => { active = false; };
  }, []);

  function submit(event) {
    event.preventDefault();
    setError("");
    const missing = FEATURES
      .filter(({ name }) => values[name] === undefined || values[name] === "")
      .map(({ name }) => name);
    setMissingNames(missing);
    if (missing.length) {
      setError("missing");
      return;
    }
    const measurements = Object.fromEntries(
      FEATURES.map(({ name }) => [name, Number(values[name])]),
    );
    const valid = FEATURES.every(({ name, min, max }) => {
      const value = measurements[name];
      return Number.isFinite(value) && value >= min && (max === undefined || value <= max);
    });
    if (!valid) {
      setError("invalid");
      return;
    }
    onSubmit(measurements);
  }

  function focusMissing() {
    const firstMissing = FEATURES.find(({ name }) => missingNames.includes(name));
    if (!firstMissing) return;
    inputRefs.current[firstMissing.name]?.focus();
    inputRefs.current[firstMissing.name]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <form
      className="farmer-measurements panel"
      onSubmit={submit}
      noValidate
      aria-labelledby="farmer-measurements-heading"
    >
      <div className="farmer-measurements-heading">
        <span className="farmer-category-icon"><Sparkles size={23} /></span>
        <div>
          <p className="eyebrow">{tamil ? "AI மாதிரி உள்ளீடுகள்" : "AI MODEL INPUTS"}</p>
          <h2 id="farmer-measurements-heading">{text.heading}</h2>
          <p>{text.hint}</p>
        </div>
      </div>
      {metadataError && <p className="farmer-metadata-note" role="status">{text.unavailable}</p>}
      <div className="farmer-measurements-grid">
        {FEATURES.map((feature) => {
          const metadata = featureMetadata[feature.name];
          const missing = missingNames.includes(feature.name);
          const inputId = `farmer-measurement-${feature.name}`;
          const rangeId = `${inputId}-range`;
          const helpId = `${inputId}-help`;
          return (
            <label className="farmer-measurement-field" htmlFor={inputId} key={feature.name}>
              <span>
                <span aria-hidden="true">{feature.icon}</span>
                {tamil ? feature.ta : feature.en}
                <small className="farmer-measurement-unit">
                  {tamil ? feature.taUnit : feature.enUnit}
                </small>
              </span>
              <input
                id={inputId}
                ref={(element) => { inputRefs.current[feature.name] = element; }}
                name={feature.name}
                type="number"
                step="any"
                min={feature.min}
                max={feature.max}
                value={values[feature.name] ?? ""}
                aria-invalid={missing || undefined}
                aria-describedby={`${helpId}${metadata ? ` ${rangeId}` : ""}`}
                onChange={(event) => {
                  setValues((previous) => ({ ...previous, [feature.name]: event.target.value }));
                  setMissingNames((previous) => previous.filter((name) => name !== feature.name));
                  setError("");
                }}
              />
              <small id={helpId}>{tamil ? feature.taHelp : feature.enHelp}</small>
              {metadata && (
                <small id={rangeId} className="farmer-measurement-range">
                  {text.trainingRange}: {formatValue(metadata.min)}–{formatValue(metadata.max)}
                  {" · "}
                  {text.example}: {formatValue(metadata.median)}
                </small>
              )}
            </label>
          );
        })}
      </div>
      <p className="farmer-measurement-footnote">{text.unitNote}</p>
      {metadataError && <p className="farmer-measurement-footnote">{text.reportUnit}</p>}
      {error && (
        <div className="farmer-measurement-error" role="alert">
          <p>{error === "missing" ? text.missing : text.invalid}</p>
          {error === "missing" && (
            <button className="button button-secondary-large" type="button" onClick={focusMissing}>
              {text.enterMissing}
            </button>
          )}
        </div>
      )}
      {!metadataError && (
        <p className="farmer-measurement-footnote">
          {tamil
            ? `${text.exampleNote} வரம்புக்கு வெளியேயுள்ள அளவுகளின் கணிப்பு நம்பகத்தன்மை குறையலாம்.`
            : `${text.exampleNote} Predictions may be less reliable outside the observed range.`}
        </p>
      )}
      <div className="farmer-measurement-actions">
        <button className="button button-primary farmer-measurements-submit" type="submit" disabled={loading}>
          {loading
            ? <><LoaderCircle className="spin" size={19} /> {text.loading}</>
            : <><Sparkles size={19} /> {text.submit}</>}
        </button>
        <button
          className="button button-farmer-back"
          type="button"
          onClick={onQuickGuidance}
          disabled={loading}
        >
          <ArrowLeft size={19} /> {text.quick}
        </button>
      </div>
    </form>
  );
}
