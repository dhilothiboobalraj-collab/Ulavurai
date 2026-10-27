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
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const weatherRequestId = useRef(0);

  async function loadWeather(location) {
    const currentRequestId = ++weatherRequestId.current;
    setError("");
    setWeather(null);
    setLoading(true);
    try {
      const query = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: "temperature_2m,relative_humidity_2m,precipitation",
        daily: "precipitation_sum",
        forecast_days: "7",
        timezone: "auto",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
      if (!response.ok) throw new Error(`Weather service returned ${response.status}.`);
      const result = await response.json();
      if (!result.current || !result.daily) {
        throw new Error("Weather service returned incomplete current conditions.");
      }
      if (weatherRequestId.current === currentRequestId) {
        setWeather({
          latitude: location.latitude,
          longitude: location.longitude,
          current: result.current,
          daily: result.daily,
        });
      }
    } catch (reason) {
      if (weatherRequestId.current === currentRequestId) {
        setError(`Could not load local weather: ${errorMessage(reason)}`);
      }
    } finally {
      if (weatherRequestId.current === currentRequestId) setLoading(false);
    }
  }

  function selectLocation(location) {
    weatherRequestId.current += 1;
    setSelectedLocation(location);
    setWeather(null);
    setError("");
    setLoading(false);
  }

  function detectLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const location = { latitude: coords.latitude, longitude: coords.longitude };
      selectLocation(location);
      setLocating(false);
      await loadWeather(location);
    }, (reason) => {
      setError(`Location unavailable: ${reason.message}`);
      setLocating(false);
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  const rainfall = weather?.daily?.precipitation_sum
    ?.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  return (
    <section className="panel toolkit-card">
      <p className="eyebrow"><MapPin size={14} /> LOCAL WEATHER</p>
      <h2>Weather near you</h2>
      <p className="muted">Click the satellite map to mark a field, or use your browser location. The map loads Esri imagery; marked coordinates are sent to Open-Meteo only when you request a forecast.</p>
      <SatelliteLocationPicker
        selectedLocation={selectedLocation}
        onSelectLocation={selectLocation}
        label="Satellite map of Tamil Nadu. Click to mark a location."
      />
      <p className="muted">
        {selectedLocation
          ? `Marked location: ${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`
          : "Click the map to mark a location for the forecast."}
      </p>
      <div className="toolkit-weather-actions no-print">
        <button className="button button-quiet" type="button" onClick={detectLocation} disabled={loading || locating}>
          <MapPin size={17} /> {locating ? "Finding your location…" : "Use my location"}
        </button>
        <button className="button button-primary" type="button" onClick={() => loadWeather(selectedLocation)} disabled={!selectedLocation || loading || locating}>
          <CloudSun size={17} /> {loading ? "Loading weather…" : "Load weather for marked point"}
        </button>
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {weather && (
        <>
          <div className="toolkit-weather-values">
            <div><span>Current temperature</span><strong>{weather.current.temperature_2m} °C</strong></div>
            <div><span>Relative humidity</span><strong>{weather.current.relative_humidity_2m}%</strong></div>
            <div><span>Current precipitation</span><strong>{weather.current.precipitation} mm</strong></div>
            <div><span>Next 7 days precipitation</span><strong>{rainfall?.toFixed(1)} mm</strong></div>
          </div>
          <p className="muted">Coordinates: {weather.latitude.toFixed(4)}, {weather.longitude.toFixed(4)}. A short forecast is not a substitute for the model’s rainfall input or long-term climate averages.</p>
          <p className="muted">
            These current conditions are contextual weather estimates only and
            are not applied to the crop-model what-if inputs.
          </p>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Weather data by Open-Meteo.com
          </a>
          {" · "}
          <a href="https://open-meteo.com/en/licence" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
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
          <p>Change the measurements to preview model scores, check local weather, and prepare a planning report.</p>
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
