import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  MapPin,
  Mic,
  MicOff,
  Sprout,
  CloudSun,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import SatelliteLocationPicker from "../components/SatelliteLocationPicker.jsx";

const UNITS = {
  N: "",
  P: "",
  K: "",
  temperature: "°C",
  humidity: "%",
  ph: "",
  rainfall: "mm",
};
const LEGUMES = new Set([
  "blackgram",
  "chickpea",
  "groundnut",
  "kidneybeans",
  "lentil",
  "mothbeans",
  "mungbean",
  "pigeonpeas",
  "soybean",
]);

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function VoiceValues({ features, onValues }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSupported(Boolean(
      window.SpeechRecognition || window.webkitSpeechRecognition,
    ));
    return () => recognitionRef.current?.stop();
  }, []);

  function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Speech recognition is not available in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const numbers = transcript.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (numbers.length !== features.length) {
        setMessage(`Heard “${transcript}”. Please speak exactly ${features.length} numbers in this order: N, P, K, temperature, humidity, pH, rainfall.`);
        return;
      }
      const outsideRange = features.filter((feature, index) =>
        numbers[index] < feature.min || numbers[index] > feature.max);
      if (outsideRange.length) {
        setMessage(`Spoken values are outside the training-data range for ${outsideRange.map((item) => item.name).join(", ")}. Enter those values manually.`);
        return;
      }
      onValues(Object.fromEntries(features.map((feature, index) => [
        feature.name,
        numbers[index],
      ])));
      setMessage(`Captured ${features.length} values.`);
    };
    recognition.onerror = (event) => {
      setMessage(`Speech recognition failed: ${event.error}.`);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setMessage("");
    setListening(true);
    try {
      recognition.start();
    } catch (error) {
      setListening(false);
      setMessage(`Could not start speech recognition: ${errorMessage(error)}`);
    }
  }

  return (
    <div className="toolkit-voice no-print">
      <button
        className="button button-quiet"
        type="button"
        onClick={listening ? () => recognitionRef.current?.stop() : startListening}
        disabled={!supported}
      >
        {listening ? <MicOff size={17} /> : <Mic size={17} />}
        {listening ? "Stop listening" : "Speak 7 measurements"}
      </button>
      {!supported && <p className="muted">Speech recognition is not supported by this browser.</p>}
      {supported && <p className="muted">Speak seven numeric values in English, in the order N, P, K, temperature, humidity, pH, rainfall.</p>}
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}

