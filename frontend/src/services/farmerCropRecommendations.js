export const TAMIL_NADU_DISTRICTS = [
  ["ariyalur", "அரியலூர்", "Ariyalur"],
  ["chengalpattu", "செங்கல்பட்டு", "Chengalpattu"],
  ["chennai", "சென்னை", "Chennai"],
  ["coimbatore", "கோயம்புத்தூர்", "Coimbatore"],
  ["cuddalore", "கடலூர்", "Cuddalore"],
  ["dharmapuri", "தர்மபுரி", "Dharmapuri"],
  ["dindigul", "திண்டுக்கல்", "Dindigul"],
  ["erode", "ஈரோடு", "Erode"],
  ["kallakurichi", "கள்ளக்குறிச்சி", "Kallakurichi"],
  ["kancheepuram", "காஞ்சிபுரம்", "Kancheepuram"],
  ["kanyakumari", "கன்னியாகுமரி", "Kanniyakumari"],
  ["karur", "கரூர்", "Karur"],
  ["krishnagiri", "கிருஷ்ணகிரி", "Krishnagiri"],
  ["madurai", "மதுரை", "Madurai"],
  ["mayiladuthurai", "மயிலாடுதுறை", "Mayiladuthurai"],
  ["nagapattinam", "நாகப்பட்டினம்", "Nagapattinam"],
  ["namakkal", "நாமக்கல்", "Namakkal"],
  ["nilgiris", "நீலகிரி", "The Nilgiris"],
  ["perambalur", "பெரம்பலூர்", "Perambalur"],
  ["pudukkottai", "புதுக்கோட்டை", "Pudukkottai"],
  ["ramanathapuram", "இராமநாதபுரம்", "Ramanathapuram"],
  ["ranipet", "ராணிப்பேட்டை", "Ranipet"],
  ["salem", "சேலம்", "Salem"],
  ["sivaganga", "சிவகங்கை", "Sivaganga"],
  ["tenkasi", "தென்காசி", "Tenkasi"],
  ["thanjavur", "தஞ்சாவூர்", "Thanjavur"],
  ["theni", "தேனி", "Theni"],
  ["thoothukudi", "தூத்துக்குடி", "Thoothukudi"],
  ["tiruchirappalli", "திருச்சிராப்பள்ளி", "Tiruchirappalli"],
  ["tirunelveli", "திருநெல்வேலி", "Tirunelveli"],
  ["tirupathur", "திருப்பத்தூர்", "Tirupathur"],
  ["tiruppur", "திருப்பூர்", "Tiruppur"],
  ["tiruvallur", "திருவள்ளூர்", "Tiruvallur"],
  ["tiruvannamalai", "திருவண்ணாமலை", "Tiruvannamalai"],
  ["tiruvarur", "திருவாரூர்", "Tiruvarur"],
  ["vellore", "வேலூர்", "Vellore"],
  ["viluppuram", "விழுப்புரம்", "Viluppuram"],
  ["virudhunagar", "விருதுநகர்", "Virudhunagar"],
];

export function searchTamilNaduDistricts(query = "") {
  const search = query.trim().toLocaleLowerCase();
  if (!search) return TAMIL_NADU_DISTRICTS;
  return TAMIL_NADU_DISTRICTS.filter(([code, tamil, english]) => (
    [code, tamil, english].some((name) => name.toLocaleLowerCase().includes(search))
  ));
}

export function getDistrictDisplayName(code, language = "en") {
  const district = TAMIL_NADU_DISTRICTS.find(([districtCode]) => districtCode === code);
  if (!district) return "";
  return language === "ta" ? `${district[1]} — ${district[2]}` : district[2];
}

export const FARMING_ISSUES = [
  ["low_rainfall", "issues.low_rainfall"],
  ["heavy_rainfall", "issues.heavy_rainfall"],
  ["low_fertility", "issues.low_fertility"],
  ["ph_issue", "issues.ph_issue"],
  ["pest_disease", "issues.pest_disease"],
  ["market_profit", "issues.market_profit"],
  ["no_problem", "issues.no_problem"],
  ["other", "issues.other"],
];

