import { CalendarDays, CloudRain, Droplets, Leaf, Sun, Target } from "lucide-react";

const GUIDANCE = {
  ta: {
    water: {
      low: ["தண்ணீர் குறைவாக இருந்தால்", "தண்ணீர் தேவையை கவனமாக திட்டமிடுங்கள்."],
      rainfed: ["மழையை மட்டுமே நம்பினால்", "மழை நிலையை தொடர்ந்து கவனியுங்கள்."],
    },
    weather: {
      delayed_rain: ["மழை தாமதமானால்", "மழை நிலையை கவனியுங்கள்; உள்ளூர் அறிவிப்புகளைப் பாருங்கள்."],
      heavy_rain: ["அதிக மழை இருந்தால்", "வயலில் தண்ணீர் தேங்காமல் பார்த்துக்கொள்ளுங்கள்."],
      heat_risk: ["அதிக வெப்பம் இருந்தால்", "பயிரின் தண்ணீர் நிலையை கவனியுங்கள்."],
      pest_risk: ["பூச்சி பிரச்சனை தெரிந்தால்", "சிகிச்சைக்கு முன் உள்ளூர் வேளாண்மை அலுவலரிடம் ஆலோசனை பெறுங்கள்."],
    },
    soil: ["மண் தெரியவில்லை என்றால்", "மண் பரிசோதனை செய்து அதன் அடிப்படையில் முடிவு எடுக்கவும்."],
    goal: {
      safe: ["பாதுகாப்பான முடிவுக்கு", "மண் மற்றும் தண்ணீர் நிலையை முதலில் சரிபார்க்கவும்."],
      profit: ["வருமான முடிவுக்கு", "உள்ளூர் சந்தை விலை மற்றும் செலவை சரிபார்க்கவும்."],
      low_water: ["குறைந்த தண்ணீருக்கு", "தண்ணீர் கிடைக்கும் அளவை கருத்தில் கொள்ளுங்கள்."],
      short_duration: ["விரைவான அறுவடைக்கு", "பயிரின் அறுவடை காலத்தை சரிபார்க்கவும்."],
    },
    general: ["பொதுவான வழிகாட்டல்", "வயலை கவனித்து, முக்கிய முடிவுக்கு உள்ளூர் வேளாண்மை ஆலோசனையைப் பெறுங்கள்."],
    heading: "இந்த வாரம் செய்ய வேண்டியது",
    note: "இவை பொதுவான வழிகாட்டல்கள். உரம் அல்லது பூச்சிக்கொல்லி அளவு இங்கு பரிந்துரைக்கப்படவில்லை.",
  },
  en: {
    water: {
      low: ["If water is limited", "Plan carefully for the water available."],
      rainfed: ["If you depend on rain", "Keep watching rainfall conditions."],
    },
    weather: {
      delayed_rain: ["If rain is delayed", "Watch rainfall conditions and local advisories."],
      heavy_rain: ["If there is heavy rain", "Check that water is not collecting in the field."],
      heat_risk: ["If it is very hot", "Keep an eye on crop water conditions."],
      pest_risk: ["If you notice a pest problem", "Ask a local agriculture officer before treatment."],
    },
    soil: ["If you do not know the soil", "Get a soil test and use its results when deciding."],
    goal: {
      safe: ["For a safer decision", "Check soil and water conditions first."],
      profit: ["For an income decision", "Check local market price and costs."],
      low_water: ["To use less water", "Consider how much water is available."],
      short_duration: ["For a faster harvest", "Check the crop's harvest period."],
    },
    general: ["General guidance", "Observe your field and ask a local agriculture expert before an important decision."],
    heading: "This Week's Farm Actions",
    note: "These are general actions. No fertilizer or pesticide dosage is recommended here.",
  },
};

export default function WeeklyActions({ language, selections }) {
  const tamil = language === "ta";
  const text = GUIDANCE[language];
  const items = [];
  const waterAdvice = text.water[selections.water_choice];
  if (waterAdvice) items.push({ icon: <Droplets />, advice: waterAdvice });
  const weatherAdvice = text.weather[selections.weather_problem];
  if (weatherAdvice) {
    items.push({
      icon: selections.weather_problem === "heat_risk" ? <Sun /> : <CloudRain />,
      advice: weatherAdvice,
    });
  }
  if (selections.soil_choice === "unknown") {
    items.push({ icon: <Leaf />, advice: text.soil });
  }
  items.push({ icon: <Target />, advice: text.goal[selections.farmer_goal] ?? text.general });
  if (items.length === 1) items.unshift({ icon: <Leaf />, advice: text.general });

  return (
    <section className="weekly-actions panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{tamil ? "பாதுகாப்பான பொதுவழிகாட்டல்" : "SAFE, GENERAL GUIDANCE"}</p>
          <h2><CalendarDays size={21} /> {text.heading}</h2>
        </div>
      </div>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.advice[0]}-${index}`}>
            <span className="weekly-action-icon" aria-hidden="true">{item.icon}</span>
            <span><strong>{item.advice[0]}</strong><span>{item.advice[1]}</span></span>
          </li>
        ))}
      </ul>
      <p className="fine-print">{text.note}</p>
    </section>
  );
}
