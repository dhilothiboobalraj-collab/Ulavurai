import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api } from "../services/api.js";
import {
  getClimateLookupStatus,
  getLocationInputUpdate,
  getLocationLookupStatus,
  getRecentWeatherFormValues,
  getSupportedAutofillValues,
  isCurrentLocationRequest,
} from "../services/geospatialAutofill.js";

const SatelliteMapPicker = lazy(
  () => import("./SatelliteMapPicker.jsx"),
);

const DEFAULT_FEATURES = [
  { name: "N", label: "Nitrogen", min: 0, max: 140 },
  { name: "P", label: "Phosphorus", min: 5, max: 145 },
  { name: "K", label: "Potassium", min: 5, max: 205 },
  { name: "temperature", label: "Temperature", min: 8.825674745, max: 43.67549305 },
  { name: "humidity", label: "Humidity", min: 14.25803981, max: 99.98187601 },
  { name: "ph", label: "Soil pH", min: 3.504752314, max: 9.93509073 },
  { name: "rainfall", label: "Rainfall", min: 20.21126747, max: 298.5601175 },
];

const UNITS = {
  temperature: "°C",
  humidity: "%",
  rainfall: "mm",
};

const CONTEXT_FIELDS = [
  { name: "district", label: "District", type: "text" },
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
  const [values, setValues] = useState({});
  const [context, setContext] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [geospatial, setGeospatial] = useState(null);
  const [climate, setClimate] = useState(null);
  const [recentWeather, setRecentWeather] = useState(null);
  const [geospatialLoading, setGeospatialLoading] = useState(false);
  const [geospatialError, setGeospatialError] = useState("");
  const [climateError, setClimateError] = useState("");
  const [recentWeatherError, setRecentWeatherError] = useState("");
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [estimatesAcknowledged, setEstimatesAcknowledged] = useState(false);
  const [estimatedFields, setEstimatedFields] = useState([]);
  const [recentWeatherFields, setRecentWeatherFields] = useState([]);
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
    climate,
    recentWeather,
  );

  function updateValue(name, rawValue) {
    manuallyEditedFields.current.add(name);
    setValues((previous) => ({ ...previous, [name]: rawValue }));
    setEstimatedFields((previous) => previous.filter((field) => field !== name));
    setRecentWeatherFields((previous) => previous.filter((field) => field !== name));
    setEstimatesAcknowledged(false);
  }

  function applyRecentWeatherValues(weather) {
    const weatherInputs = getRecentWeatherFormValues(
      weather,
      manuallyEditedFields.current,
    );
    setValues((previous) => ({ ...previous, ...weatherInputs }));
    setRecentWeatherFields(Object.keys(weatherInputs));
  }

  function applyLocationValues(estimate, weather = recentWeather) {
    const supportedInputs = getSupportedAutofillValues(
      estimate.inputs,
      available.map((feature) => feature.name),
      manuallyEditedFields.current,
    );
    const weatherInputs = getRecentWeatherFormValues(
      weather,
      manuallyEditedFields.current,
    );
    setValues((previous) => ({
      ...getLocationInputUpdate(
        previous,
        [...estimatedFields, ...recentWeatherFields],
        estimate.inputs,
        available.map((feature) => feature.name),
        manuallyEditedFields.current,
      ),
      ...weatherInputs,
    }));
    setContext((previous) => ({
      ...previous,
      latitude: String(estimate.latitude),
      longitude: String(estimate.longitude),
    }));
    setEstimatedFields(Object.keys(supportedInputs));
    setRecentWeatherFields(Object.keys(weatherInputs));
    if (Object.keys(supportedInputs).length) setEstimatesAcknowledged(false);
  }

  function resetInputsToLocationData() {
    manuallyEditedFields.current.clear();
    const supportedInputs = geospatial
      ? getSupportedAutofillValues(
        geospatial.inputs,
        available.map((feature) => feature.name),
        manuallyEditedFields.current,
      )
      : {};
    const weatherInputs = getRecentWeatherFormValues(
      recentWeather,
      manuallyEditedFields.current,
    );
    autoFillEnabledRef.current = true;
    setAutoFillEnabled(true);
    setValues({ ...supportedInputs, ...weatherInputs });
    setEstimatedFields(Object.keys(supportedInputs));
    setRecentWeatherFields(Object.keys(weatherInputs));
    setEstimatesAcknowledged(false);
    setError("");
  }

  function selectLocation(nextLocation) {
    const requestId = ++locationRequestId.current;
    setLocation(nextLocation);
    setGeospatial(null);
    setClimate(null);
    setRecentWeather(null);
    setGeospatialError("");
    setClimateError("");
    setRecentWeatherError("");
    setGeospatialLoading(true);
    setValues((previous) => getLocationInputUpdate(
      previous,
      [...estimatedFields, ...recentWeatherFields],
      {},
      available.map((feature) => feature.name),
      manuallyEditedFields.current,
    ));
    setEstimatedFields([]);
    setRecentWeatherFields([]);
    setEstimatesAcknowledged(false);
    setContext((previous) => ({
      ...previous,
      latitude: String(nextLocation.latitude),
      longitude: String(nextLocation.longitude),
    }));
    window.clearTimeout(locationLookupTimer.current);
    locationLookupTimer.current = window.setTimeout(async () => {
      try {
        const lookup = await api.geospatialLocalLookup(
          nextLocation.latitude,
          nextLocation.longitude,
        );
        if (!isCurrentLocationRequest(locationRequestId.current, requestId)) return;
        if (lookup.soil) {
          setGeospatial(lookup.soil);
        } else {
          setGeospatialError(lookup.soil_error);
        }
        if (lookup.climate) {
          setClimate(lookup.climate);
        } else {
          setClimateError(lookup.climate_error);
        }
        if (lookup.recent_weather) {
          setRecentWeather(lookup.recent_weather);
        } else {
          setRecentWeatherError(lookup.recent_weather_error);
        }
        if (autoFillEnabledRef.current) {
          if (lookup.soil) {
            applyLocationValues(lookup.soil, lookup.recent_weather);
          } else if (lookup.recent_weather) {
            applyRecentWeatherValues(lookup.recent_weather);
          }
        }
      } catch (reason) {
        if (isCurrentLocationRequest(locationRequestId.current, requestId)) {
          const message = reason instanceof Error
            ? reason.message
            : "The local location lookup failed.";
          setGeospatialError(message);
          setClimateError(message);
          setRecentWeatherError(message);
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
    if (estimatedFields.length > 0 && !estimatesAcknowledged) {
      setError("Review the location estimates and confirm their limitations before using them.");
      return;
    }
    if (recentWeatherFields.length > 0) {
      setError(
        `Replace the NASA POWER daily estimate${recentWeatherFields.length === 1 ? "" : "s"} for ${recentWeatherFields.join(", ")} with values matching the crop model's undocumented weather aggregation before prediction.`,
      );
      return;
    }
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
      if (
        geospatial
        && (
          estimatedFields.length > 0
          || Object.keys(geospatial.context_properties ?? {}).length > 0
        )
      ) {
        advisoryContext.geospatial_estimate = {
          source: geospatial.provenance?.dataset_name ?? "local soil dataset",
          properties: Object.fromEntries(
            estimatedFields.map((name) => [name, geospatial.properties[name]]),
          ),
          context_properties: geospatial.context_properties ?? {},
          unavailable_properties: geospatial.unavailable_properties,
          provenance: geospatial.provenance,
          user_reviewed: estimatesAcknowledged,
        };
      }
      if (recentWeather || climate) {
        advisoryContext.weather_context = {
          recent_daily_estimate: recentWeather,
          historical_monthly_normals: climate,
          model_compatible: false,
        };
      }
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
          Random Forest. Training-data ranges are shown for reference; values
          outside those bounds are allowed but flagged in the results.
        </p>
        <p className="geospatial-result-note">
          Map lookup reads installed local soil and climate datasets through the
          backend. It also requests recent daily weather from the NASA POWER
          API; those values are displayed as dated MERRA-2 estimates and must be
          replaced with training-compatible inputs before prediction. Historical
          monthly normals remain separate context. Map imagery still requires
          an internet connection.
        </p>
      </div>
      <Suspense fallback={<div className="satellite-map-loading" role="status">Loading satellite map…</div>}>
        <SatelliteMapPicker
          location={location}
          placeName={context.village ?? ""}
          onPlaceNameChange={(village) => setContext((previous) => ({ ...previous, village }))}
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
      {geospatial && (
        <section className="geospatial-estimate-panel" aria-label="Geospatial estimates">
          <div className="geospatial-estimate-heading">
            <div>
                  <p className="eyebrow">LOCAL DATA · {geospatial.dataset_status.replaceAll("_", " ")}</p>
                  <h3>{geospatial.provenance?.dataset_name ?? "Local soil lookup"}</h3>
            </div>
                <span className="geospatial-fallback-badge">
                  {geospatial.available_properties.length
                    ? `${geospatial.available_properties.length} model input ${geospatial.available_properties.length === 1 ? "estimate" : "estimates"} found`
                    : Object.keys(geospatial.context_properties ?? {}).length
                      ? "Context data only; no model inputs"
                      : "No mapped values available"}
                </span>
          </div>
          <p>{geospatial.warnings.join(" ")}</p>
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
              {geospatial.nutrient_availability && (
                <div aria-label="Local NPK availability">
                  {["N", "P", "K"].map((name) => {
                    const nutrient = geospatial.nutrient_availability[name];
                    return (
                      <p className="geospatial-source" key={name}>
                        {name} model input: {nutrient.status.replaceAll("_", " ")}.
                        {nutrient.reason ? ` ${nutrient.reason}` : ""}
                        {nutrient.missing_requirements?.length
                          ? ` Data still required: ${nutrient.missing_requirements.join(" ")}`
                          : ""}
                        {nutrient.source ? ` Source: ${nutrient.source}.` : ""}
                        {nutrient.units ? ` Units: ${nutrient.units}.` : ""}
                        {nutrient.spatial_resolution_m
                          ? ` Resolution: ${nutrient.spatial_resolution_m} m.`
                          : ""}
                        {nutrient.soil_depth_cm
                          ? ` Depth: ${Array.isArray(nutrient.soil_depth_cm)
                            ? nutrient.soil_depth_cm.join("–")
                            : nutrient.soil_depth_cm} cm.`
                          : ""}
                        {nutrient.value_type
                          ? ` Data type: ${nutrient.value_type.replaceAll("_", " ")}.`
                          : ""}
                      </p>
                    );
                  })}
                </div>
              )}
          <label className="geospatial-toggle">
            <input
              type="checkbox"
              checked={autoFillEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                autoFillEnabledRef.current = enabled;
                setAutoFillEnabled(enabled);
                if (enabled && geospatial) {
                  applyLocationValues(geospatial, recentWeather);
                } else if (enabled && recentWeather) {
                  applyRecentWeatherValues(recentWeather);
                } else if (!enabled) {
                  setValues((previous) => Object.fromEntries(
                    Object.entries(previous).filter(([name]) => (
                      !estimatedFields.includes(name)
                      && !recentWeatherFields.includes(name)
                    )),
                  ));
                  setEstimatedFields([]);
                  setRecentWeatherFields([]);
                  setEstimatesAcknowledged(false);
                }
              }}
            />
            <span>Auto-fill supported soil values and recent weather estimates</span>
          </label>
          {!autoFillEnabled && (
            <button
              className="button button-quiet no-print"
              type="button"
              onClick={() => {
                if (geospatial) applyLocationValues(geospatial, recentWeather);
                else applyRecentWeatherValues(recentWeather);
              }}
            >
              Apply location estimates
            </button>
          )}
          {estimatedFields.length > 0 && (
            <label className="geospatial-confirmation">
              <input
                type="checkbox"
                checked={estimatesAcknowledged}
                onChange={(event) => setEstimatesAcknowledged(event.target.checked)}
              />
              <span>
                I reviewed the local dataset values and understand that mapped estimates
                may not be direct field measurements and none guarantee crop suitability.
              </span>
            </label>
          )}
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
                {geospatial.properties[feature.name].source} · {geospatial.properties[feature.name].value_type.replaceAll("_", " ")}
                {" · "}{geospatial.properties[feature.name].units}
                {" · depth "}{Array.isArray(geospatial.properties[feature.name].soil_depth_cm)
                  ? geospatial.properties[feature.name].soil_depth_cm.join("–")
                  : geospatial.properties[feature.name].soil_depth_cm} cm
              </small>
            )}
            {recentWeatherFields.includes(feature.name) && (
              <small className="geospatial-source">
                NASA POWER daily mapped estimate ·{" "}
                {recentWeather.observations[feature.name].observation_date}
                {" · "}{recentWeather.observations[feature.name].data_delay_days} days old
                {" · "}{recentWeather.observations[feature.name].units}
                {" · model aggregation unverified; replace before prediction"}
              </small>
            )}
            {manuallyEditedFields.current.has(feature.name) && (
              <small className="geospatial-source">Manually entered or edited</small>
            )}
            {geospatial?.unavailable_properties.includes(feature.name) && (
              <small className="geospatial-source">
                {["temperature", "humidity", "rainfall"].includes(feature.name)
                  ? recentWeatherFields.includes(feature.name)
                    ? "A recent gridded NASA POWER estimate is shown above. The crop model's weather period and aggregation are undocumented, so replace this value with one matching your prediction use."
                    : climate?.status === "available" || climate?.status === "partial"
                      ? "Historical climate normals are displayed separately as context only; they are not compatible with the undocumented model weather period. Enter a compatible value manually."
                      : climate
                        ? getClimateLookupStatus(climate)
                        : "Select a map location to check recent and historical climate coverage, or enter this value manually."
                  : feature.name === "N"
                    ? geospatial.nutrient_availability?.N?.reason
                      ?? "The local raster contains total nitrogen, which is not compatible with this model's N feature. Enter a validated soil-test value."
                    : ["P", "K"].includes(feature.name)
                      ? geospatial.nutrient_availability?.[feature.name]?.reason
                        ?? "No compatible local phosphorus or potassium measurement is installed. Enter a soil-test value manually."
                      : "No valid local pH raster value is available at this point; enter a soil test result manually."}
              </small>
            )}
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
      {location && (
        <section className="geospatial-estimate-panel weather-context-panel" aria-label="Recent NASA POWER daily weather">
          <div className="geospatial-estimate-heading">
            <div>
              <p className="eyebrow">RECENT DAILY WEATHER · MODELLED ESTIMATE</p>
              <h3>{recentWeather?.dataset_name ?? "NASA POWER Daily API"}</h3>
            </div>
            <span className="geospatial-fallback-badge">
              {recentWeather?.status?.replaceAll("_", " ")
                ?? (geospatialLoading ? "looking up" : "unavailable")}
            </span>
          </div>
          {recentWeatherError && (
            <p className="alert alert-error" role="alert">{recentWeatherError}</p>
          )}
          {recentWeather && (
            <>
              <p>{recentWeather.warning}</p>
              {recentWeather.requested_period && (
                <p>
                  Requested daily period: {recentWeather.requested_period.start_date}
                  {"–"}{recentWeather.requested_period.end_date} (UTC).
                  {recentWeather.latest_observation_date
                    ? ` Newest valid observation: ${recentWeather.latest_observation_date}, ${recentWeather.data_delay_days} days before retrieval. NASA near-real-time availability varies; only dates returned with valid values are shown.`
                    : " No valid daily observations were returned for this period."}
                </p>
              )}
              {recentWeather.api_coordinates && (
                <p>
                  Coordinates reported by POWER: {recentWeather.api_coordinates.latitude.toFixed(3)},
                  {" "}{recentWeather.api_coordinates.longitude.toFixed(3)}.
                  {" "}MERRA-2 native grid spacing is approximately 0.5° latitude × 0.625° longitude.
                </p>
              )}
              <div className="climate-month-grid" role="table" aria-label="Recent daily weather estimates">
                <div className="climate-month-header" role="row">
                  <strong role="columnheader">Model feature</strong>
                  <strong role="columnheader">Recent value</strong>
                  <strong role="columnheader">Date</strong>
                  <strong role="columnheader">Unit</strong>
                </div>
                {[
                  ["temperature", "Temperature"],
                  ["humidity", "Relative humidity"],
                  ["rainfall", "Precipitation"],
                ].map(([name, label]) => {
                  const observation = recentWeather.observations[name];
                  return (
                    <div className="climate-month-row" role="row" key={name}>
                      <span role="cell">{label}</span>
                      <span role="cell">{observation?.value ?? "Unavailable"}</span>
                      <span role="cell">{observation?.observation_date ?? "—"}</span>
                      <span role="cell">{observation?.units ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
              <p>
                Source: <a href={recentWeather.source_url} target="_blank" rel="noreferrer">{recentWeather.source}</a>
                {" · "}Source data are gridded MERRA-2 reanalysis/model estimates, not local weather-station measurements.
                {" "}The form previews these values; replace them with model-compatible inputs before prediction.
              </p>
            </>
          )}
        </section>
      )}
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
      <button className="button button-primary button-wide" disabled={loading || geospatialLoading} type="submit">
        {loading ? <><LoaderCircle className="spin" size={18} /> Analyzing your conditions...</> :
          <>Analyze &amp; Recommend <ArrowRight size={18} /></>}
      </button>
    </form>
  );
}