export const FARMER_GOALS = [
  ["higher_yield", "goals.higher_yield"],
  ["low_water", "goals.low_water"],
  ["short_duration", "goals.short_duration"],
  ["lower_investment", "goals.lower_investment"],
  ["higher_profit", "goals.higher_profit"],
  ["improve_soil_fertility", "goals.improve_soil_fertility"],
];

export const FARMER_TRANSLATIONS = {
  ta: {
    analysisEyebrow: "எளிய விவசாயி பகுப்பாய்வு",
    heading: "உங்கள் விவசாயத்திற்கு ஏற்ற பயிரைத் தேர்வு செய்வோம்",
    description: "உங்கள் மாவட்டம், விவசாயப் பிரச்சினை மற்றும் இலக்கைத் தேர்வு செய்யுங்கள். கிடைக்கும் ஆதாரத் தரவின் வரம்புகளுடன் பயிர்களைப் பரிந்துரைக்கிறோம்.",
    district: "மாவட்டம்",
    districtListLabel: "தமிழ்நாடு மாவட்டங்கள்",
    districtSearchPlaceholder: "மாவட்டத்தைத் தேடித் தேர்வு செய்யுங்கள்",
    districtHelp: "38 மாவட்டங்களும் பட்டியலில் உள்ளன. தமிழிலோ ஆங்கிலத்திலோ தேடலாம்.",
    districtNoResults: "மாவட்டம் கிடைக்கவில்லை. தமிழிலோ ஆங்கிலத்திலோ வேறு பெயரைத் தேடுங்கள்.",
    issues: {
      low_rainfall: "குறைந்த மழை / தண்ணீர் பற்றாக்குறை",
      heavy_rainfall: "அதிக மழை / வெள்ள அபாயம்",
      low_fertility: "மண் வளம் குறைவு",
      ph_issue: "மண்ணின் pH பிரச்சினை",
      pest_disease: "பூச்சி அல்லது நோய் பாதிப்பு",
      market_profit: "சந்தை விலை / லாபப் பிரச்சினை",
      no_problem: "குறிப்பிட்ட பிரச்சினை இல்லை",
      other: "மற்றவை",
    },
    goals: {
      higher_yield: "அதிக மகசூல்",
      low_water: "குறைந்த தண்ணீரில் சாகுபடி",
      short_duration: "குறுகிய காலத்தில் அறுவடை",
      lower_investment: "குறைந்த முதலீடு",
      higher_profit: "அதிக லாபம்",
      improve_soil_fertility: "மண் வளத்தை மேம்படுத்துதல்",
    },
    issue: "இப்போது உள்ள முக்கிய விவசாயப் பிரச்சினை",
    chooseIssue: "பிரச்சினையைத் தேர்வு செய்யுங்கள்",
    goal: "உங்கள் முக்கிய இலக்கு",
    chooseGoal: "இலக்கைத் தேர்வு செய்யுங்கள்",
    issueDescription: "பிரச்சினையைச் சுருக்கமாக விவரிக்கவும்",
    pestDescription: "பூச்சி / நோய் அறிகுறிகள் (விருப்பம்)",
    descriptionPlaceholder: "அதிகபட்சம் 240 எழுத்துகள்",
    optionalInfo: "விருப்பத் தகவல்",
    irrigation: "பாசன வசதி",
    irrigationUnknown: "தெரியாது / குறிப்பிட விரும்பவில்லை",
    irrigationRainfed: "மழையை மட்டும் நம்பிய சாகுபடி",
    irrigationLimited: "குறைந்த / வரம்பான பாசனம்",
    irrigationReliable: "நம்பகமான பாசன வசதி",
    season: "பருவம்",
    seasonNotSelected: "தேர்வு செய்யவில்லை",
    seasonKharif: "காரிப் / தென்மேற்கு பருவம்",
    seasonRabi: "ரபி / வடகிழக்கு பருவம்",
    seasonSummer: "கோடை",
    seasonYearRound: "ஆண்டு முழுவதும்",
    sowingMonth: "விதைக்கத் திட்டமிட்ட மாதம்",
    soilType: "தெரிந்தால் மண் வகை",
    soilUnknown: "தெரியாது / குறிப்பிட விரும்பவில்லை",
    soilRedLoam: "செம்மண்",
    soilBlack: "கரிசல் மண்",
    soilClay: "களிமண்",
    soilSandy: "மணல் மண்",
    months: ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
    submit: "பயிர் பரிந்துரை பெறுக",
    loading: "பரிந்துரைகளைத் தயாரிக்கிறோம்…",
    selectDistrictError: "பட்டியலில் உள்ள மாவட்டத்தைத் தேர்வு செய்யுங்கள்.",
    requiredError: "பிரச்சினையையும் விவசாய இலக்கையும் தேர்வு செய்யுங்கள்.",
    otherDescriptionError: "மற்ற பிரச்சினையைச் சுருக்கமாக எழுதுங்கள்.",
    apiError: "பரிந்துரைகளை இப்போது பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    responseError: "பயிர் பரிந்துரை பதில் சரியான வடிவில் இல்லை. மீண்டும் முயற்சிக்கவும்.",
    cropResponseError: "பயிர் பரிந்துரை விவரங்கள் சரியான வடிவில் இல்லை. மீண்டும் முயற்சிக்கவும்.",
    comparison: "ஆதாரத் தரவை அடிப்படையாகக் கொண்ட ஒப்பீடு",
    topCrops: "உங்களுக்கான முதல் 3 பயிர் விருப்பங்கள்",
    provisionalNote: "இவை தண்ணீர் தேவையும் பயிர் காலமும் கொண்ட TNAU அட்டவணையை வைத்து ஒப்பிட்ட தற்காலிக வழிகாட்டுதல்கள்; மாவட்டத்திற்கு நேரடி பொருத்த மதிப்பீடு அல்ல.",
    option: "விருப்பம்",
    why: "ஏன் இந்தப் பயிர்?",
    sourceWater: "மூல அட்டவணையின் மொத்த நீர் தேவை",
    relativeLow: "ஒப்பீட்டளவில் குறைவு",
    relativeMedium: "ஒப்பீட்டளவில் நடுத்தரம்",
    relativeHigh: "ஒப்பீட்டளவில் அதிகம்",
    duration: "மூல அட்டவணையின் பயிர் காலம்",
    aboutDays: "சுமார் {days} நாட்கள்",
    suitability: "பருவம் / மண் / காலநிலை பொருத்தம்",
    districtUnavailable: "மாவட்ட அளவிலான ஆதாரம் இல்லை; மதிப்பிடப்படவில்லை",
    cost: "செலவு / சந்தை விலை",
    localDataUnavailable: "நம்பகமான உள்ளூர் தரவு இல்லை",
    sourceLabel: "ஆதாரம்",
    updated: "புதுப்பித்த தேதி: {date}.",
    sourceDateUnavailable: "மூலத்தில் கடைசியாகப் புதுப்பித்த தேதி குறிப்பிடப்படவில்லை.",
    limitationsHeading: "தகவல் வரம்புகள்",
    advisoryNote: "பரிந்துரைகள் ஆலோசனைக்காக மட்டுமே; மகசூல் அல்லது லாபம் உறுதி செய்யப்படாது. விதைப்பதற்கு முன் உள்ளூர் வேளாண்மை நிபுணரிடம் உறுதிப்படுத்துங்கள்.",
    pestAdvice: "பூச்சி அல்லது நோய் அறிகுறி இருந்தால், அருகிலுள்ள வேளாண்மை அலுவலரை அணுகவும்.",
    reason: {
      middle_relative_water_need: "மூல அட்டவணையில் ஒப்பீட்டளவில் நடுத்தர நீர் தேவை.",
      relative_water_need_matches_selected_availability: "நீர் தேவைத் தரவு உங்கள் பாசனத் தேர்வுடன் ஒப்பிட்டு வரிசைப்படுத்தப்பட்டது.",
      lower_water_use_supports_goal: "ஒப்பீட்டளவில் குறைந்த நீர் தேவை உங்கள் இலக்குடன் பொருந்துகிறது.",
      shorter_duration_supports_goal: "மூலத் தரவில் குறைந்த பயிர் காலம் உங்கள் இலக்குடன் பொருந்துகிறது.",
      default: "இந்தப் பயிர் கிடைக்கக்கூடிய ஆதாரத் தரவின் அடிப்படையில் பட்டியலிடப்பட்டுள்ளது.",
    },
    limitation: {
      district_crop_suitability_unavailable: "மாவட்டத்திற்கான பயிர் பொருத்த விதிகள் இல்லை; மாவட்டம் பரிந்துரையை மாற்றவில்லை.",
      district_soil_climate_data_unavailable: "இந்த மாவட்டத்திற்கான உள்ளூர் மண் மற்றும் காலநிலைத் தரவு நிறுவப்படவில்லை.",
      seasonal_sowing_guidance_unavailable: "பருவம் அல்லது விதைப்பு மாதத்திற்கான உள்ளூர் வழிகாட்டுதல் தரவு இல்லை.",
      soil_compatibility_not_assessed: "மண் வகைக்கான ஆதாரப்பூர்வ பயிர் பொருத்தம் மதிப்பிடப்படவில்லை.",
      cost_and_market_data_unavailable: "நம்பகமான உள்ளீட்டுச் செலவு அல்லது தற்போதைய உள்ளூர் சந்தை விலைத் தரவு இல்லை.",
      goal_not_supported_by_available_crop_data: "தேர்ந்தெடுத்த இலக்கை மதிப்பிடத் தேவையான ஆதாரத் தரவு இல்லை; அது தரவரிசையில் பயன்படுத்தப்படவில்லை.",
      issue_not_supported_by_available_crop_data: "தேர்ந்தெடுத்த பிரச்சினைக்கான பயிர் பொருத்தத் தரவு இல்லை; அது தரவரிசையில் பயன்படுத்தப்படவில்லை.",
      consult_agricultural_officer_for_pest_or_disease: "பூச்சி அல்லது நோயை இந்தக் கருவி கண்டறியாது. அருகிலுள்ள வேளாண்மை அலுவலரை அணுகவும்.",
      water_availability_not_provided_mid_range_used: "பாசனத் தகவல் வழங்கப்படாததால், மூல அட்டவணையின் நடுத்தர நீர் தேவையை ஒப்பீட்டு அடிப்படையாகப் பயன்படுத்தினோம்.",
      selected_soil_type_not_used_without_source_backed_rules: "தேர்ந்தெடுத்த மண் வகையை இணைக்கும் ஆதாரம் இல்லாததால் தரவரிசையில் பயன்படுத்தவில்லை.",
      selected_season_not_used_without_local_sowing_calendar: "உள்ளூர் விதைப்பு காலண்டர் இல்லாததால் தேர்ந்தெடுத்த பருவத்தை தரவரிசையில் பயன்படுத்தவில்லை.",
      issue_description_is_context_only_not_diagnosed: "உங்கள் விளக்கம் பதிவு செய்யப்பட்டது; நோய் அல்லது பூச்சி கண்டறிதல் செய்யப்படவில்லை.",
      default: "இந்தத் தகவலுக்கான உள்ளூர் ஆதாரம் கிடைக்கவில்லை.",
    },
  },
  en: {
    analysisEyebrow: "Easy Farmer Analysis",
    heading: "Choose the right crop for your farm",
    description: "Select your district, farming challenge and goal. We'll help you explore suitable crop options using available agricultural information.",
    district: "District",
    districtListLabel: "Tamil Nadu districts",
    districtSearchPlaceholder: "Search and select a district",
    districtHelp: "All 38 districts are listed. Search by district name in English or Tamil.",
    districtNoResults: "No district found. Try another English or Tamil name.",
    issues: {
      low_rainfall: "Low rainfall / water scarcity",
      heavy_rainfall: "Heavy rainfall / flood risk",
      low_fertility: "Low soil fertility",
      ph_issue: "Soil pH issue",
      pest_disease: "Pest or disease problem",
      market_profit: "Market price / profitability problem",
      no_problem: "No specific problem",
      other: "Other",
    },
    goals: {
      higher_yield: "Higher yield",
      low_water: "Less-water farming",
      short_duration: "Short-duration crop",
      lower_investment: "Lower investment",
      higher_profit: "Higher profitability",
      improve_soil_fertility: "Improve soil fertility",
    },
    issue: "Main farming challenge",
    chooseIssue: "Choose a farming challenge",
    goal: "Your main goal",
    chooseGoal: "Choose a goal",
    issueDescription: "Briefly describe the issue",
    pestDescription: "Pest / disease symptoms (optional)",
    descriptionPlaceholder: "Up to 240 characters",
    optionalInfo: "Optional information",
    irrigation: "Irrigation availability",
    irrigationUnknown: "Unknown / prefer not to say",
    irrigationRainfed: "Rain-fed",
    irrigationLimited: "Limited irrigation",
    irrigationReliable: "Reliable irrigation",
    season: "Season",
    seasonNotSelected: "Not selected",
    seasonKharif: "Kharif / southwest monsoon",
    seasonRabi: "Rabi / northeast monsoon",
    seasonSummer: "Summer",
    seasonYearRound: "Year-round",
    sowingMonth: "Approximate sowing month",
    soilType: "Soil type, if known",
    soilUnknown: "Unknown / prefer not to say",
    soilRedLoam: "Red loam",
    soilBlack: "Black soil",
    soilClay: "Clay soil",
    soilSandy: "Sandy soil",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    submit: "Get Crop Recommendations",
    loading: "Preparing recommendations…",
    selectDistrictError: "Choose a district from the list.",
    requiredError: "Choose a farming challenge and a goal.",
    otherDescriptionError: "Briefly describe the other farming issue.",
    apiError: "Recommendations are unavailable right now. Please try again.",
    responseError: "The crop recommendation response was invalid. Please try again.",
    cropResponseError: "The crop recommendation details were invalid. Please try again.",
    comparison: "Comparison based on available source data",
    topCrops: "Three crop options to explore",
    provisionalNote: "These provisional options are compared using the TNAU water-requirement and crop-duration table; they are not a district-specific suitability assessment.",
    option: "Option",
    why: "Why this option?",
    sourceWater: "Total water requirement in source table",
    relativeLow: "Relatively low",
    relativeMedium: "Relatively medium",
    relativeHigh: "Relatively high",
    duration: "Crop duration in source table",
    aboutDays: "About {days} days",
    suitability: "Season / soil / climate suitability",
    districtUnavailable: "District-level evidence unavailable; not assessed",
    cost: "Input cost / market price",
    localDataUnavailable: "Reliable local data unavailable",
    sourceLabel: "Source",
    updated: "Source updated: {date}.",
    sourceDateUnavailable: "The source does not specify a last-updated date.",
    limitationsHeading: "Data limitations",
    advisoryNote: "These recommendations are advisory only; yield or profit is not guaranteed. Confirm with a local agricultural expert before planting.",
    pestAdvice: "If you see pest or disease symptoms, consult a local agricultural officer.",
    reason: {
      middle_relative_water_need: "This crop has a relatively medium water requirement in the source table.",
      relative_water_need_matches_selected_availability: "The source water requirement was ranked against your selected irrigation availability.",
      lower_water_use_supports_goal: "Its relatively lower water requirement aligns with your goal.",
      shorter_duration_supports_goal: "Its shorter duration in the source data aligns with your goal.",
      default: "This crop is listed based on the available source data.",
    },
    limitation: {
      district_crop_suitability_unavailable: "No district-specific crop suitability rules are available; district did not change the ranking.",
      district_soil_climate_data_unavailable: "Local soil and climate data for this district are not installed.",
      seasonal_sowing_guidance_unavailable: "Local guidance for the selected season or sowing month is unavailable.",
      soil_compatibility_not_assessed: "Source-backed compatibility for the selected soil type was not assessed.",
      cost_and_market_data_unavailable: "Reliable input-cost or current local market-price data are unavailable.",
      goal_not_supported_by_available_crop_data: "Available source data does not assess this goal; it was not used in the ranking.",
      issue_not_supported_by_available_crop_data: "Available source data does not assess this challenge; it was not used in the ranking.",
      consult_agricultural_officer_for_pest_or_disease: "This tool does not diagnose pests or diseases. Consult a local agricultural officer.",
      water_availability_not_provided_mid_range_used: "No irrigation preference was provided, so the source table's middle water requirement was used for comparison.",
      selected_soil_type_not_used_without_source_backed_rules: "The selected soil type was not used because no source-backed rules connect it to these crops.",
      selected_season_not_used_without_local_sowing_calendar: "The selected season was not used because a local sowing calendar is unavailable.",
      issue_description_is_context_only_not_diagnosed: "Your description was recorded as context; no pest or disease diagnosis was made.",
      default: "No local source is available for this information.",
    },
  },
};

