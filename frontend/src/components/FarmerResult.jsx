import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Goal,
  Leaf,
  MapPin,
  RotateCcw,
  Sparkles,
  Sprout,
  Sun,
} from "lucide-react";
import { Link } from "react-router-dom";
import VoiceButton from "./VoiceButton.jsx";
import WeeklyActions from "./WeeklyActions.jsx";

const CROPS_TA = {
  apple: "ஆப்பிள்",
  banana: "வாழை",
  blackgram: "உளுந்து",
  chickpea: "கொண்டைக்கடலை",
  coconut: "தேங்காய்",
  coffee: "காபி",
  cotton: "பருத்தி",
  grapes: "திராட்சை",
  jute: "சணல்",
  kidneybeans: "ராஜ்மா",
  lentil: "பருப்பு",
  maize: "மக்காச்சோளம்",
  mango: "மாம்பழம்",
  mothbeans: "மொச்சை",
  mungbean: "பாசிப்பயறு",
  muskmelon: "முலாம்பழம்",
  orange: "ஆரஞ்சு",
  papaya: "பப்பாளி",
  pigeonpeas: "துவரை",
  pomegranate: "மாதுளை",
  rice: "நெல்",
  watermelon: "தர்பூசணி",
};

const TEXT = {
  ta: {
    title: "உங்கள் விவசாய ஆலோசனை",
    situationMode: "விவசாயி நிலை வழிகாட்டல்",
    modelMode: "AI பயிர் பரிந்துரை",
    received: "உங்கள் பதில்கள் பெறப்பட்டன.",
    needMeasurements: "பயிர் பரிந்துரைக்கு மண் மற்றும் வானிலை அளவுகள் தேவை.",
    noGuess: "N, P, K, pH, வெப்பநிலை, ஈரப்பதம் மற்றும் மழை அளவு கிடைத்தால் AI மூலம் பரிந்துரை வழங்க முடியும். இந்த மதிப்புகளை நாங்கள் ஊகிக்கவில்லை.",
    generalNotice: "இது பொதுவான வழிகாட்டுதல். AI பயிர் பரிந்துரைக்கு மண் மற்றும் வானிலை அளவீடுகள் தேவை.",
    recommended: "பரிந்துரைக்கப்பட்ட பயிர்",
    confidence: "மாதிரி வாக்கு விகிதம் (அளவுத்திருத்தப்படாதது)",
    scoreNote: "இது பயிர் வெற்றி பெறும் நிகழ்தகவு அல்ல.",
    inputs: "நீங்கள் வழங்கிய அளவீடுகள்",
    why: "உங்கள் மண் மற்றும் வானிலை அளவீடுகளின் அடிப்படையில் ஏற்கனவே உள்ள Random Forest மாதிரி இந்தப் பயிரைத் தேர்ந்தெடுத்தது.",
    nextStep: "அடுத்ததாக, உங்கள் உள்ளூர் வேளாண்மை நிபுணருடன் அளவீடுகளையும் பரிந்துரையையும் சரிபார்க்கவும்.",
    important: "முக்கியம்",
    addMeasurements: "AI பரிந்துரைக்கு அளவீடுகளைச் சேர்க்கவும்",
    top: ["முதல் தேர்வு", "இரண்டாம் தேர்வு", "மூன்றாம் தேர்வு"],
    context: "உங்கள் நிலை",
    district: "மாவட்டம்",
    soil: "மண்",
    water: "தண்ணீர்",
    problem: "தற்போதைய பிரச்சனை",
    goal: "விருப்பம்",
    trust: "இந்த ஆலோசனை கிடைத்த தகவல்களின் அடிப்படையில் வழங்கப்படுகிறது. முக்கியமான விவசாய முடிவுகளுக்கு உள்ளூர் வேளாண்மை அதிகாரியின் ஆலோசனையையும் பெறுங்கள்.",
    dataCaution: "முக்கிய முடிவுக்கு முன் உள்ளூர் வேளாண்மை அதிகாரியிடம் ஆலோசனை பெறுங்கள்.",
    shortAction: (selections) => selections.weather_problem === "heavy_rain"
      ? "வயலில் தண்ணீர் தேங்காமல் பார்த்துக்கொள்ளுங்கள்."
      : selections.weather_problem === "heat_risk"
        ? "பயிரின் தண்ணீர் நிலையை கவனியுங்கள்."
        : selections.water_choice === "low" || selections.water_choice === "rainfed"
          ? "கிடைக்கும் தண்ணீரை கவனமாக திட்டமிடுங்கள்."
          : "மண் மற்றும் தண்ணீர் நிலையை சரிபாருங்கள்.",
    retry: "மீண்டும் முயற்சிக்கவும்",
    expert: "நிபுணர் ஆலோசனை",
    home: "முகப்பு",
    edit: "பதில்களை மாற்றுங்கள்",
    failed: "மன்னிக்கவும். ஆலோசனையை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    spokenGuidance: "முக்கிய விவசாய முடிவுகளுக்கு உள்ளூர் வேளாண்மை அதிகாரியிடம் ஆலோசனை பெறுங்கள்.",
    listenModel: (crop) => `${crop} உங்கள் ஏழு அளவுகளின் அடிப்படையில் முதல் தேர்வாக உள்ளது. இது உறுதியான ஆலோசனை அல்ல.`,
  },
  en: {
    title: "Your Farm Guidance",
    situationMode: "Farmer Situation Guidance",
    modelMode: "AI Crop Recommendation",
    received: "Your answers were received.",
    needMeasurements: "A crop recommendation requires soil and weather measurements.",
    noGuess: "If N, P, K, pH, temperature, humidity and rainfall are available, AI can provide a model-based recommendation. We have not guessed these values.",
    generalNotice: "This is general guidance. AI crop recommendation requires soil and weather measurements.",
    recommended: "Recommended Crop",
    confidence: "Model vote fraction (not calibrated)",
    scoreNote: "This is not the probability of successful cultivation.",
    inputs: "Your measured inputs",
    why: "The existing Random Forest selected this crop from the soil and weather measurements you provided.",
    nextStep: "Next, review your measurements and this recommendation with a local agriculture expert.",
    important: "Important",
    addMeasurements: "Add measurements for an AI recommendation",
    top: ["Top choice", "Second choice", "Third choice"],
    context: "Your situation",
    district: "District",
    soil: "Soil",
    water: "Water",
    problem: "Current problem",
    goal: "Goal",
    trust: "This guidance is based on the information available. For important farming decisions, also consult a local agriculture expert.",
    dataCaution: "Before an important decision, consult a local agriculture expert.",
    shortAction: (selections) => selections.weather_problem === "heavy_rain"
      ? "Check that water is not collecting in the field."
      : selections.weather_problem === "heat_risk"
        ? "Keep an eye on crop water conditions."
        : selections.water_choice === "low" || selections.water_choice === "rainfed"
          ? "Plan carefully for the water available."
          : "Check soil and water conditions.",
    retry: "Try again",
    expert: "Expert Advisor",
    home: "Home",
    edit: "Change answers",
    failed: "Sorry, we could not create the guidance. Please try again.",
    spokenGuidance: "For important farming decisions, consult a local agriculture expert.",
    listenModel: (crop) => `${crop} is the top choice from your seven measurements. This is not guaranteed advice.`,
  },
};

