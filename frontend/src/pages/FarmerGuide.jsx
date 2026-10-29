import { lazy, Suspense, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CloudSun,
  Home,
  LoaderCircle,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import FarmerQuestionCard from "../components/FarmerQuestionCard.jsx";
import FarmerResult from "../components/FarmerResult.jsx";
import FarmerMeasurements from "../components/FarmerMeasurements.jsx";
import FarmerCropRecommendations from "../components/FarmerCropRecommendations.jsx";
import ProgressIndicator from "../components/ProgressIndicator.jsx";
import { api } from "../services/api.js";
import { TAMIL_NADU_DISTRICTS } from "../services/farmerCropRecommendations.js";

const SatelliteLocationPicker = lazy(
  () => import("../components/SatelliteLocationPicker.jsx"),
);

const DISTRICTS = TAMIL_NADU_DISTRICTS;

const TEXT = {
  ta: {
    title: "எளிய விவசாயி வழிகாட்டி",
    intro: "சில எளிய கேள்விகளுக்கு பதில் சொல்லுங்கள்.",
    language: "மொழியை தேர்வு செய்யவும்",
    district: "உங்கள் மாவட்டம்?",
    districtHint: "உங்கள் மாவட்டத்தை பட்டியலில் தேர்வு செய்யுங்கள்.",
    fieldLocation: "உள்ளூர் ஆயத்தொலைவு கட்டத்தில் உங்கள் வயலைக் குறிக்கவும் (விருப்பம்)",
    mapHint: "செயற்கைக்கோள் அல்லது சாதாரண வரைபடத்தைத் தேர்ந்தெடுத்து உங்கள் வயலைத் தொடுங்கள். உள்ளூர் மண் தரவு இருந்தால் மட்டும் அதைப் பயன்படுத்தும்.",
    markedLocation: "குறிக்கப்பட்ட இடம்",
    useMyLocation: "என் இருப்பிடத்தைப் பயன்படுத்து",
    locationUnavailable: "உங்கள் இருப்பிடத்தைப் பெற முடியவில்லை.",
    loadingEstimate: "இருப்பிடத் தரவைப் பெறுகிறோம்…",
    estimateFailed: "இருப்பிடத் தரவைப் பெற முடியவில்லை. அளவீடுகளை கைமுறையாக உள்ளிடலாம்.",
    locationEstimates: "உள்ளூர் மண் தரவு",
    modelInputsNotFilled: "உள்ளூர் தரவில் உள்ள மண் மதிப்புகள் மட்டும் நிரப்பப்படும். வெப்பநிலை, ஈரப்பதம், மழை ஆகியவற்றை கைமுறையாக உள்ளிடவும்.",
    soil: "உங்கள் நிலத்தின் மண் எது?",
    water: "தண்ணீர் வசதி எப்படி உள்ளது?",
    problem: "இப்போது என்ன பிரச்சனை உள்ளது?",
    goal: "உங்களுக்கு முக்கியமானது எது?",
    back: "பின் செல்ல",
    next: "தொடரவும்",
    home: "முகப்பு",
    submit: "எனது வழிகாட்டியைப் பாருங்கள்",
    sending: "உங்கள் பதில்களைச் சேமிக்கிறோம்…",
    chooseDistrict: "மாவட்டத்தைத் தேர்வு செய்யுங்கள்",
    error: "மன்னிக்கவும். பரிந்துரையை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    retry: "மீண்டும் முயற்சிக்கவும்",
    langTamil: "தமிழ்",
    langEnglish: "English",
    quickTitle: "விரைவு விவசாய வழிகாட்டல்",
    quickDescription: "உங்கள் பதில்களின் அடிப்படையில் பாதுகாப்பான பொதுவழிகாட்டல். இது AI பயிர் கணிப்பு அல்ல.",
    quickAction: "விரைவு வழிகாட்டலைப் பெறுங்கள்",
    aiTitle: "AI பயிர் பரிந்துரை",
    aiDescription: "ஏற்கனவே உள்ள AI மாதிரிக்கு N, P, K, pH, வெப்பநிலை, ஈரப்பதம், மழை ஆகிய 7 உண்மையான அளவீடுகளும் தேவை.",
    aiAction: "7 அளவீடுகளை உள்ளிடுங்கள்",
    optionsTitle: "உங்களுக்கு தேவையான வழியைத் தேர்வு செய்யுங்கள்",
    backToOptions: "வழி தேர்வுக்குத் திரும்பு",
    simpleEyebrow: "தமிழில் எளிய பயிர் பரிந்துரை",
    simpleTitle: "மண் ஆய்வக எண்கள் தெரிய வேண்டியதில்லை",
    simpleDescription: "மாவட்டம், விவசாயப் பிரச்சினை, இலக்கு மற்றும் விருப்பத் தகவலைத் தேர்வு செய்து ஆதார வரம்புகளுடன் பயிர் விருப்பங்களைப் பாருங்கள்.",
    simpleAction: "பயிர் பரிந்துரை பெறுக",
    simpleBack: "வழிகாட்டி தேர்வுக்குத் திரும்பு",
  },
  en: {
    title: "Easy Farmer Guide",
    intro: "Answer a few simple questions.",
    language: "Choose your language",
    district: "Which district are you in?",
    districtHint: "Choose your district from the list.",
    fieldLocation: "Select your field coordinates (optional)",
    mapHint: "Choose the satellite or normal map and click your field. Soil values are shown only when the installed local dataset covers the selected point.",
    markedLocation: "Marked location",
    useMyLocation: "Use my location",
    locationUnavailable: "Could not get your location.",
    loadingEstimate: "Loading location estimates…",
    estimateFailed: "Could not load location estimates. You can still enter measurements manually.",
    locationEstimates: "Local soil dataset",
    modelInputsNotFilled: "Only soil values present in the local dataset are filled. Enter temperature, humidity and rainfall manually.",
    soil: "What soil is in your field?",
    water: "How much water is available?",
    problem: "What problem do you see now?",
    goal: "What matters most to you?",
    back: "Back",
    next: "Continue",
    home: "Home",
    submit: "Show my guide",
    sending: "Saving your answers…",
    chooseDistrict: "Choose a district",
    error: "Sorry, we could not create the guide. Please try again.",
    retry: "Try again",
    langTamil: "தமிழ்",
    langEnglish: "English",
    quickTitle: "Quick Farmer Guidance",
    quickDescription: "Safe general guidance based on your answers. This is not an AI crop prediction.",
    quickAction: "Get Quick Guidance",
    aiTitle: "AI Crop Recommendation",
    aiDescription: "The existing AI model needs all 7 measured values: N, P, K, pH, temperature, humidity and rainfall.",
    aiAction: "Enter the 7 measurements",
    optionsTitle: "Choose the guidance you need",
    backToOptions: "Back to the choices",
    simpleEyebrow: "Simple crop recommendations",
    simpleTitle: "No need to know laboratory measurements",
    simpleDescription: "Choose your district, farming challenge, goal and any optional details to explore crop options with clear source limitations.",
    simpleAction: "Get Crop Recommendations",
    simpleBack: "Back to the farmer guide",
  },
};

const DISTRICT_TA = Object.fromEntries(DISTRICTS.map(([code, tamil]) => [code, tamil]));
const EMPTY_MEASUREMENT_VALUES = {};
const ICONS = {
  ta: {
    soil: ["🔴", "⚫", "🟤", "🏖️", "❓"],
    water: ["💧", "💧💧", "💧💧💧", "🌧️"],
    weather: ["🌧️", "🌊", "☀️", "🐛", "😊"],
    goals: ["🛡️", "💰", "💧", "⏱️"],
  },
  en: {
    soil: ["🔴", "⚫", "🟤", "🏖️", "❓"],
    water: ["💧", "💧💧", "💧💧💧", "🌧️"],
    weather: ["🌧️", "🌊", "☀️", "🐛", "😊"],
    goals: ["🛡️", "💰", "💧", "⏱️"],
  },
};

function questionOptions(language, stage) {
  const tamil = language === "ta";
  const icons = ICONS[language];
  const definitions = {
    0: [],
    2: [
      ["red_loam", tamil ? "செம்மண்" : "Red soil"],
      ["black", tamil ? "கரிசல் மண்" : "Black soil"],
      ["clay", tamil ? "களிமண்" : "Clay soil"],
      ["sandy", tamil ? "மணல் மண்" : "Sandy soil"],
      ["unknown", tamil ? "தெரியவில்லை" : "Don't know"],
    ],
    3: [
      ["low", tamil ? "குறைந்த தண்ணீர்" : "Little water"],
      ["medium", tamil ? "நடுத்தர தண்ணீர்" : "Medium water"],
      ["high", tamil ? "போதுமான தண்ணீர்" : "Enough water"],
      ["rainfed", tamil ? "மழை மட்டும்" : "Rain only"],
    ],
    4: [
      ["delayed_rain", tamil ? "மழை இல்லை" : "No rain"],
      ["heavy_rain", tamil ? "அதிக மழை" : "Heavy rain"],
      ["heat_risk", tamil ? "அதிக வெப்பம்" : "Too much heat"],
      ["pest_risk", tamil ? "பூச்சி பிரச்சனை" : "Pest problem"],
      ["normal", tamil ? "பிரச்சனை இல்லை" : "No problem"],
    ],
    5: [
      ["safe", tamil ? "பாதுகாப்பான பயிர்" : "Safe crop"],
      ["profit", tamil ? "அதிக வருமானம்" : "More income"],
      ["low_water", tamil ? "குறைந்த தண்ணீர்" : "Less water"],
      ["short_duration", tamil ? "விரைவான அறுவடை" : "Fast harvest"],
    ],
  };
  const iconSets = { 2: icons.soil, 3: icons.water, 4: icons.weather, 5: icons.goals };
  return (definitions[stage] ?? []).map(([value, title], index) => ({
    value,
    title,
    icon: iconSets[stage][index],
  }));
}

export default function FarmerGuide() {
  const [language, setLanguage] = useState("ta");
  const [simpleRecommendationsOpen, setSimpleRecommendationsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    district: "",
    soil_choice: "",
    water_choice: "",
    weather_problem: "",
    farmer_goal: "",
    latitude: null,
    longitude: null,
  });
  const [result, setResult] = useState(null);
  const [modelInputs, setModelInputs] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationEstimate, setLocationEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const locationRequestId = useRef(0);
  const text = TEXT[language];
  const selectedDistrict = DISTRICTS.find(([code]) => code === selections.district);
  const selectionForQuestions = { ...selections, language };

  const titles = [
    text.language,
    text.district,
    text.soil,
    text.water,
    text.problem,
    text.goal,
  ];
  const localizedError = language === "ta"
    ? "மன்னிக்கவும். பரிந்துரையை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
    : "Sorry, we could not generate the recommendation. Please try again.";

  async function getRecommendation(measuredInputs = null) {
    setError("");
    setLoading(true);
    try {
      const response = await api.farmerPredict({
        language,
        district: selections.district,
        soil_choice: selections.soil_choice,
        water_choice: selections.water_choice,
        weather_problem: selections.weather_problem,
        farmer_goal: selections.farmer_goal,
        ...(selections.latitude !== null && selections.longitude !== null
          ? { latitude: selections.latitude, longitude: selections.longitude }
          : {}),
        ...(measuredInputs ? { model_inputs: measuredInputs } : {}),
      });
      setResult(response);
      setModelInputs(measuredInputs);
      setStep(8);
    } catch {
      setError("request_failed");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError("");
    setResult(null);
    setStep((current) => Math.max(0, current - 1));
  }

  function selectFieldLocation(location) {
    const requestId = ++locationRequestId.current;
    setLocationError("");
    setLocationEstimate(null);
    setEstimateLoading(true);
    setSelections((previous) => ({ ...previous, ...location }));
    api.farmerLocationEstimate(location.latitude, location.longitude)
      .then((estimate) => {
        if (locationRequestId.current === requestId) setLocationEstimate(estimate);
      })
      .catch(() => {
        if (locationRequestId.current === requestId) {
          setLocationError(text.estimateFailed);
        }
      })
      .finally(() => {
        if (locationRequestId.current === requestId) setEstimateLoading(false);
      });
  }

  function useBrowserLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(text.locationUnavailable);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => selectFieldLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      () => setLocationError(text.locationUnavailable),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  function next() {
    setError("");
    if (step === 0) setStep(1);
    else if (step === 1 && selections.district) setStep(2);
    else if (step >= 2 && step < 5) setStep((current) => current + 1);
    else if (step === 5) setStep(6);
  }

  const valueForStep = {
    0: language,
    1: selections.district,
    2: selections.soil_choice,
    3: selections.water_choice,
    4: selections.weather_problem,
    5: selections.farmer_goal,
  }[step];
  const stageField = {
    2: "soil_choice",
    3: "water_choice",
    4: "weather_problem",
    5: "farmer_goal",
  }[step];
  const stepCanContinue = step === 0 || (step === 1
    ? Boolean(selections.district)
    : Boolean(valueForStep));

  return (
    <div className="farmer-app">
      <header className="farmer-app-header">
        <div>
          <p className="eyebrow">{text.title}</p>
          <h1>{text.intro}</h1>
        </div>
        <div
          className="language-switch"
          role="group"
          aria-label={language === "ta" ? "மொழியைத் தேர்வு செய்யவும்" : "Choose language"}
        >
          <button className={language === "ta" ? "language-active" : ""} aria-pressed={language === "ta"} onClick={() => setLanguage("ta")} type="button">தமிழ்</button>
          <button className={language === "en" ? "language-active" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")} type="button">English</button>
        </div>
      </header>

      {simpleRecommendationsOpen ? (
        <>
          <FarmerCropRecommendations initialDistrict={selections.district} language={language} />
          <div className="farmer-flow-controls">
            <button
              className="button button-farmer-back"
              type="button"
              onClick={() => setSimpleRecommendationsOpen(false)}
            >
              <ArrowLeft size={19} /> {text.simpleBack}
            </button>
          </div>
        </>
      ) : (
        <>
      <section className="simple-farmer-entry panel">
        <div>
          <p className="eyebrow">{text.simpleEyebrow}</p>
          <h2>{text.simpleTitle}</h2>
          <p>{text.simpleDescription}</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setSimpleRecommendationsOpen(true)}
        >
          {text.simpleAction} <ArrowRight size={18} />
        </button>
      </section>
      {step < 6 && <ProgressIndicator current={step + 1} total={6} language={language} />}

      {step < 6 ? (
        <>
          <div className="farmer-question-wrap">
            {step === 1 ? (
              <section className="farmer-question panel" aria-labelledby="farmer-question-title">
                <div className="farmer-question-heading">
                  <p className="eyebrow">{language === "ta" ? "கேள்வி 2" : "QUESTION 2"}</p>
                  <h1 id="farmer-question-title">{text.district}</h1>
                  <p>{text.districtHint}</p>
                </div>
                <label className="district-select-label" htmlFor="district-select">
                  {text.chooseDistrict}
                  <select
                    id="district-select"
                    value={selections.district}
                    onChange={(event) => setSelections((previous) => ({ ...previous, district: event.target.value }))}
                  >
                    <option value="">{text.chooseDistrict}</option>
                    {DISTRICTS.map(([code, tamil, english]) => (
                      <option key={code} value={code}>{language === "ta" ? `${tamil} — ${english}` : english}</option>
                    ))}
                  </select>
                </label>
              </section>
            ) : (
              <FarmerQuestionCard
                language={language}
                title={titles[step]}
                hint={step === 0 ? (language === "ta" ? "தமிழ் இயல்பாகத் தேர்ந்தெடுக்கப்பட்டுள்ளது." : "Choose the language you prefer.") : ""}
                options={step === 0 ? [
                  { value: "ta", title: "தமிழ்", subtitle: "Tamil", icon: "தமிழ்" },
                  { value: "en", title: "English", subtitle: "ஆங்கிலம்", icon: "EN" },
                ] : questionOptions(language, step)}
                value={valueForStep}
                onChange={(value) => step === 0
                  ? setLanguage(value)
                  : setSelections((previous) => ({ ...previous, [stageField]: value }))}
              />
            )}
          </div>
          <div className="farmer-flow-controls">
            <button className="button button-farmer-back" type="button" onClick={goBack} disabled={step === 0 || loading}>
              <ArrowLeft size={19} /> {text.back}
            </button>
            <Link className="button button-farmer-home" to="/">
              <Home size={19} /> {text.home}
            </Link>
            <button className="button button-primary button-farmer-next" type="button" onClick={next} disabled={!stepCanContinue || loading}>
              {text.next} <ArrowRight size={19} />
            </button>
          </div>
        </>
      ) : step === 6 ? (
        <section className="farmer-mode-choice" aria-labelledby="farmer-mode-title">
          <div className="farmer-question-heading">
            <p className="eyebrow">{language === "ta" ? "அடுத்த படி" : "NEXT STEP"}</p>
            <h1 id="farmer-mode-title">{text.optionsTitle}</h1>
          </div>
          {error && <div className="alert alert-error" role="alert">{localizedError}</div>}
          <div className="farmer-mode-grid">
            <article className="farmer-mode-card">
              <span aria-hidden="true"><CloudSun size={30} /></span>
              <h2>{text.quickTitle}</h2>
              <p>{text.quickDescription}</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => getRecommendation()}
                disabled={loading}
              >
                {loading ? <><LoaderCircle className="spin" size={19} /> {text.sending}</> : text.quickAction}
              </button>
            </article>
            <article className="farmer-mode-card farmer-mode-ai">
              <span aria-hidden="true"><Sparkles size={30} /></span>
              <h2>{text.aiTitle}</h2>
              <p>{text.aiDescription}</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => { setError(""); setStep(7); }}
                disabled={loading}
              >
                {text.aiAction} <ArrowRight size={19} />
              </button>
            </article>
          </div>
          <p className="farmer-honesty-note">
            {language === "ta"
              ? "மாவட்டம் அல்லது மண் தேர்விலிருந்து அளவீடுகளை ஊகிக்கமாட்டோம்."
              : "Measurements are never inferred from your district or soil selection."}
          </p>
          <div className="farmer-flow-controls">
            <button className="button button-farmer-back" type="button" onClick={goBack} disabled={loading}>
              <ArrowLeft size={19} /> {text.back}
            </button>
            <Link className="button button-farmer-home" to="/">
              <Home size={19} /> {text.home}
            </Link>
          </div>
        </section>
      ) : step === 7 ? (
        <>
          {error && <div className="alert alert-error" role="alert">{localizedError}</div>}
          <section className="farmer-question panel farmer-location-picker">
            <div className="farmer-question-heading">
              <h2>{text.fieldLocation}</h2>
              <p>{text.mapHint}</p>
            </div>
            <Suspense fallback={<div className="interactive-map-status farmer-location-map" role="status">Loading interactive map…</div>}>
              <SatelliteLocationPicker
                selectedLocation={selections.latitude !== null && selections.longitude !== null
                  ? { latitude: selections.latitude, longitude: selections.longitude }
                  : null}
                onSelectLocation={selectFieldLocation}
                label={language === "ta"
                  ? "வரைபடத்தில் தட்டி வயல் இடத்தைத் தேர்ந்தெடுக்கவும்."
                  : "Interactive map. Click to select your field location."}
              />
            </Suspense>
            <div className="farmer-location-controls">
              <button
                className="button button-quiet"
                type="button"
                onClick={useBrowserLocation}
                disabled={estimateLoading}
              >
                <MapPin size={17} /> {text.useMyLocation}
              </button>
              {selections.latitude !== null && selections.longitude !== null && (
                <p className="muted" role="status">
                  {text.markedLocation}: {selections.latitude.toFixed(5)}, {selections.longitude.toFixed(5)}
                </p>
              )}
              {locationError && <p className="alert alert-error" role="alert">{locationError}</p>}
              {estimateLoading && <p className="muted" role="status">{text.loadingEstimate}</p>}
              {locationEstimate && (
                <div className="farmer-location-estimates" role="status">
                  <strong>
                    {text.locationEstimates} · {locationEstimate.dataset_status.replaceAll("_", " ")}
                  </strong>
                  <div className="farmer-location-estimate-values">
                    {Object.entries(locationEstimate.properties).map(([name, property]) => (
                      <span key={name}>
                        {name}: {property.value} {property.units} · {property.value_type.replaceAll("_", " ")}
                        {property.soil_depth_cm && ` · depth ${
                          Array.isArray(property.soil_depth_cm)
                            ? property.soil_depth_cm.join("–")
                            : property.soil_depth_cm
                        } cm`}
                      </span>
                    ))}
                    {Object.entries(locationEstimate.context_properties ?? {}).map(([name, property]) => (
                      <span key={name}>
                        Context only — {name.replaceAll("_", " ")}: {property.value} {property.units}
                        {" · not used as a model input"}
                      </span>
                    ))}
                  </div>
                  {locationEstimate.provenance && (
                    <p>
                      {locationEstimate.provenance.source}
                      {locationEstimate.provenance.spatial_resolution_m
                        && ` · nominal resolution ${locationEstimate.provenance.spatial_resolution_m} m`}
                      {locationEstimate.lookup?.method === "raster_cell"
                        && " · exact raster cell; no nearby pixel substitution"}
                    </p>
                  )}
                  <p>{text.modelInputsNotFilled}</p>
                  {locationEstimate.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}
            </div>
          </section>
          <FarmerMeasurements
            language={language}
            initialValues={modelInputs ?? locationEstimate?.estimated_inputs ?? EMPTY_MEASUREMENT_VALUES}
            estimatedValues={modelInputs ? EMPTY_MEASUREMENT_VALUES : (locationEstimate?.estimated_inputs ?? EMPTY_MEASUREMENT_VALUES)}
            estimatedProperties={modelInputs ? EMPTY_MEASUREMENT_VALUES : (locationEstimate?.properties ?? EMPTY_MEASUREMENT_VALUES)}
            onSubmit={getRecommendation}
            onQuickGuidance={() => getRecommendation()}
            loading={loading}
          />
          <div className="farmer-flow-controls">
            <button className="button button-farmer-back" type="button" onClick={() => { setError(""); setStep(6); }} disabled={loading}>
              <ArrowLeft size={19} /> {text.backToOptions}
            </button>
            <Link className="button button-farmer-home" to="/">
              <Home size={19} /> {text.home}
            </Link>
          </div>
        </>
      ) : (
        <FarmerResult
          language={language}
          selections={{
            ...selectionForQuestions,
            district_label: language === "ta" ? selectedDistrict?.[1] : selectedDistrict?.[2],
          }}
          result={result}
          error={error}
          modelInputs={modelInputs}
          onRetry={() => getRecommendation(modelInputs)}
          onGetAiRecommendation={() => { setError(""); setStep(7); }}
          onEdit={() => { setError(""); setResult(null); setStep(5); }}
          loading={loading}
        />
      )}
        </>
      )}
    </div>
  );
}