export function translateFarmer(language, key, values = {}) {
  const selected = FARMER_TRANSLATIONS[language] ?? FARMER_TRANSLATIONS.en;
  const fallback = FARMER_TRANSLATIONS.en;
  const parts = key.split(".");
  let value = parts.reduce((current, part) => current?.[part], selected);
  if (typeof value !== "string") {
    value = parts.reduce((current, part) => current?.[part], fallback);
  }
  if (typeof value !== "string") {
    return language === "en" ? `[Missing translation: ${key}]` : key;
  }
  return value.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

export function getFarmerCropReason(language, reason) {
  const dictionary = FARMER_TRANSLATIONS[language] ?? FARMER_TRANSLATIONS.en;
  return dictionary.reason[reason] ?? dictionary.reason.default;
}

export function getFarmerCropLimitation(language, limitation) {
  const dictionary = FARMER_TRANSLATIONS[language] ?? FARMER_TRANSLATIONS.en;
  return dictionary.limitation[limitation] ?? dictionary.limitation.default;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateFarmerCropRecommendationsResponse(response, language = "en") {
  const classes = new Set(["low", "medium", "high"]);
  if (
    !isRecord(response)
    || response.status !== "provisional"
    || response.method !== "tnau_source_based_relative_water_and_duration_ranking"
    || !isRecord(response.district_data)
    || response.district_data.status !== "unavailable"
    || !isNonEmptyString(response.district_data.reason)
    || !Array.isArray(response.recommendations)
    || response.recommendations.length !== 3
    || !isRecord(response.source)
    || !isNonEmptyString(response.source.title)
    || !isNonEmptyString(response.source.publisher)
    || !isNonEmptyString(response.source.url)
    || !Array.isArray(response.limitations)
    || !response.limitations.every(isNonEmptyString)
    || !(response.source_last_updated === null || isNonEmptyString(response.source_last_updated))
    || typeof response.advisory_only !== "boolean"
    || response.advisory_only !== true
  ) {
    throw new Error(translateFarmer(language, "responseError"));
  }
  response.recommendations.forEach((crop, index) => {
    if (
      !isRecord(crop)
      || crop.rank !== index + 1
      || !isNonEmptyString(crop.crop)
      || !isNonEmptyString(crop.crop_ta)
      || typeof crop.water_requirement_mm !== "number"
      || !Number.isFinite(crop.water_requirement_mm)
      || crop.water_requirement_mm < 0
      || !classes.has(crop.water_requirement_class)
      || !Number.isInteger(crop.duration_days)
      || crop.duration_days < 1
      || !Array.isArray(crop.reasons)
      || !crop.reasons.every(isNonEmptyString)
      || !isRecord(crop.source)
      || !isNonEmptyString(crop.source.publisher)
      || !isNonEmptyString(crop.source.url)
      || crop.season_guidance !== null
      || crop.soil_climate_suitability !== "not_assessed"
      || crop.input_cost_category !== null
      || crop.market_information !== null
    ) {
      throw new Error(translateFarmer(language, "cropResponseError"));
    }
  });
  return response;
}