function WeatherCard() {
  const [climate, setClimate] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const climateRequestId = useRef(0);

  async function loadClimate(location) {
    const currentRequestId = ++climateRequestId.current;
    setError("");
    setClimate(null);
    setLoading(true);
    try {
      const result = await api.localClimateLookup(location.latitude, location.longitude);
      if (climateRequestId.current === currentRequestId) {
        setClimate(result);
      }
    } catch (reason) {
      if (climateRequestId.current === currentRequestId) {
        setError(`Could not load the installed local climate data: ${errorMessage(reason)}`);
      }
    } finally {
      if (climateRequestId.current === currentRequestId) setLoading(false);
    }
  }

  function selectLocation(location) {
    climateRequestId.current += 1;
    setSelectedLocation(location);
    setClimate(null);
    setError("");
    setLoading(false);
    if (location) void loadClimate(location);
  }

  function detectLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const location = { latitude: coords.latitude, longitude: coords.longitude };
      selectLocation(location);
      setLocating(false);
    }, (reason) => {
      setError(`Location unavailable: ${reason.message}`);
      setLocating(false);
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  return (
    <section className="panel toolkit-card">
      <p className="eyebrow"><MapPin size={14} /> HISTORICAL LOCAL CLIMATE</p>
      <h2>Climate context near your field</h2>
      <p className="muted">Select a point on the satellite or normal map to query the installed historical dataset. Historical monthly averages are not live weather or a forecast.</p>
      <SatelliteLocationPicker
        selectedLocation={selectedLocation}
        onSelectLocation={selectLocation}
        label="Interactive map. Click to select a location."
      />
      <p className="muted">
        {selectedLocation
          ? `Marked location: ${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`
          : "Click the map to look up local historical climate."}
      </p>
      <div className="toolkit-weather-actions no-print">
        <button className="button button-quiet" type="button" onClick={detectLocation} disabled={loading || locating}>
          <MapPin size={17} /> {locating ? "Finding your location…" : "Use my location"}
        </button>
        <button className="button button-primary" type="button" onClick={() => selectedLocation && loadClimate(selectedLocation)} disabled={!selectedLocation || loading || locating}>
          <CloudSun size={17} /> {loading ? "Loading local data…" : "Refresh local climate"}
        </button>
      </div>
      {loading && <p className="muted" role="status">Reading local historical climate data…</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {climate && (
        <>
          <p className="muted">
            {climate.dataset_name} · {climate.reference_period
              ? `${climate.reference_period.start_year}–${climate.reference_period.end_year}`
              : "reference period unavailable"}
            {climate.grid_resolution_degrees
              ? ` · grid ${climate.grid_resolution_degrees.latitude}° × ${climate.grid_resolution_degrees.longitude}°`
              : ""}
            {climate.grid_location
              ? ` · nearest cell ${climate.grid_location.distance_m} m away`
              : ""}
          </p>
          <p className="muted" role="status">
            {climate.warning}
          </p>
          {Object.keys(climate.months).length > 0 && (
            <div className="climate-month-grid" role="table" aria-label="Historical monthly climate normals">
              <div className="climate-month-header" role="row">
                <strong role="columnheader">Month</strong>
                <strong role="columnheader">Mean temperature (°C)</strong>
                <strong role="columnheader">Mean humidity (%)</strong>
                <strong role="columnheader">Monthly rainfall (mm)</strong>
              </div>
              {Object.entries(climate.months).sort(([first], [second]) => first.localeCompare(second)).map(([month, values]) => (
                <div className="climate-month-row" role="row" key={month}>
                  <span role="cell">
                    {new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" })
                      .format(new Date(Date.UTC(2020, Number(month) - 1, 1)))}
                  </span>
                  <span role="cell">{values.temperature_c ?? "Unavailable"}</span>
                  <span role="cell">{values.relative_humidity_pct ?? "Unavailable"}</span>
                  <span role="cell">{values.precipitation_mm_month ?? "Unavailable"}</span>
                </div>
              ))}
            </div>
          )}
          <p className="muted">
            Source: {climate.source}. License: {climate.license}
          </p>
          {climate.source_url && (
            <a href={climate.source_url} target="_blank" rel="noreferrer">Dataset source and attribution</a>
          )}
        </>
      )}
    </section>
  );
}

export default function FieldToolkit() {
  const [features, setFeatures] = useState([]);
  const [crops, setCrops] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [values, setValues] = useState({});
  const [preview, setPreview] = useState(null);
  const [chosenCrop, setChosenCrop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [area, setArea] = useState("1");
  const [yieldPerHa, setYieldPerHa] = useState("2.5");
  const [pricePerQuintal, setPricePerQuintal] = useState("2500");
  const [costPerHa, setCostPerHa] = useState("25000");
  const requestId = useRef(0);

  useEffect(() => {
    Promise.all([api.features(), api.crops(), api.cropCalendar()])
      .then(([featureResponse, cropResponse, calendarResponse]) => {
        setFeatures(featureResponse.features);
        setValues(Object.fromEntries(featureResponse.features.map((feature) => [
          feature.name,
          feature.median,
        ])));
        setCrops(cropResponse.crops);
        setCalendar(calendarResponse);
      })
      .catch((reason) => setSourceError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    if (!features.length || Object.keys(values).length !== features.length) return undefined;
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      api.preview(values)
        .then((result) => {
          if (requestId.current === currentRequest) setPreview(result);
        })
        .catch((reason) => {
          if (requestId.current === currentRequest) setError(errorMessage(reason));
        })
        .finally(() => {
          if (requestId.current === currentRequest) setLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [features, values]);

  function updateValue(name, rawValue) {
    const value = Number(rawValue);
    if (Number.isFinite(value)) setValues((previous) => ({ ...previous, [name]: value }));
  }

  const crop = chosenCrop || preview?.best_crop || "";
  const duration = calendar?.crops?.find((item) => item.crop === crop)?.duration_days;
  const areaNumber = Number(area);
  const yieldNumber = Number(yieldPerHa);
  const priceNumber = Number(pricePerQuintal);
  const costNumber = Number(costPerHa);
  const gross = areaNumber * yieldNumber * 10 * priceNumber;
  const net = gross - areaNumber * costNumber;
  const profitReady = [areaNumber, yieldNumber, priceNumber, costNumber]
    .every((value) => Number.isFinite(value) && value >= 0) && areaNumber > 0;

  return (
    <div className="page field-toolkit">
      <header className="page-heading page-heading-row">
        <div>
          <p className="eyebrow"><Sprout size={14} /> ULAVURAI FIELD TOOLKIT</p>
          <h1>Explore your field scenario.</h1>
          <p>Change the measurements to preview model scores, review historical local climate context, and prepare a planning report.</p>
        </div>
        <button className="button button-primary no-print" type="button" onClick={() => window.print()}>
          <Download size={17} /> Print / Save report as PDF
        </button>
      </header>

      {sourceError && <div className="alert alert-error" role="alert">{sourceError}</div>}

      <div className="toolkit-grid">
        <section className="panel toolkit-card toolkit-controls">
          <p className="eyebrow">WHAT-IF PLAYGROUND</p>
          <h2>Adjust field measurements</h2>
          <p className="muted">Predictions update as you move a slider. Preview requests do not save prediction history.</p>
          {features.length > 0 && (
            <VoiceValues features={features} onValues={setValues} />
          )}
          <div className="toolkit-sliders">
            {features.map((feature) => (
              <label className="toolkit-slider" key={feature.name}>
                <span>
                  <strong>{feature.label}</strong>
                  <output htmlFor={`tool-${feature.name}`}>
                    {Number(values[feature.name] ?? feature.median).toFixed(2)}{UNITS[feature.name] ? ` ${UNITS[feature.name]}` : ""}
                  </output>
                </span>
                <input
                  id={`tool-${feature.name}`}
                  type="range"
                  min={feature.min}
                  max={feature.max}
                  step={["N", "P", "K", "rainfall"].includes(feature.name) ? "1" : "0.1"}
                  value={values[feature.name] ?? feature.median}
                  onChange={(event) => updateValue(feature.name, event.target.value)}
                  aria-label={`${feature.label} what-if value`}
                />
                <small>Training range: {feature.min.toFixed(1)} – {feature.max.toFixed(1)}{UNITS[feature.name] ? ` ${UNITS[feature.name]}` : ""}</small>
              </label>
            ))}
          </div>
        </section>

        <section className="panel toolkit-card toolkit-prediction">
          <p className="eyebrow">LIVE MODEL PREVIEW</p>
          <h2>{loading ? "Updating…" : preview?.best_crop ?? "Waiting for model"}</h2>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          {preview?.recommendations?.map((item) => (
            <div className="toolkit-probability" key={item.crop}>
              <div><span>{item.crop}</span><strong>{item.confidence.toFixed(1)}%</strong></div>
              <div className="toolkit-probability-track">
                <span style={{ width: `${Math.min(100, Math.max(0, item.confidence))}%` }} />
              </div>
            </div>
          ))}
          <p className="muted">Displayed values are model probability scores and are not calibrated measures of real-world success.</p>
          {preview?.best_crop && (
            <label className="field no-print">
              <span>Crop for planning sections</span>
              <select value={crop} onChange={(event) => setChosenCrop(event.target.value)}>
                {crops.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          )}
          <Link to="/predict" className="text-link no-print">Open full recommendation form</Link>
        </section>
      </div>

      <div className="toolkit-grid toolkit-lower">
        <WeatherCard />
        <section className="panel toolkit-card">
          <p className="eyebrow">PROFITABILITY SCENARIO · USER ESTIMATES</p>
          <h2>Explore a price scenario</h2>
          <p className="muted">This is arithmetic using your assumptions, not a yield or market-price forecast.</p>
          <div className="form-grid toolkit-assumptions">
            <label className="field"><span>Farm area (hectares)</span><input type="number" min="0.01" step="any" value={area} onChange={(event) => setArea(event.target.value)} /></label>
            <label className="field"><span>Assumed yield (tonnes/hectare)</span><input type="number" min="0" step="any" value={yieldPerHa} onChange={(event) => setYieldPerHa(event.target.value)} /></label>
            <label className="field"><span>Your price (₹/quintal)</span><input type="number" min="0" step="any" value={pricePerQuintal} onChange={(event) => setPricePerQuintal(event.target.value)} /></label>
            <label className="field"><span>Estimated costs (₹/hectare)</span><input type="number" min="0" step="any" value={costPerHa} onChange={(event) => setCostPerHa(event.target.value)} /></label>
          </div>
          {profitReady ? (
            <div className="toolkit-weather-values">
              <div><span>Estimated gross revenue</span><strong>₹{gross.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></div>
              <div><span>Estimated net after stated costs</span><strong>₹{net.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></div>
            </div>
          ) : <p className="alert alert-error" role="alert">Enter a positive farm area and non-negative numeric assumptions.</p>}
          <p className="muted">Formula: area × assumed tonnes/ha × 10 quintals/tonne × entered price; net subtracts entered costs. No live mandi prices or trained yield data are used.</p>
        </section>
      </div>

      <div className="toolkit-grid toolkit-lower">
        <section className="panel toolkit-card">
          <p className="eyebrow"><Sprout size={14} /> COMPANION-CROP STARTING POINT</p>
          <h2>{crop ? `Planning around ${crop}` : "Companion crop ideas"}</h2>
          <p>{crop
            ? LEGUMES.has(crop.toLowerCase())
              ? "This crop is a legume in this general guide. Consider a cereal partner such as maize, sorghum, or ragi only after checking local planting compatibility."
              : "General idea: consider a legume such as blackgram, soybean, or groundnut alongside a non-legume crop, subject to local spacing, water, and season guidance."
            : "Get a model preview to see a general companion-crop starting point."}</p>
          <p className="muted">These are broad intercropping ideas, not combinations validated by this dataset or for your district. Confirm variety, spacing, timing, and local suitability with an agricultural extension officer.</p>
        </section>
        <section className="panel toolkit-card">
          <p className="eyebrow"><CalendarDays size={14} /> CROP PLANNING TIMELINE</p>
          <h2>{crop ? `${crop} · ${duration ? `${duration} days` : "duration unavailable"}` : "Crop lifecycle"}</h2>
          {duration ? (
            <ol className="toolkit-timeline">
              <li><strong>Day 0</strong><span>Sowing / establishment checkpoint</span></li>
              <li><strong>Day {Math.round(duration * 0.25)}</strong><span>Growth and soil-condition check</span></li>
              <li><strong>Day {Math.round(duration * 0.65)}</strong><span>Flowering / crop-health observation</span></li>
              <li><strong>Day {duration}</strong><span>Approximate duration reference; check harvest readiness locally</span></li>
            </ol>
          ) : (
            <p className="muted">No duration is available in the current TNAU water-requirement reference for this crop.</p>
          )}
          <p className="muted">{calendar?.note ?? "Planning reference only; not a local calendar."} No fertilizer doses or region-specific sowing months are inferred.</p>
          {calendar?.source?.url && <a className="text-link no-print" href={calendar.source.url} target="_blank" rel="noreferrer">Source: {calendar.source.title}</a>}
        </section>
      </div>
    </div>
  );
}
