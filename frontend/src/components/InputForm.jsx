import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api } from "../services/api.js";
import {
  getLocationInputUpdate,
  getLocationLookupStatus,
  getClimateLookupStatus,
  hasDisplayableLocalSoilData,
  getSupportedAutofillValues,
  getSupportedClimateAutofillValues,
  clearLocationAutofillOverrides,
  isCurrentLocationRequest,
} from "../services/geospatialAutofill.js";

const SatelliteMapPicker = lazy(
  () => import("./SatelliteMapPicker.jsx"),
);

const DEFAULT_FEATURES = [
  { name: "N", label: "Nitrogen", min: 0, max: 140, validationMin: 0 },
  { name: "P", label: "Phosphorus", min: 5, max: 145, validationMin: 0 },
  { name: "K", label: "Potassium", min: 5, max: 205, validationMin: 0 },
  { name: "temperature", label: "Temperature", min: 8.825674745, max: 43.67549305, validationMin: -90, validationMax: 60 },
  { name: "humidity", label: "Humidity", min: 14.25803981, max: 99.98187601, validationMin: 0, validationMax: 100 },
  { name: "ph", label: "Soil pH", min: 3.504752314, max: 9.93509073, validationMin: 0, validationMax: 14 },
  { name: "rainfall", label: "Rainfall", min: 20.21126747, max: 298.5601175, validationMin: 0 },
];

const UNITS = {
  temperature: "°C",
  humidity: "%",
  rainfall: "mm",
};
const CLIMATE_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CLIMATE_FEATURES = new Set(["temperature", "humidity", "rainfall"]);