const CHOICE_LABELS = {
  ta: {
    soil_choice: {
      red_loam: "செம்மண்",
      black: "கரிசல் மண்",
      clay: "களிமண்",
      sandy: "மணல் மண்",
      unknown: "தெரியவில்லை",
    },
    water_choice: {
      low: "குறைந்த தண்ணீர்",
      medium: "நடுத்தர தண்ணீர்",
      high: "போதுமான தண்ணீர்",
      rainfed: "மழை மட்டும்",
    },
    weather_problem: {
      delayed_rain: "மழை இல்லை",
      heavy_rain: "அதிக மழை",
      heat_risk: "அதிக வெப்பம்",
      pest_risk: "பூச்சி பிரச்சனை (நீங்கள் தெரிவித்தது)",
      normal: "பிரச்சனை இல்லை",
    },
    farmer_goal: {
      safe: "பாதுகாப்பான தேர்வு",
      profit: "அதிக வருமானம்",
      low_water: "குறைந்த தண்ணீர்",
      short_duration: "விரைவான அறுவடை",
    },
  },
  en: {
    soil_choice: {
      red_loam: "Red soil",
      black: "Black soil",
      clay: "Clay soil",
      sandy: "Sandy soil",
      unknown: "Do not know",
    },
    water_choice: {
      low: "Little water",
      medium: "Medium water",
      high: "Enough water",
      rainfed: "Rain only",
    },
    weather_problem: {
      delayed_rain: "No rain",
      heavy_rain: "Heavy rain",
      heat_risk: "Too much heat",
      pest_risk: "Pest problem (reported)",
      normal: "No problem",
    },
    farmer_goal: {
      safe: "Safe crop",
      profit: "More income",
      low_water: "Less water",
      short_duration: "Fast harvest",
    },
  },
};

