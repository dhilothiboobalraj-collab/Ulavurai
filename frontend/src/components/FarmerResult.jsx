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
    basicMode: "விவசாயி தகவல் அடிப்படையிலான பரிந்துரை",
    basicRecommended: "உங்களுக்கு ஏற்ற பயிர்",
    whyBasic: "ஏன் இந்த பயிர்?",
    basicWater: "நீர் தேவை (TNAU அட்டவணை)",
    basicAlternative: "மற்றொரு தேர்வு",
    basicAnother: "இன்னொரு தேர்வு",
    matchScore: "விதி பொருத்த மதிப்பெண்",
    factorWater: "உங்கள் நீர் வசதியுடன் ஒப்பிடப்பட்டது",
    factorGoal: "உங்கள் குறைந்த நீர்/குறைந்த கால இலக்குடன் ஒப்பிடப்பட்டது",
    districtNotUsed: "மாவட்டத்திற்கான ஆதாரப் பயிர் விதி இல்லை; மாவட்டம் முடிவை மாற்றவில்லை.",
    sameCrop: "இரண்டு பரிந்துரை முறைகளும் ஒரே பயிரைத் தேர்ந்தெடுத்தன.",
    differentCrops: "பரிந்துரைகள் வேறுபடுகின்றன. அளவீடுகளைச் சரிபார்த்து உள்ளூர் வேளாண்மை நிபுணரிடம் ஆலோசிக்கவும்.",
    pestNotice: "பூச்சி பிரச்சனை நீங்கள் தெரிவித்தது. இந்த அமைப்பு பூச்சி அல்லது நோயைக் கண்டறியாது.",
    sourceLabel: "ஆதாரம்",
    relativeWater: "இந்த நீர் வகை TNAU பட்டியலில் உள்ள பயிர்களை ஒப்பிடுவது மட்டுமே; பொதுவான அளவீடு அல்ல.",
    received: "உங்கள் பதில்கள் பெறப்பட்டன.",
    needMeasurements: "பயிர் பரிந்துரைக்கு மண் மற்றும் வானிலை அளவுகள் தேவை.",
    noGuess: "N, P, K, pH, வெப்பநிலை, ஈரப்பதம் மற்றும் மழை அளவு கிடைத்தால் AI மூலம் பரிந்துரை வழங்க முடியும். இந்த மதிப்புகளை நாங்கள் ஊகிக்கவில்லை.",
    generalNotice: "இது பொதுவான வழிகாட்டுதல். AI பயிர் பரிந்துரைக்கு மண் மற்றும் வானிலை அளவீடுகள் தேவை.",
    recommended: "பரிந்துரைக்கப்பட்ட பயிர்",
    confidence: "மாதிரி நிகழ்தகவு",
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
    listenBasic: (crop) => `${crop} என்பது TNAU நீர் தேவைத் தரவை அடிப்படையாகக் கொண்ட ஒப்பீட்டு பரிந்துரை. இது Random Forest கணிப்பு அல்ல.`,
  },
  en: {
    title: "Your Farm Guidance",
    situationMode: "Farmer Situation Guidance",
    modelMode: "AI Crop Recommendation",
    basicMode: "Farmer Information-Based Recommendation",
    basicRecommended: "Recommended Crop",
    whyBasic: "Why this crop?",
    basicWater: "Water requirement (TNAU table)",
    basicAlternative: "Alternative",
    basicAnother: "Another option",
    matchScore: "Rule Match Score",
    factorWater: "Compared with your available water",
    factorGoal: "Compared with your less-water/shorter-duration goal",
    districtNotUsed: "No source-backed district crop rule is available; district did not change the ranking.",
    sameCrop: "Both recommendation methods selected the same crop.",
    differentCrops: "The recommendations differ. Review your measurements and consult a local agriculture expert.",
    pestNotice: "Pest problem selected. This system does not perform pest or disease detection.",
    sourceLabel: "Source",
    relativeWater: "This relative water class only compares crops in the TNAU table; it is not a universal requirement.",
    received: "Your answers were received.",
    needMeasurements: "A crop recommendation requires soil and weather measurements.",
    noGuess: "If N, P, K, pH, temperature, humidity and rainfall are available, AI can provide a model-based recommendation. We have not guessed these values.",
    generalNotice: "This is general guidance. AI crop recommendation requires soil and weather measurements.",
    recommended: "Recommended Crop",
    confidence: "Model probability",
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
    listenBasic: (crop) => `${crop} is a relative recommendation based on TNAU water requirement data. This is not a Random Forest prediction.`,
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
  basicRecommendation,
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
  const basicReady = result?.recommendation_type === "basic_farmer";
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
  const spoken = `${modelReady
    ? text.listenModel(cropName(result.best_crop))
    : basicReady
      ? text.listenBasic(cropName(result.recommended_crop))
      : text.spokenGuidance} ${text.shortAction(selections)}`;
  const situationCards = [
    { icon: <MapPin />, label: text.district, value: selections.district_label },
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
          <p className="eyebrow">{modelReady ? text.modelMode : basicReady ? text.basicMode : text.situationMode}</p>
          <h1>{text.title}</h1>
        </div>
      </header>

      <section className={`farmer-result-primary ${modelReady || basicReady ? "farmer-result-ready" : "farmer-result-limited"}`}>
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
        ) : basicReady ? (
          <>
            <p className="farmer-result-status"><Leaf size={22} /> {text.basicMode}</p>
            <p className="farmer-result-label">{text.basicRecommended}</p>
            <h2>{cropName(result.recommended_crop)}</h2>
            <p className="farmer-small-note">{result.message}</p>
            <p className="farmer-confidence">
              <strong>{Number(result.rule_match_score).toFixed(1)}%</strong> {text.matchScore}
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

      {basicReady && result.recommendations?.length > 0 && (
        <section className="farmer-ranked panel" aria-label={text.basicMode}>
          <h2>{text.whyBasic}</h2>
          <ol>
            {result.recommendations.slice(0, 3).map((item, index) => (
              <li key={item.crop}>
                <span className={`farmer-rank farmer-rank-${index + 1}`} aria-hidden="true">
                  {["🥇", "🥈", "🥉"][index]}
                </span>
                <span className="farmer-rank-label">
                  {index === 0 ? text.basicRecommended : index === 1 ? text.basicAlternative : text.basicAnother}
                </span>
                <strong>{cropName(item.crop)}</strong>
                <b>{item.water_requirement_mm} mm</b>
                <small>
                  {item.reasons.includes("water_availability") ? text.factorWater : ""}
                  {item.reasons.includes("farmer_goal") ? ` · ${text.factorGoal}` : ""}
                </small>
              </li>
            ))}
          </ol>
          <p className="farmer-honesty-note">{text.basicWater}: {result.water_requirement_class}. {text.relativeWater}</p>
          <p className="farmer-honesty-note">
            {text.sourceLabel}: <a href={result.source.url} target="_blank" rel="noreferrer">{result.source.title} — {result.source.publisher}</a>
          </p>
          {result.district_used_for_ranking === false && (
            <p className="farmer-honesty-note">{text.districtNotUsed}</p>
          )}
        </section>
      )}

      {modelReady && basicRecommendation && (
        <section className="farmer-result-important" aria-live="polite">
          {basicRecommendation.recommended_crop === result.best_crop ? "✅" : <AlertTriangle size={20} />}
          <div>
            <strong>{basicRecommendation.recommended_crop === result.best_crop ? text.sameCrop : text.differentCrops}</strong>
            {basicRecommendation.recommended_crop !== result.best_crop && (
              <p>
                {text.basicMode}: {cropName(basicRecommendation.recommended_crop)} · {text.modelMode}: {cropName(result.best_crop)}
              </p>
            )}
          </div>
        </section>
      )}

      {modelReady && result.recommendations?.length > 0 && (
        <section className="farmer-ranked panel" aria-label={tamil ? "AI பயிர் பரிந்துரைகள்" : "AI crop recommendations"}>
          <h2>{tamil ? "AI பரிந்துரை" : "AI Crop Recommendation"}</h2>
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
      {basicReady && result.limitations?.length > 0 && (
        <section className="panel" aria-label={tamil ? "வரம்புகள்" : "Limitations"}>
          <h2>{tamil ? "முக்கிய வரம்புகள்" : "Important limitations"}</h2>
          <ul>
            {result.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
          {selections.weather_problem === "pest_risk" && <p>{text.pestNotice}</p>}
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
