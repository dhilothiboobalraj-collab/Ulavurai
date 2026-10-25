import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api } from "../services/api.js";

const DEFAULT_FEATURES = [
  { name: "N", label: "Nitrogen" },
  { name: "P", label: "Phosphorus" },
  { name: "K", label: "Potassium" },
  { name: "temperature", label: "Temperature" },
  { name: "humidity", label: "Humidity" },
  { name: "ph", label: "Soil pH" },
  { name: "rainfall", label: "Rainfall" },
];

const UNITS = {
  temperature: "°C",
  humidity: "%",
  rainfall: "mm",
};

const CONTEXT_FIELDS = [
  { name: "district", label: "District", type: "text" },
  { name: "village", label: "Village", type: "text" },
  { name: "latitude", label: "Latitude", type: "number", min: -90, max: 90 },
  { name: "longitude", label: "Longitude", type: "number", min: -180, max: 180 },
  { name: "season", label: "Season", options: [
    ["kharif", "Kharif"], ["rabi", "Rabi"], ["summer", "Summer"],
    ["year_round", "Year-round"], ["other", "Other"],
  ] },
  { name: "crop_to_analyse", label: "Crop to analyse", type: "text" },
  { name: "farm_area_ha", label: "Farm area (hectares)", type: "number", min: 0.000001, step: "any" },
  { name: "soil_type", label: "Soil type", options: [
    ["red_soil", "Red soil"], ["black_soil", "Black soil"],
    ["clay", "Clay"], ["sandy", "Sandy"], ["other", "Other"],
  ] },
  { name: "organic_carbon_pct", label: "Organic carbon (%)", type: "number", min: 0, max: 100, step: "any" },
  { name: "electrical_conductivity_ds_m", label: "Electrical conductivity (dS/m)", type: "number", min: 0, max: 1000, step: "any" },
  { name: "water_source", label: "Water source", options: [
    ["rainfed", "Rainfed"], ["canal", "Canal"], ["borewell", "Borewell"],
    ["open_well", "Open well"], ["tank", "Tank"], ["other", "Other"],
  ] },
  { name: "irrigation_availability", label: "Irrigation availability", options: [
    ["available", "Available"], ["limited", "Limited"], ["none", "None"], ["unknown", "Unknown"],
  ] },
  { name: "previous_crop", label: "Previous crop", type: "text" },
  { name: "market_price_per_quintal", label: "Farmer-entered market price (₹/quintal; not verified)", type: "number", min: 0, max: 1000000, step: "any" },
  { name: "farmer_objective", label: "Farmer objective", options: [
    ["safe", "Safer choice"], ["profit", "Higher income"], ["low_water", "Use less water"],
    ["short_duration", "Faster harvest"], ["other", "Other"],
  ] },
];
const NUMERIC_CONTEXT_FIELDS = new Set(
  CONTEXT_FIELDS.filter((field) => field.type === "number").map((field) => field.name),
);

export default function InputForm({ onSuccess }) {
  const [features, setFeatures] = useState([]);
  const [values, setValues] = useState({});
  const [context, setContext] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.features()
      .then((response) => setFeatures(response.features))
      .catch((reason) => setError(reason.message));
  }, []);

  const available = features.length
    ? features
    : DEFAULT_FEATURES;

  function updateValue(name, rawValue) {
    setValues((previous) => ({ ...previous, [name]: rawValue }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const missing = available.filter(
      (feature) => values[feature.name] === undefined || values[feature.name] === "",
    );
    if (missing.length) {
      setError(`Enter a value for ${missing.map((item) => item.label).join(", ")}.`);
      return;
    }
    const payload = Object.fromEntries(
      available.map((feature) => [feature.name, Number(values[feature.name])]),
    );
    if (Object.values(payload).some((value) => !Number.isFinite(value))) {
      setError("All inputs must be valid finite numbers.");
      return;
    }
    setLoading(true);
    try {
      const advisoryContext = Object.fromEntries(
        Object.entries(context)
          .filter(([, value]) => value !== "")
          .map(([name, value]) => [
            name,
            NUMERIC_CONTEXT_FIELDS.has(name) ? Number(value) : value,
          ]),
      );
      if (Object.values(advisoryContext).some(
        (value) => typeof value === "number" && !Number.isFinite(value),
      )) {
        setError("Optional context numbers must be valid finite numbers.");
        return;
      }
      const result = await api.predict({
        ...payload,
        ...(Object.keys(advisoryContext).length
          ? { advisory_context: advisoryContext }
          : {}),
      });
      onSuccess(result);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="input-form panel" onSubmit={submit}>
      <div className="form-intro">
        <p className="eyebrow">AI MODEL INPUTS · RANDOM FOREST</p>
        <h2>Enter your measurements</h2>
        <p className="muted">
          Only N, P, K, temperature, humidity, pH and rainfall are sent to the
          Random Forest. Reference bounds come from the training CSV; values
          outside those bounds are allowed but will be flagged in the results.
        </p>
      </div>
      <div className="form-grid">
        {available.map((feature) => (
          <label className="field" key={feature.name}>
            <span>{feature.name === "N" || feature.name === "P" || feature.name === "K"
              ? `${feature.label} (${feature.name})`
              : `${feature.label}${UNITS[feature.name] ? ` (${UNITS[feature.name]})` : ""}`}</span>
            <input
              name={feature.name}
              type="number"
              step="any"
              value={values[feature.name] ?? ""}
              onChange={(event) => updateValue(feature.name, event.target.value)}
              placeholder={feature.median !== undefined
                ? `e.g. ${feature.median.toFixed(2)}`
                : "Enter a numeric value"}
              aria-describedby={feature.min !== undefined ? `${feature.name}-range` : undefined}
              required
            />
            {feature.min !== undefined && (
              <small id={`${feature.name}-range`}>
                Training-data range: {feature.min.toFixed(2)} – {feature.max.toFixed(2)}
                {UNITS[feature.name] ? ` ${UNITS[feature.name]}` : ""}
              </small>
            )}
          </label>
        ))}
      </div>
      <details className="advisory-context">
        <summary>Additional advisory context <span>Optional · not used by the Random Forest</span></summary>
        <p className="muted advisory-context-note">
          These details are saved and shown for context only. They do not change the
          model prediction. Market price is entered by you and is not checked against
          a live market source.
        </p>
        <div className="form-grid">
          {CONTEXT_FIELDS.map((field) => (
            <label className="field" key={field.name}>
              <span>{field.label}</span>
              {field.options ? (
                <select
                  name={field.name}
                  value={context[field.name] ?? ""}
                  onChange={(event) => setContext((previous) => ({
                    ...previous,
                    [field.name]: event.target.value,
                  }))}
                >
                  <option value="">Not provided</option>
                  {field.options.map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={field.name}
                  type={field.type}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? (field.type === "number" ? "any" : undefined)}
                  value={context[field.name] ?? ""}
                  onChange={(event) => setContext((previous) => ({
                    ...previous,
                    [field.name]: event.target.value,
                  }))}
                />
              )}
            </label>
          ))}
        </div>
      </details>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <button className="button button-primary button-wide" disabled={loading} type="submit">
        {loading ? <><LoaderCircle className="spin" size={18} /> Analyzing your conditions...</> :
          <>Analyze &amp; Recommend <ArrowRight size={18} /></>}
      </button>
    </form>
  );
}