export default function InputForm({ onSuccess, initialFarmerGuideContext = null }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [geospatial, setGeospatial] = useState(null);
  const [geospatialClimate, setGeospatialClimate] = useState(null);
  const [climateMonth, setClimateMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const climateMonthRef = useRef(climateMonth);
  const [geospatialLoading, setGeospatialLoading] = useState(false);
  const [geospatialError, setGeospatialError] = useState("");
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [estimatedFields, setEstimatedFields] = useState([]);
  const locationRequestId = useRef(0);
  const locationLookupTimer = useRef(null);
  const autoFillEnabledRef = useRef(true);
  const manuallyEditedFields = useRef(new Set());

  useEffect(() => () => window.clearTimeout(locationLookupTimer.current), []);

  const available = DEFAULT_FEATURES;
  const locationLookupStatus = getLocationLookupStatus(
    location,
    geospatialLoading,
    geospatial,
  );
  const climateLookupStatus = getClimateLookupStatus(
    geospatialClimate,
    climateMonth,
  );

  function updateValue(name, rawValue) {
    manuallyEditedFields.current.add(name);
    setValues((previous) => ({ ...previous, [name]: rawValue }));
    setEstimatedFields((previous) => previous.filter((field) => field !== name));
  }

  function applyLocationValues(soil, climate, month = climateMonthRef.current) {
    const soilInputs = getSupportedAutofillValues(
      soil?.inputs ?? {},
      available.map((feature) => feature.name),
      manuallyEditedFields.current,
    );
    const climateInputs = getSupportedClimateAutofillValues(
      climate,
      month,
      available.map((feature) => feature.name),
      manuallyEditedFields.current,
    );
    const supportedInputs = { ...soilInputs, ...climateInputs };
    setValues((previous) => ({
      ...getLocationInputUpdate(
        previous,
        estimatedFields,
        soil?.inputs ?? {},
        available.map((feature) => feature.name),
        manuallyEditedFields.current,
        climateInputs,
      ),
    }));
    setEstimatedFields(Object.keys(supportedInputs));
  }

  function resetInputsToLocationData() {
    manuallyEditedFields.current.clear();
    const soilInputs = getSupportedAutofillValues(
      geospatial?.inputs ?? {},
      available.map((feature) => feature.name),
      manuallyEditedFields.current,
    );
    const climateInputs = getSupportedClimateAutofillValues(
      geospatialClimate,
      climateMonthRef.current,
      available.map((feature) => feature.name),
      manuallyEditedFields.current,
    );
    const supportedInputs = { ...soilInputs, ...climateInputs };
    autoFillEnabledRef.current = true;
    setAutoFillEnabled(true);
    setValues(supportedInputs);
    setEstimatedFields(Object.keys(supportedInputs));
    setError("");
  }

  function selectLocation(nextLocation) {
    const requestId = ++locationRequestId.current;
    setLocation(nextLocation);
    setGeospatial(null);
    setGeospatialClimate(null);
    setGeospatialError("");
    setGeospatialLoading(true);
    setValues((previous) => getLocationInputUpdate(
      previous,
      estimatedFields,
      {},
      available.map((feature) => feature.name),
      manuallyEditedFields.current,
    ));
    setEstimatedFields([]);
    window.clearTimeout(locationLookupTimer.current);
    locationLookupTimer.current = window.setTimeout(async () => {
      try {
        const lookup = await api.locationData(
          nextLocation.latitude,
          nextLocation.longitude,
        );
        if (!isCurrentLocationRequest(locationRequestId.current, requestId)) return;
        setGeospatial(lookup.soil);
        setGeospatialClimate(lookup.climate);
        const lookupErrors = [lookup.soil_error, lookup.climate_error].filter(Boolean);
        if (lookupErrors.length) setGeospatialError(lookupErrors.join(" "));
        if (autoFillEnabledRef.current) {
          applyLocationValues(lookup.soil, lookup.climate);
        }
      } catch (reason) {
        if (isCurrentLocationRequest(locationRequestId.current, requestId)) {
          const message = reason instanceof Error
            ? reason.message
            : "The local location lookup failed.";
          setGeospatialError(message);
        }
      } finally {
        if (isCurrentLocationRequest(locationRequestId.current, requestId)) {
          setGeospatialLoading(false);
        }
      }
    }, 300);
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
    const invalid = available.filter((feature) => {
      const value = payload[feature.name];
      return !Number.isFinite(value)
        || value < feature.validationMin
        || (feature.validationMax !== undefined && value > feature.validationMax);
    });
    if (invalid.length) {
      setError(
        `Enter valid values for ${invalid.map((feature) => feature.label).join(", ")}. `
        + "Temperature must be -90–60 °C, humidity 0–100%, pH 0–14, and all other model inputs non-negative.",
      );
      return;
    }
    setLoading(true);
    try {
      const result = await api.predict({
        ...payload,
        ...(initialFarmerGuideContext
          ? {
            advisory_context: {
              farmer_guide: initialFarmerGuideContext,
            },
          }
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
          Random Forest. Training-data ranges are shown for reference; values
          outside those bounds are allowed but flagged in the results.
        </p>
        <p className="geospatial-result-note">
          Selecting a location auto-fills temperature, humidity, and rainfall
          from that month's local historical climate normal when available.
          These are not live field readings, and the training data does not
          document the weather aggregation; review and confirm estimates before
          prediction. Soil pH is filled only where the local raster has a valid
          value. N, P, and K remain manual.
        </p>
      </div>
      <Suspense fallback={<div className="interactive-map-loading" role="status">Loading interactive map…</div>}>
        <SatelliteMapPicker
          location={location}
          onLocationSelect={selectLocation}
          loading={geospatialLoading}
          onLocationError={setGeospatialError}
        />
      </Suspense>
      {locationLookupStatus && (
        <p className="geospatial-result-note" role="status" aria-live="polite">
          {locationLookupStatus}
        </p>
      )}
      <div className="geospatial-actions no-print">
        <button
          className="button button-quiet"
          type="button"
          disabled={!location || geospatialLoading}
          onClick={() => {
            if (!location) return;
            clearLocationAutofillOverrides(manuallyEditedFields.current);
            autoFillEnabledRef.current = true;
            setAutoFillEnabled(true);
            selectLocation(location);
          }}
        >
          {geospatialLoading
            ? <><LoaderCircle className="spin" size={17} /> Looking up selected location…</>
            : "Auto-fill from map location"}
        </button>
        <button
          className="button button-quiet"
          type="button"
          disabled={geospatialLoading || (
            !location
            && !Object.keys(values).length
            && !manuallyEditedFields.current.size
          )}
          onClick={resetInputsToLocationData}
        >
          Reset inputs to available location data
        </button>
      </div>
      {geospatialError && <div className="alert alert-error" role="alert">{geospatialError}</div>}
      {geospatialClimate && (
        <p className="geospatial-result-note" role="status" aria-live="polite">
          {climateLookupStatus}
          {geospatialClimate.grid_location
            && ` Nearest climate grid cell is ${geospatialClimate.grid_location.distance_m.toFixed(1)} km away.`}
        </p>
      )}
      <label className="field climate-month-field">
        <span>Climate month for weather estimates</span>
        <select
          value={climateMonth}
          onChange={(event) => {
            const month = event.target.value;
            climateMonthRef.current = month;
            setClimateMonth(month);
            if (autoFillEnabledRef.current && geospatialClimate) {
              applyLocationValues(geospatial, geospatialClimate, month);
            }
          }}
        >
          {CLIMATE_MONTHS.map((month, index) => (
            <option key={month} value={String(index + 1).padStart(2, "0")}>
              {month}{index + 1 === new Date().getMonth() + 1 ? " (current month)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="geospatial-toggle">
        <input
          type="checkbox"
          checked={autoFillEnabled}
          onChange={(event) => {
            const enabled = event.target.checked;
            autoFillEnabledRef.current = enabled;
            setAutoFillEnabled(enabled);
            if (enabled) {
              applyLocationValues(geospatial, geospatialClimate);
            } else {
              setValues((previous) => Object.fromEntries(
                Object.entries(previous).filter(([name]) => (
                  !estimatedFields.includes(name)
                )),
              ));
              setEstimatedFields([]);
            }
          }}
        />
        <span>Auto-fill compatible soil and local climate estimates</span>
      </label>
      {estimatedFields.length > 0 && (
        <p className="geospatial-result-note" role="note">
          Location-filled values are estimates, not current field readings. Climate
          values are historical monthly normals, and the model training data does
          not document their weather aggregation. Replace estimates with field
          measurements when available.
        </p>
      )}
      {hasDisplayableLocalSoilData(geospatial) && (
        <section className="geospatial-estimate-panel" aria-label="Geospatial estimates">
          <div className="geospatial-estimate-heading">
            <div>
                  <p className="eyebrow">LOCAL DATA · {geospatial.dataset_status.replaceAll("_", " ")}</p>
                  <h3>{geospatial.provenance?.dataset_name ?? "Local soil lookup"}</h3>
            </div>
                <span className="geospatial-fallback-badge">
                  {geospatial.available_properties.length
                    ? `${geospatial.available_properties.length} model input ${geospatial.available_properties.length === 1 ? "estimate" : "estimates"} found`
                    : "Context data only; no model inputs"}
                </span>
          </div>
              {geospatial.provenance && (
                <p>
                  Source: {geospatial.provenance.source}. Resolution: {geospatial.provenance.spatial_resolution_m} m.
                  {geospatial.provenance.dataset_version
                    ? ` Dataset version: ${geospatial.provenance.dataset_version}.`
                    : ""}
                  {geospatial.lookup?.method === "raster_cell"
                    && " Value sampled from the selected raster cell; no nearby pixel substitution."}
                  {geospatial.lookup?.distance_m !== undefined
                    && ` Nearest point sample: ${geospatial.lookup.distance_m} m away.`}
                </p>
              )}
              {geospatial.provenance?.citation && (
                <details className="geospatial-provenance">
                  <summary>Dataset citation and license</summary>
                  <p>{geospatial.provenance.citation}</p>
                  {geospatial.provenance.license && <p>License: {geospatial.provenance.license}</p>}
                </details>
              )}
              {Object.entries(geospatial.context_properties ?? {}).map(([name, property]) => (
                <p className="geospatial-source" key={name}>
                  Context only — {name.replaceAll("_", " ")}: {property.value} {property.units}
                  {" · "}{property.source} mapped estimate
                  {" · depth "}{property.soil_depth_cm.join("–")} cm
                  {" · not used as a model input"}
                </p>
              ))}
        </section>
      )}
      <div className="form-grid">
        {available.map((feature) => (
          <label className="field" key={feature.name}>
            <span>{feature.name === "N" || feature.name === "P" || feature.name === "K"
              ? `${feature.label} (${feature.name})`
              : `${feature.label}${UNITS[feature.name] ? ` (${UNITS[feature.name]})` : ""}`}</span>
            {estimatedFields.includes(feature.name) && (
              <small className="geospatial-source">
                {CLIMATE_FEATURES.has(feature.name)
                  ? `${geospatialClimate?.dataset_name ?? "Local climate dataset"} · ${CLIMATE_MONTHS[Number(climateMonth) - 1]} historical monthly normal${feature.name === "rainfall" ? " · mm/month" : ""}${geospatialClimate?.reference_period
                    ? ` · ${geospatialClimate.reference_period.start_year}–${geospatialClimate.reference_period.end_year}`
                    : ""} · not live weather`
                  : `${geospatial?.properties?.[feature.name]?.source ?? "Local soil dataset"} · ${geospatial?.properties?.[feature.name]?.value_type?.replaceAll("_", " ") ?? "mapped estimate"} · ${geospatial?.properties?.[feature.name]?.units ?? ""} · depth ${Array.isArray(geospatial?.properties?.[feature.name]?.soil_depth_cm)
                    ? geospatial.properties[feature.name].soil_depth_cm.join("–")
                    : geospatial?.properties?.[feature.name]?.soil_depth_cm ?? "unknown"} cm`}
              </small>
            )}
            {manuallyEditedFields.current.has(feature.name) && (
              <small className="geospatial-source">Manually entered or edited</small>
            )}
            <input
              name={feature.name}
              type="number"
              step="any"
              min={feature.validationMin}
              max={feature.validationMax}
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
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <button className="button button-primary button-wide" disabled={loading} type="submit">
        {loading ? <><LoaderCircle className="spin" size={18} /> Analyzing your conditions...</> :
          <>Analyze &amp; Recommend <ArrowRight size={18} /></>}
      </button>
    </form>
  );
}