export default function FarmerResult({
  language,
  selections,
  result,
  modelInputs,
  error,
  onRetry,
  onGetAiRecommendation,
  onEdit,
  loading,
}) {
  const tamil = language === "ta";
  const text = TEXT[language];
  const labels = CHOICE_LABELS[language];
  const modelReady = Boolean(result?.model_prediction_available);
  const hasConfidence = typeof result?.confidence === "number"
    && Number.isFinite(result.confidence);
  const modelFeatures = [
    ["N", tamil ? "நைட்ரஜன் (N)" : "Nitrogen (N)", ""],
    ["P", tamil ? "பாஸ்பரஸ் (P)" : "Phosphorus (P)", ""],
    ["K", tamil ? "பொட்டாசியம் (K)" : "Potassium (K)", ""],
    ["ph", tamil ? "மண் pH" : "Soil pH", ""],
    ["temperature", tamil ? "வெப்பநிலை" : "Temperature", "°C"],
    ["humidity", tamil ? "ஈரப்பதம்" : "Humidity", "%"],
    ["rainfall", tamil ? "மழை அளவு" : "Rainfall", "mm"],
  ];
  const cropName = (crop) => tamil ? (CROPS_TA[crop] ?? crop) : crop;
  const spoken = `${modelReady ? text.listenModel(cropName(result.best_crop)) : text.spokenGuidance} ${text.shortAction(selections)}`;
  const situationCards = [
    { icon: <MapPin />, label: text.district, value: selections.district_label },
    ...(selections.latitude !== null && selections.longitude !== null
      ? [{
        icon: <MapPin />,
        label: tamil ? "வயல் இடம்" : "Field location",
        value: `${selections.latitude.toFixed(5)}, ${selections.longitude.toFixed(5)}`,
      }]
      : []),
    { icon: <Sprout />, label: text.soil, value: labels.soil_choice[selections.soil_choice] },
    { icon: <Droplets />, label: text.water, value: labels.water_choice[selections.water_choice] },
    { icon: <CloudRain />, label: text.problem, value: labels.weather_problem[selections.weather_problem] },
    { icon: <Goal />, label: text.goal, value: labels.farmer_goal[selections.farmer_goal] },
  ];

  return (
    <div className="farmer-result-stack">
      <header className="farmer-result-heading">
        <span className="farmer-result-mark" aria-hidden="true">🌾</span>
        <div>
          <p className="eyebrow">{modelReady ? text.modelMode : text.situationMode}</p>
          <h1>{text.title}</h1>
        </div>
      </header>

      <section className={`farmer-result-primary ${modelReady ? "farmer-result-ready" : "farmer-result-limited"}`}>
        {modelReady ? (
          <>
            <p className="farmer-result-status"><Leaf size={22} /> {text.modelMode}</p>
            <p className="farmer-result-label">{text.recommended}</p>
            <h2>{cropName(result.best_crop)}</h2>
            {hasConfidence && (
              <p className="farmer-confidence">
                <strong>{result.confidence.toFixed(1)}%</strong> {text.confidence}
              </p>
            )}
            <p className="farmer-small-note">
              {result.message || text.why}
            </p>
          </>
        ) : (
          <>
            <p className="farmer-result-status"><AlertTriangle size={22} /> {text.situationMode}</p>
            <h2>{text.received}</h2>
            <p className="farmer-result-label">{text.needMeasurements}</p>
            <p>{text.generalNotice}</p>
            <p>{text.noGuess}</p>
          </>
        )}
      </section>

      {modelReady && result.recommendations?.length > 0 && (
        <section className="farmer-ranked panel" aria-label={tamil ? "AI பயிர் பரிந்துரைகள்" : "AI crop recommendations"}>
          <h2>{tamil ? "AI பரிந்துரை" : "AI Crop Recommendation"}</h2>
          <p className="muted">{text.scoreNote}</p>
          <ol>
            {result.recommendations.slice(0, 3).map((item, index) => (
              <li key={item.crop}>
                <span className={`farmer-rank farmer-rank-${index + 1}`} aria-hidden="true">
                  {["🥇", "🥈", "🥉"][index]}
                </span>
                <span className="farmer-rank-label">{text.top[index]}</span>
                <strong>{cropName(item.crop)}</strong>
                {typeof item.confidence === "number" && Number.isFinite(item.confidence)
                  && <b>{item.confidence.toFixed(1)}%</b>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="farmer-context">
        <h2>{text.context}</h2>
        <div className="farmer-situation-grid">
          {situationCards.map((item) => (
            <article className="farmer-situation-card" key={item.label}>
              <span aria-hidden="true">{item.icon}</span>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      {error && (
        <div className="alert alert-error farmer-error" role="alert">
          <span>{text.failed}</span>
          <button className="button button-retry" type="button" onClick={onRetry} disabled={loading}>
            {loading ? (tamil ? "காத்திருக்கவும்…" : "Please wait…") : text.retry}
          </button>
        </div>
      )}

      {modelReady && modelInputs && (
        <section className="farmer-input-summary panel">
          <h2>{text.inputs}</h2>
          <div className="farmer-input-grid">
            {modelFeatures.map(([name, label, unit]) => (
              <article key={name}>
                <span>{label}</span>
                <strong>{Number(modelInputs[name]).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{unit ? ` ${unit}` : ""}</strong>
              </article>
            ))}
          </div>
        </section>
      )}
      {result?.warnings?.length > 0 && (
        <div className="alert alert-warning" role="alert">
          {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}
      {modelReady && (
        <section className="farmer-result-important" aria-label={text.important}>
          <AlertTriangle size={20} />
          <div>
            <strong>{text.important}</strong>
            <p>{tamil
              ? "இந்த பரிந்துரை வழங்கப்பட்ட அளவீடுகளை மட்டுமே அடிப்படையாகக் கொண்டது. இறுதி விவசாய முடிவுக்கு உள்ளூர் வேளாண்மை நிபுணரிடம் ஆலோசிக்கவும்."
              : "This recommendation is based only on the measurements provided. Consult a local agriculture expert before making a final farming decision."}</p>
            <p>{text.nextStep}</p>
          </div>
        </section>
      )}
      <VoiceButton text={spoken} language={language} />
      <WeeklyActions language={language} selections={selections} />
      <p className="farmer-trust-note" role="note">
        <AlertTriangle size={19} />
        <span>{text.trust}</span>
      </p>
      <div className="farmer-result-actions">
        {!modelReady && (
          <button
            className="button button-primary button-secondary-large"
            type="button"
            onClick={onGetAiRecommendation}
          >
            <Sparkles size={19} /> {text.addMeasurements}
          </button>
        )}
        <Link className="button button-secondary-large" to="/">
          {text.home}
        </Link>
        <button className="button button-secondary-large" type="button" onClick={onEdit}>
          <RotateCcw size={19} /> {text.edit}
        </button>
        <Link className="button button-primary button-secondary-large" to="/predict">
          {text.expert}
        </Link>
      </div>
    </div>
  );
}
