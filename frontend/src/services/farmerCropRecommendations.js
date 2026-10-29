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
    describeFarm: "உங்கள் பண்ணையை விவரிக்கவும்",
    describeFarmPlaceholder: "உதா: கோயம்புத்தூர், செம்மண், குறைந்த மழை, குறைந்த தண்ணீர், செப்டம்பர்.",
    describeFarmHelp: "தமிழிலோ ஆங்கிலத்திலோ எழுதலாம். தேர்ந்தெடுத்த படிவ மதிப்புகள் உரையில் உள்ளவற்றை விட முன்னுரிமை பெறும்; முரண்பாடுகள் இருந்தால் உறுதிப்படுத்தக் கேட்போம்.",
    clarificationHeading: "சில விவரங்களை உறுதிப்படுத்துங்கள்",
    unsupportedHeading: "இந்தக் கேள்விக்கு வேறு உதவி தேவை",
    parsedConditions: "புரிந்துகொண்ட பண்ணை விவரங்கள்",
    conflictFields: "முரண்பட்ட விவரங்கள்",
    seasonalAssessment: "பருவ பொருத்தம்",
    fields: {
      district: "மாவட்டம்", soil_type: "மண் வகை", rainfall: "மழை நிலை",
      irrigation: "பாசனம்", sowing_month: "விதைப்பு மாதம்", season: "பருவம்", issue: "பிரச்சினை",
      goal: "இலக்கு",
      affected_crop: "பாதிக்கப்பட்ட பயிர்", issue_description: "பிரச்சினை விளக்கம்",
      season_month: "பருவம் / விதைப்பு மாதம்", season_month_consistency: "பருவம் / மாத ஒப்புமை",
    },
    seasonal: { not_assessed: "மதிப்பிடப்படவில்லை" },
    seasonMonthConsistency: { conflict: "உறுதிப்படுத்த வேண்டும்", consistent: "பொருந்துகிறது", not_assessed: "மதிப்பிடப்படவில்லை" },
    notProvided: "வழங்கப்படவில்லை",
    rainfall: { low: "குறைவு (அளவிடப்படவில்லை)", excess: "அதிகம் / நீர்தேக்கம்", not_provided: "வழங்கப்படவில்லை" },
    description: "இந்த வழிகாட்டி ஆதாரமுள்ள நீர் தேவை மற்றும் பயிர் காலத் தரவின் அடிப்படையில் மட்டுமே பயிர்களை ஒப்பிடும். மண் வளம், லாபம், மாவட்டம், மண் வகை அல்லது பருவத்தை மதிப்பிடத் தேவையான ஆதாரம் இல்லையெனில், தவறான பயிர் பட்டியலுக்குப் பதிலாக கூடுதல் தகவல் கேட்கும்.",
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
    crops: {
      rice: "நெல்",
      sugarcane: "கரும்பு",
      groundnut: "நிலக்கடலை",
      sorghum: "சோளம்",
      maize: "மக்காச்சோளம்",
      ragi: "கேழ்வரகு",
      cotton: "பருத்தி",
      blackgram: "உளுந்து",
      soybean: "சோயாபீன்",
      sesame: "எள்",
      sunflower: "சூரியகாந்தி",
      cowpea: "காராமணி",
      redgram: "துவரை",
    },
    chooseGoal: "இலக்கைத் தேர்வு செய்யுங்கள்",
    issueDescription: "பிரச்சினையைச் சுருக்கமாக விவரிக்கவும்",
    pestDescription: "பாதிக்கப்பட்ட பயிர் மற்றும் பூச்சி / நோய் அறிகுறிகள் *",
    affectedCrop: "பாதிக்கப்பட்ட பயிர்",
    affectedCropPlaceholder: "உதா: நெல், பருத்தி, நிலக்கடலை",
    affectedCropError: "பாதிக்கப்பட்ட பயிரின் பெயரை குறிப்பிடுங்கள்.",
    descriptionPlaceholder: "அதிகபட்சம் 240 எழுத்துகள்",
    optionalInfo: "விருப்பத் தகவல்",
    modelInputsHeading: "பயிர் மாதிரி பரிந்துரைக்கான உண்மையான அளவீடுகள்",
    modelInputsToggle: "விருப்பம்: மாதிரி கணிப்புக்கான அளவீடுகளைத் திறக்கவும்",
    modelInputsHelp: "அளவீடுகள் பண்ணை ஆலோசனையில் பதிவு செய்யப்படும்; நிறுவப்பட்ட ஆதாரம் அவற்றை மதிப்பிடாததால் பயிர் வரிசையில் பயன்படுத்தப்படாது. ஏழு மதிப்புகளையும் உள்ளிட்டால், அதற்கு மேலாக தனி Random Forest கணிப்பும் காட்டப்படும். மாவட்டம் அல்லது தேர்வுகளிலிருந்து மதிப்புகளை ஊகிக்கமாட்டோம். பயிற்சித் தரவில் N/P/K அலகுகள் மற்றும் வானிலை சராசரி முறை ஆவணப்படுத்தப்படவில்லை; பொருத்தமான தரவு உங்களிடம் இருந்தால் மட்டுமே உள்ளிடுங்கள்.",
    soilTestInputsHeading: "விருப்ப மண் பரிசோதனை மதிப்புகள்",
    soilTestInputsHelp: "மின் கடத்துத்திறன் மற்றும் கரிமக் கார்பன் பதிவுசெய்யப்படும்; தற்போது ஆதாரமுள்ள பயிர் விதிகள் இவற்றை மதிப்பிடாததால் தரவரிசையில் பயன்படுத்தப்படாது.",
    soilTestInputUnits: {
      electrical_conductivity_ds_m: "மண் மின் கடத்துத்திறன் · dS/m",
      organic_carbon_pct: "கரிமக் கார்பன் · %",
    },
    soilTestInvalid: "இந்த மண் பரிசோதனை மதிப்புகள் ஏற்ற வரம்புக்கு வெளியே உள்ளன:",
    modelInputUnits: {
      N: "N · மாதிரி அலகு ஆவணப்படுத்தப்படவில்லை",
      P: "P · மாதிரி அலகு ஆவணப்படுத்தப்படவில்லை",
      K: "K · மாதிரி அலகு ஆவணப்படுத்தப்படவில்லை",
      temperature: "வெப்பநிலை · °C",
      humidity: "ஈரப்பதம் · %",
      ph: "மண் pH",
      rainfall: "மழை · mm",
    },
    modelMissing: "மாதிரி கணிப்புக்கு இந்த 7 அளவீடுகளும் தேவை:",
    modelInvalid: "இந்த அளவுகள் செல்லுபடியாகும் வரம்புக்கு வெளியே உள்ளன:",
    modelIncomplete: "பண்ணை பகுப்பாய்வு முடிந்தது. மாதிரி கணிப்புக்கு மீதமுள்ள அளவீடுகளையும் வழங்கவும்:",
    modelPredictionError: "பயிர் பகுப்பாய்வு முடிந்தது; தனி மாதிரி கணிப்பை உருவாக்க முடியவில்லை:",
    modelMeasurementsNotScored: "பதிவுசெய்யப்பட்ட அளவீடுகள் ஆதாரமுள்ள பயிர் விதிகள் இல்லாததால் தரவரிசையில் பயன்படுத்தப்படவில்லை.",
    modelUnavailableUnits: "முடிவு பயிர் வெற்றியை நிரூபிக்காது; உள்ளூர் பயிர் பொருத்தத்தைத் தனியாகச் சரிபார்க்கவும்.",
    modelRecommendation: "பயிற்சியுற்ற மாதிரியின் பயிர் வரிசை",
    recommendedCrop: "முதல் மாதிரி தேர்வு",
    modelRecommendationMethod: "இந்த முடிவு நீங்கள் உள்ளிட்ட ஏழு மதிப்புகளைப் பயன்படுத்தும் Random Forest மாதிரியின் வகைப்பாடு மட்டுமே; இது மாவட்டம் அல்லது பருவப் பொருத்தத்தை மதிப்பிடாது. பயிற்சித் தரவின் N/P/K அலகுகள் மற்றும் வானிலை சராசரி முறை தெரியவில்லை.",
    modelVote: "மாதிரி வாக்கு விகிதம்",
    modelVoteNote: "அளவுத்திருத்தப்படாதது; பயிர் வெற்றியின் நிகழ்தகவு அல்ல.",
    modelInputSummary: "மாதிரிக்கு அனுப்பிய அளவீடுகள்",
    modelLocationAction: "இடத் தரவு உதவியுடன் உள்ளிட முழு பகுப்பாய்வைப் பயன்படுத்துங்கள்",
    irrigation: "பாசன வசதி",
    irrigationMethod: "பாசன முறை",
    irrigationMethodDrip: "சொட்டு பாசனம்",
    irrigationMethodSprinkler: "தெளிப்பு பாசனம்",
    irrigationMethodSurface: "மேற்பரப்பு பாசனம்",
    irrigationMethodFurrow: "பாத்தி பாசனம்",
    irrigationMethodOther: "மற்ற முறை",
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
    verifiedSowingWindow: "TNAU ஆதாரத்தில் உள்ள விதைப்பு காலம்",
    varietiesLabel: "ஆதாரத்தில் குறிப்பிடப்பட்ட வகைகள்",
    waterRegimes: { rainfed: "மழை சார்ந்த", irrigated: "பாசன வசதி" },
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
    requiredError: "விவசாய விவரங்களைத் தேர்ந்தெடுக்கவும் அல்லது உங்கள் பண்ணையை விவரிக்கவும்.",
    otherDescriptionError: "மற்ற பிரச்சினையைச் சுருக்கமாக எழுதுங்கள்.",
    pestDescriptionError: "பாதிக்கப்பட்ட பயிர் மற்றும் தெரியும் அறிகுறிகளைச் சுருக்கமாக எழுதுங்கள்.",
    apiError: "பரிந்துரைகளை இப்போது பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    responseError: "Farmer Guide API வேறு பதிப்பிலிருந்து பதில் அளிக்கிறது. Vercel-இல் VITE_API_BASE_URL-ஐ நீக்கவும் அல்லது /api என அமைக்கவும்; repository root-இலிருந்து frontend மற்றும் backend-ஐ ஒன்றாக deploy செய்து பக்கத்தை மீண்டும் திறக்கவும்.",
    cropResponseError: "பயிர் பரிந்துரை விவரங்கள் சரியான வடிவில் இல்லை. மீண்டும் முயற்சிக்கவும்.",
    comparison: "பகுப்பாய்வு நிலை",
    confidence: "நம்பகத்தன்மை நிலை",
    confidenceLevels: { low: "குறைவு · ஒப்பீட்டு ஆதாரம் மட்டும்", not_assessed: "மதிப்பிடப்படவில்லை" },
    relativeRecommendationHeading: "உங்கள் பதில்களின் அடிப்படையிலான பயிர் விருப்பங்கள்",
    relativeRecommendationNote: "இவை TNAU நீர்/பயிர் காலத் தரவு மற்றும் ஆதாரம் உள்ள பயிர்களுக்கு மட்டும் மாவட்டம்-மாத விதைப்பு காலண்டரை வைத்து உருவாக்கிய ஒப்பீட்டு விருப்பங்கள்; உங்கள் நிலப் பொருத்தத்தை உறுதி செய்யவில்லை.",
    relativeMatch: "ஒப்பீட்டு வரிசை",
    relativeScore: "ஆதார அட்டவணை ஒப்பீட்டு மதிப்பெண்",
    relativeMatchNote: "முதல் மூன்று ஆதாரமுள்ள விருப்பங்கள் மட்டுமே காட்டப்படும்; ஆதாரம் மூன்றுக்கும் குறைவான பயிர்களை ஆதரித்தால் அதற்குக் குறைவாக இருக்கலாம். 0–100 மதிப்பெண் முதன்மை ஆதாரக் காரணியின் ஒப்பீட்டு மதிப்பைக் காட்டுகிறது; இது நிலப் பொருத்தம் அல்லது வெற்றி நிகழ்தகவு அல்ல.",
    conditionalSuitability: "நிபந்தனையுடன் பரிசீலிக்கலாம் — முழு நிலப் பொருத்தம் நிரூபிக்கப்படவில்லை",
    notRecommendedFromEvidence: "இந்தத் தேர்வில் பரிந்துரைக்கப்படவில்லை",
    excludedCropReasons: {
      district_excluded_by_source: "மேற்கோள் காட்டிய TNAU மாவட்டப் பட்டியலில் இந்த மாவட்டம் விலக்கப்பட்டுள்ளது.",
      district_not_listed_for_sowing_window: "மேற்கோள் காட்டிய TNAU பருவப் பட்டியலில் இந்த மாவட்டம் இந்த மாதத்திற்காக குறிப்பிடப்படவில்லை.",
      month_not_listed_for_selected_water_regime: "மேற்கோள் காட்டிய TNAU அட்டவணையில் இந்த மாதமும் நீர் முறையும் சேர்க்கப்படவில்லை.",
      sowing_month_not_listed_by_source: "மேற்கோள் காட்டிய TNAU அட்டவணையில் இந்த விதைப்பு மாதம் இல்லை.",
    },
    cropEvidence: {
      rice_excess_water_management: "TNAU வழிகாட்டுதல்படி நெற்பயிரிலும் குறிப்பிட்ட வளர்ச்சி நிலைகளில் அதிக நீர் தேக்கம் பாதிப்பை ஏற்படுத்தலாம்; வடிகால் அவசியம்.",
      rice_sowing_calendar_window: "தேர்ந்த மாதத்திற்கு TNAU நெல் பருவ அட்டவணை பொருந்தும் காலத்தை வழங்குகிறது; உள்ளூர் வகை மற்றும் பாசன பரிந்துரையை உறுதிப்படுத்துங்கள்.",
      rice_duration_varies_by_season: "நெல் கால அளவு பருவத்துக்கு மாறுகிறது; குறிப்பிட்ட பருவத்தைத் தேர்வு செய்யாததால் குறுகிய கால இலக்கிற்கு நெல் மதிப்பிடப்படவில்லை.",
      blackgram_avoid_water_stagnation: "TNAU வழிகாட்டுதல்படி உளுந்தில் நீர் தேக்கம் தவிர்க்கப்பட வேண்டும்; பூக்கும் மற்றும் காய் உருவாகும் நிலைகளில் பாசனம் முக்கியம்.",
      ragi_variety_duration_differs: "TNAU வகை விவரங்களில் ராகி கால அளவு வகைபடி மாறுகிறது; வகை தேர்வு செய்யாததால் குறுகிய கால இலக்கிற்கு ராகி மதிப்பிடப்படவில்லை.",
      sorghum_sowing_calendar_window: "தேர்ந்த மாவட்டம் மற்றும் மாதம் TNAU சோளம் விதைப்பு காலப் பதிவுடன் பொருந்துகிறது.",
      cowpea_sowing_calendar_window: "தேர்ந்த மாவட்டம் மற்றும் மாதம் TNAU காராமணி விதைப்பு காலப் பதிவுடன் பொருந்துகிறது; நீர் தேவை ஒப்பீட்டு அட்டவணையில் இல்லை.",
      cowpea_water_and_duration_not_in_comparison_table: "TNAU பயிர் பருவம் மற்றும் வகைத் தகவலை வழங்குகிறது; ஆனால் ஒப்பீட்டு அட்டவணையில் காராமணியின் நீர் தேவையும் ஒரே கால அளவும் இல்லை.",
      redgram_sowing_calendar_window: "தேர்ந்த மாவட்டம் மற்றும் மாதம் TNAU துவரை விதைப்பு காலப் பதிவுடன் பொருந்துகிறது.",
      redgram_water_and_duration_not_in_comparison_table: "TNAU பயிர் பருவம் மற்றும் வகைத் தகவலை வழங்குகிறது; ஆனால் ஒப்பீட்டு அட்டவணையில் துவரையின் நீர் தேவையும் ஒரே கால அளவும் இல்லை.",
    },
    cropWaterRequirement: "ஆதார அட்டவணை நீர் தேவை",
    relativeWaterClass: "ஆதார அட்டவணையிலான ஒப்பீட்டு நீர் வகை",
    waterClassLow: "குறைவு (இந்த அட்டவணையில் ஒப்பீட்டளவில்)",
    waterClassMedium: "நடுத்தரம் (இந்த அட்டவணையில் ஒப்பீட்டளவில்)",
    waterClassHigh: "அதிகம் (இந்த அட்டவணையில் ஒப்பீட்டளவில்)",
    cropDuration: "ஆதார அட்டவணை கால அளவு",
    notAssessed: "மதிப்பிடப்படவில்லை",
    scoreBasis: "முதன்மை மதிப்பெண் மற்றும் வரிசைத் தீர்மானிகள்",
    factorRoles: {
      primary: "முதன்மை",
      secondary: "இரண்டாம் நிலை",
      tie_breaker: "சமநிலைத் தீர்மானி",
    },
    calendarOptionsNotRanked: "பருவ ஆதாரம் பொருந்துகிறது; நீர்/காலத் தரவு இல்லாததால் தரவரிசைப்படுத்தப்படவில்லை",
    calendarOptionsNotRankedHelp: "TNAU விதைப்பு காலண்டர் பொருந்துகிறது. பயிரின் நீர் தேவை மற்றும் ஒரே கால அளவு கிடைக்காததால் இவை ஒப்பீட்டு தரவரிசையில் சேர்க்கப்படவில்லை.",
    calendarOnlyReason: "பயிரின் நீர் தேவை மற்றும் கால அளவு ஒப்பீட்டு அட்டவணையில் இல்லை.",
    factorLabels: {
    water_availability: "நீர் தேவையின் ஒப்பீடு",
    farmer_goal: "தேர்ந்த பயிர் நீர்/கால இலக்கு",
    verified_sowing_window_match: "TNAU விதைப்பு கால பொருத்தம்",
    flood_risk_eligibility_gate: "வெள்ள அபாய பாதுகாப்பு நிபந்தனை",
    },
    inputUsageHeading: "ஒவ்வொரு பண்ணை உள்ளீடும் எவ்வாறு பயன்படுத்தப்பட்டது",
    inputUsageStatus: {
    scored: "மதிப்பெண்ணில் பயன்படுத்தப்பட்டது",
    recorded_but_unscored: "பதிவுசெய்யப்பட்டது; மதிப்பெண்ணில் பயன்படுத்தப்படவில்லை",
    missing_or_unknown: "வழங்கப்படவில்லை / தெரியவில்லை",
    },
    inputUsageFields: {
    district: "மாவட்டம்",
    soil_type: "மண் வகை",
    rainfall: "விவரிக்கப்பட்ட மழை நிலை",
    irrigation: "பாசன வசதி",
    irrigation_method: "பாசன முறை",
    season: "பருவம்",
    sowing_month: "விதைப்பு மாதம்",
    issue: "விவசாயப் பிரச்சினை",
    goal: "விவசாய இலக்கு",
    free_text: "பண்ணை விளக்க உரை",
    N: "N",
    P: "P",
    K: "K",
    temperature: "வெப்பநிலை",
    humidity: "ஈரப்பதம்",
    soil_ph: "மண் pH",
    measured_rainfall_mm: "அளவிடப்பட்ட மழை",
    electrical_conductivity_ds_m: "மின் கடத்துத்திறன் · EC",
    organic_carbon_pct: "கரிமக் கார்பன்",
    },
    aboutDaysUnit: "நாட்கள்",
    scoredWater: "நீர் வசதி / குறைந்த மழைத் தேர்வின் அடிப்படையிலான ஒப்பீடு",
    scoredGoal: "நீங்கள் தேர்ந்தெடுத்த இலக்கு",
    unavailableScore: "இந்தத் தேர்வை கிடைக்கும் பயிர் தரவு மதிப்பிடவில்லை.",
    sourceAttribution: "ஆதாரம்",
    noSupportedRanking: "இந்தப் பதில்களுக்கு ஆதாரமுள்ள பயிர் வரிசை கிடைக்கவில்லை. குறைந்த நீர் அல்லது குறுகிய கால இலக்கைத் தேர்ந்தெடுத்து முயற்சிக்கவும்; உள்ளூர் வேளாண்மை ஆலோசனையையும் பெறவும்.",
    lowRainfallIsQualitative: "குறைந்த மழை என்பது உங்கள் பதிலில் கூறிய கவலை மட்டுமே; இது அளவிடப்பட்ட மழைத் தரவு அல்ல.",
    heavyRainfallNotAssessed: "அதிக மழை / வெள்ள அபாயத்திற்கான பயிர் தாங்குதிறன் இந்தத் தரவில் இல்லை; பாதுகாப்பான பயிர் தரவரிசை வழங்கப்படவில்லை.",
    noCropGuideAvailable: "இந்தத் தரவு அட்டவணையில் விதைத் தேர்வு, நிலத் தயாரிப்பு, உர அளவு, பூச்சி மேலாண்மை அல்லது அறுவடை வழிகாட்டுதல் இல்லை.",
    viewFarmingGuide: "சாகுபடி வழிகாட்டி",
    bestOptionSummary: "இந்த ஒப்பீட்டில் முதன்மையான விருப்பம்",
    rankingByWater: "நீர் தேவையின் ஒப்பீட்டு வரிசை பயன்படுத்தப்பட்டது",
    rankingByGoal: "நீங்கள் தேர்ந்தெடுத்த நீர் / கால இலக்கு பயன்படுத்தப்பட்டது",
    monthLabel: "விதைப்பு மாதம்",
    issueDescriptionLabel: "நீங்கள் விவரித்த அறிகுறி",
    rankingStrategy: "வரிசைப்படுத்தும் முறை",
    rankingStrategies: {
      water_availability_primary: "ஆதார அட்டவணையின் ஒப்பீட்டு நீர் தேவையை முதன்மையாகப் பயன்படுத்தி வரிசைப்படுத்தப்பட்டது.",
      short_duration_then_water: "குறுகிய கால இலக்கு முதன்மை; சமநிலையில் ஒப்பீட்டு நீர் தேவை பயன்படுத்தப்பட்டது.",
      farmer_goal_primary: "ஆதாரத் தரவு ஆதரிக்கும் விவசாய இலக்கு முதன்மையாகப் பயன்படுத்தப்பட்டது.",
      lowest_water_then_duration: "அட்டவணையில் குறைந்த மொத்த நீர் தேவை முதலில்; சமமானால் குறுகிய காலம் முதலில்.",
      combined_water_and_goal: "அட்டவணை மதிப்புகளிலிருந்து நீர் கிடைப்பு மற்றும் உங்கள் நீர் / கால இலக்கு இரண்டும் சேர்த்து கணக்கிடப்பட்டன.",
      middle_water_then_goal_tiebreak: "அட்டவணையின் நடுத்தர நீர் தேவைக்கு அருகிலுள்ளவை முதலில்; நீர் அளவு ஒதுக்கீடு தெரியாது.",
      lowest_water_first: "அட்டவணையில் குறைந்த மொத்த நீர் தேவை முதலில்.",
      shortest_duration_first: "அட்டவணையில் குறைந்த கால அளவு முதலில்.",
      verified_sowing_window_only: "இந்த மாவட்டம் மற்றும் மாதத்திற்கான ஆதாரமுள்ள விதைப்பு காலண்டர் மட்டும் பயன்படுத்தப்பட்டது.",
      verified_sowing_window_and_goal: "ஆதாரமுள்ள விதைப்பு காலண்டரும் நீர் / கால இலக்கும் பயன்படுத்தப்பட்டன.",
      withheld_heavy_rainfall: "அதிக மழை / வெள்ள அபாயத்திற்கு ஆதாரமுள்ள தாங்குதிறன் இல்லை; தரவரிசை நிறுத்தப்பட்டது.",
      not_available: "கிடைக்கும் ஆதாரத்துடன் தரவரிசை உருவாக்க இயலவில்லை.",
    },
    topCrops: "நம்பகமான பயிர் பரிந்துரை வழங்க போதுமான தரவு இல்லை",
    provisionalNote: "மாவட்டம், பிரச்சினை, இலக்கு போன்ற தேர்வுகள் மட்டும் பயிர் பொருத்தத்தை நிரூபிக்காது. தவறான பயிர் பரிந்துரையைத் தவிர்க்கிறோம்.",
    evidenceReason: "இந்த விரைவு வழிகாட்டியில் சரிபார்க்கப்பட்ட மாவட்ட மண், வானிலை அல்லது பயிர்-பருவத் தரவு இல்லை.",
    selectedContext: "நீங்கள் வழங்கிய தகவல்",
    noCropRecommendation: "இந்தத் தகவலிலிருந்து பயிர் தரவரிசை உருவாக்கப்படவில்லை.",
    missingEvidence: "தேவையான சரிபார்க்கப்பட்ட தகவல்",
    requiredEvidence: "பயிர் மாதிரிக்கு மண் பரிசோதனையின் N, P, K, pH மற்றும் நம்பகமான வெப்பநிலை, ஈரப்பதம், மழை உள்ளீடுகள் தேவை.",
    modelAction: "முழு பயிர் பகுப்பாய்வைத் திறக்கவும்",
    modelActionHelp: "ஏற்கனவே உள்ள பயிற்சியளிக்கப்பட்ட மாதிரி ஏழு உள்ளீடுகளையும் பெற்ற பிறகே கணிக்கும். அது நேரடி வானிலை சேவை அல்ல.",
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
    advisoryNote: "விதைப்பு முடிவுக்கு முன் உள்ளூர் வேளாண்மை அலுவலரிடம் சரிபார்க்கவும்.",
    district_soil_climate_data_unavailable: "இந்த விரைவு வழிகாட்டியில் மாவட்டத்திற்கான சரிபார்க்கப்பட்ட மண் மற்றும் பயிர்-பருவத் தரவு இல்லை.",
    crop_specific_district_data_partial: "வெளிப்படையான TNAU பதிவுகள் உள்ள பயிர்களுக்கு மட்டுமே மாவட்ட விதிகள் பயன்படுத்தப்பட்டன; மற்ற பயிர்களின் மாவட்டப் பொருத்தம் தெரியவில்லை.",
    crop_specific_season_data_partial: "வெளிப்படையான TNAU பதிவுகள் உள்ள பயிர்களுக்கு மட்டுமே மாத விதிகள் பயன்படுத்தப்பட்டன; மற்ற பயிர்களுக்கு பருவப் பொருத்தம் ஊகிக்கப்படவில்லை.",
    calendar_matched_crops_not_ranked_water_and_duration_unknown: "TNAU விதைப்பு காலம் பொருந்தும் சில பயிர்களுக்கு ஒப்பீட்டு நீர் தேவை மற்றும் ஒரே கால அளவு இல்லை; எனவே அவை மதிப்பெண் வரிசையில் சேர்க்கப்படவில்லை.",
    irrigation_method_not_scored: "பாசன முறை பதிவு செய்யப்பட்டது; கிடைக்கும் பயிர் தரவு அதற்கான ஒப்பீட்டை ஆதரிக்கவில்லை.",
    free_text_not_understood_structured_inputs_used: "விளக்க உரை புரியவில்லை; ஆதரிக்கப்பட்ட படிவத் தேர்வுகள் மட்டும் பயன்படுத்தப்பட்டன.",
    meaningful_farm_description_required: "பயனுள்ள பண்ணை விளக்கம் அல்லது ஆதரிக்கப்பட்ட தேர்வுகள் தேவை.",
    current_weather_unavailable: "இந்த செயலியில் நேரடி வானிலை அளவுகள் கிடையாது; வரலாற்று சராசரிகள் தற்போதைய வானிலை அல்ல.",
    soil_test_values_required: "பயிர் மாதிரிக்கு மண் பரிசோதனை மதிப்புகள் தேவை; மாவட்டம் அல்லது மண் வகையை வைத்து N, P, K, pH கணிக்க முடியாது.",
    seasonal_sowing_guidance_unavailable: "சரிபார்க்கப்பட்ட மாவட்ட/பருவ விதைப்பு காலண்டர் நிறுவப்படவில்லை.",
    cost_and_market_data_unavailable: "நேரடி உள்ளூர் சந்தை விலை மற்றும் செலவு தரவு இல்லை.",
    consult_agricultural_officer_for_pest_or_disease: "பூச்சி அல்லது நோயை இந்தக் கருவி கண்டறியாது. அருகிலுள்ள வேளாண்மை அலுவலரை அணுகவும்.",
    issue_description_is_context_only_not_diagnosed: "உங்கள் விவரணம் பதிவு செய்யப்பட்டது; நோய் கண்டறிதல் செய்யப்படவில்லை.",
    pestAdvice: "பூச்சி அல்லது நோய் அறிகுறி இருந்தால், அருகிலுள்ள வேளாண்மை அலுவலரை அணுகவும்.",
    reason: {
      middle_relative_water_need: "மூல அட்டவணையில் ஒப்பீட்டளவில் நடுத்தர நீர் தேவை.",
      relative_water_need_matches_selected_availability: "நீர் தேவைத் தரவு உங்கள் பாசனத் தேர்வுடன் ஒப்பிட்டு வரிசைப்படுத்தப்பட்டது.",
      lower_water_use_supports_goal: "ஒப்பீட்டளவில் குறைந்த நீர் தேவை உங்கள் இலக்குடன் பொருந்துகிறது.",
      shorter_duration_supports_goal: "மூலத் தரவில் குறைந்த பயிர் காலம் உங்கள் இலக்குடன் பொருந்துகிறது.",
      verified_sowing_window_match: "தேர்ந்த மாவட்டம் மற்றும் மாதத்திற்கான TNAU விதைப்பு கால ஆதாரம் பொருந்துகிறது.",
      default: "இந்தப் பயிர் கிடைக்கக்கூடிய ஆதாரத் தரவின் அடிப்படையில் பட்டியலிடப்பட்டுள்ளது.",
    },
    limitation: {
      district_crop_suitability_unavailable: "மாவட்டத்திற்கான பயிர் பொருத்த விதிகள் இல்லை; மாவட்டம் பரிந்துரையை மாற்றவில்லை.",
      district_soil_climate_data_unavailable: "இந்த மாவட்டத்திற்கான உள்ளூர் மண் மற்றும் காலநிலைத் தரவு நிறுவப்படவில்லை.",
      crop_specific_district_data_partial: "வெளிப்படையான TNAU பதிவுகள் உள்ள பயிர்களுக்கு மட்டுமே மாவட்ட விதிகள் பயன்படுத்தப்பட்டன; மற்ற பயிர்களின் மாவட்டப் பொருத்தம் தெரியவில்லை.",
      crop_specific_season_data_partial: "வெளிப்படையான TNAU பதிவுகள் உள்ள பயிர்களுக்கு மட்டுமே மாத விதிகள் பயன்படுத்தப்பட்டன; மற்ற பயிர்களுக்கு பருவப் பொருத்தம் ஊகிக்கப்படவில்லை.",
      irrigation_method_not_scored: "பாசன முறை பதிவு செய்யப்பட்டது; கிடைக்கும் பயிர் தரவு அதற்கான ஒப்பீட்டை ஆதரிக்கவில்லை.",
      free_text_not_understood_structured_inputs_used: "விளக்க உரை புரியவில்லை; ஆதரிக்கப்பட்ட படிவத் தேர்வுகள் மட்டும் பயன்படுத்தப்பட்டன.",
      meaningful_farm_description_required: "பயனுள்ள பண்ணை விளக்கம் அல்லது ஆதரிக்கப்பட்ட தேர்வுகள் தேவை.",
      seasonal_sowing_guidance_unavailable: "பருவம் அல்லது விதைப்பு மாதத்திற்கான உள்ளூர் வழிகாட்டுதல் தரவு இல்லை.",
      soil_compatibility_not_assessed: "மண் வகைக்கான ஆதாரப்பூர்வ பயிர் பொருத்தம் மதிப்பிடப்படவில்லை.",
      cost_and_market_data_unavailable: "நம்பகமான உள்ளீட்டுச் செலவு அல்லது தற்போதைய உள்ளூர் சந்தை விலைத் தரவு இல்லை.",
      economic_goal_not_scored: "உங்கள் லாபம் அல்லது முதலீட்டு இலக்கு பதிவு செய்யப்பட்டது; நம்பகமான உள்ளூர் செலவு, மகசூல், விலை மற்றும் லாபத் தரவு இல்லாததால் மதிப்பிடப்படவில்லை.",
      reported_problem_not_assessed: "தேர்ந்த பிரச்சினை கிடைக்கும் பயிர் தரவால் மதிப்பிடப்படவில்லை.",
      farming_challenge_not_provided: "விவசாயப் பிரச்சினை தேர்வு செய்யப்படவில்லை.",
      selected_soil_type_not_scored: "நீங்கள் தேர்ந்த மண் வகை பதிவு செய்யப்பட்டது; கிடைக்கும் அட்டவணை அதற்கான பயிர் பொருத்தத்தை மதிப்பிடாது.",
      selected_season_not_scored: "நீங்கள் தேர்ந்த பருவம் பதிவு செய்யப்பட்டது; உள்ளூர் பயிர் காலண்டர் இல்லாததால் தரவரிசையில் பயன்படுத்தப்படவில்லை.",
      selected_sowing_month_not_scored: "நீங்கள் தேர்ந்த விதைப்பு மாதம் பதிவு செய்யப்பட்டது; ஆதாரமுள்ள மாதவாரி பயிர் காலண்டர் இல்லை.",
      selected_sowing_month_partially_scored: "விதைப்பு மாதம் TNAU காலண்டர் உள்ள பயிர்களுக்கு மட்டுமே மதிப்பிடப்பட்டது; மற்ற பயிர்களின் பொருத்தம் தெரியவில்லை.",
      season_month_consistency_not_local_calendar: "இது பொதுவான பருவம்/மாத உள்ளீட்டு சரிபார்ப்பு மட்டுமே; உள்ளூர் விதைப்பு காலண்டர் அல்ல.",
      low_rainfall_is_qualitative_only: "குறைந்த மழை என்பது உங்கள் பதிலில் கூறிய கவலை மட்டுமே; இது அளவிடப்பட்ட மழைத் தரவு அல்ல.",
      rainfall_not_measured: "உள்ளூர் மழை அளவீடு அல்லது முன்னறிவிப்பு இந்தப் பகுப்பாய்வில் பயன்படுத்தப்படவில்லை.",
      water_supply_volume_not_provided: "பாசன வகை மட்டும் வழங்கப்பட்டுள்ளது; கிடைக்கும் மொத்த நீர் அளவு தெரியவில்லை.",
      reliable_irrigation_not_quantified: "நம்பகமான பாசனம் தேர்வு செய்யப்பட்டிருந்தாலும், மொத்த நீர் ஒதுக்கீடு தெரியாததால் அதிக நீர் தேவை பயிர்களுக்கு முன்னுரிமை வழங்கப்படவில்லை.",
      heavy_rainfall_not_assessed: "அதிக மழை / நீர்தேக்கத்தைத் தாங்கும் பயிர் வகைகள் குறித்த ஆதாரம் இந்த அட்டவணையில் இல்லை.",
      no_crop_ranking_for_unassessed_flood_risk: "வெள்ள அபாயம் மதிப்பிடப்படாததால், தவறான பயிர் பரிந்துரையைத் தவிர்க்க தரவரிசை நிறுத்தப்பட்டது.",
      no_crop_ranking_for_unassessed_goal: "தேர்ந்த இலக்கை கிடைக்கும் பயிர் ஆதாரம் மதிப்பிடாததால் தரவரிசை நிறுத்தப்பட்டது.",
      crop_specific_farming_guide_unavailable: "பயிர் வாரியான சாகுபடி வழிகாட்டி இந்த ஆதாரத்தில் இல்லை.",
      irrigation_not_used_low_rainfall_priority: "குறைந்த மழைச் சவால் முன்னுரிமை பெற்றதால், பாசனத் தேர்வு இந்தத் தரவரிசையில் பயன்படுத்தப்படவில்லை.",
      no_supported_ranking_factor_selected: "நீர் கிடைப்போ அல்லது ஆதரிக்கப்படும் பயிர் இலக்கோ தேர்வு செய்யப்படாததால் தரவரிசை உருவாக்கப்படவில்லை.",
      goal_not_supported_by_available_crop_data: "தேர்ந்தெடுத்த இலக்கை மதிப்பிடத் தேவையான ஆதாரத் தரவு இல்லை; அது தரவரிசையில் பயன்படுத்தப்படவில்லை.",
      soil_test_needed_for_fertility_goal: "மண் வள இலக்கை மதிப்பிட மண் பரிசோதனை மதிப்புகள் தேவை; அவை கிடைக்கும் வரை அது பயிர் தரவரிசையில் சேர்க்கப்படவில்லை.",
      model_measurements_not_scored: "பதிவுசெய்யப்பட்ட அளவீடுகள் ஆதாரமுள்ள பயிர் விதிகள் இல்லாததால் தரவரிசையில் பயன்படுத்தப்படவில்லை.",
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
    describeFarm: "Describe your farm",
    describeFarmPlaceholder: "For example: Coimbatore, red soil, low rainfall, limited water, September.",
    describeFarmHelp: "Write in English or Tamil. Explicit form selections take precedence; if they conflict with the description, the result will ask you to confirm.",
    clarificationHeading: "Please confirm a few details",
    unsupportedHeading: "This needs a different kind of help",
    parsedConditions: "Farm conditions understood",
    conflictFields: "Conflicting details",
    seasonalAssessment: "Seasonal suitability",
    fields: {
      district: "District", soil_type: "Soil type", rainfall: "Rainfall",
      irrigation: "Irrigation", sowing_month: "Sowing month", season: "Season", issue: "Issue",
      goal: "Goal",
      affected_crop: "Affected crop", issue_description: "Issue description",
      season_month: "Season / sowing month", season_month_consistency: "Season / month check",
    },
    seasonal: { not_assessed: "Not assessed" },
    seasonMonthConsistency: { conflict: "Needs confirmation", consistent: "Consistent", not_assessed: "Not assessed" },
    notProvided: "Not provided",
    rainfall: { low: "Low (not measured)", excess: "Excess / waterlogging", not_provided: "Not provided" },
    description: "This guide compares crops only using sourced water-requirement and duration data. If evidence for soil fertility, profit, district, soil type or season is missing, it asks for more information instead of showing an unsupported crop list.",
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
    crops: {
      rice: "Rice",
      sugarcane: "Sugarcane",
      groundnut: "Groundnut",
      sorghum: "Sorghum",
      maize: "Maize",
      ragi: "Ragi",
      cotton: "Cotton",
      blackgram: "Blackgram",
      soybean: "Soybean",
      sesame: "Sesame",
      sunflower: "Sunflower",
      cowpea: "Cowpea",
      redgram: "Redgram",
    },
    chooseGoal: "Choose a goal",
    issueDescription: "Briefly describe the issue",
    pestDescription: "Affected crop and pest / disease symptoms *",
    affectedCrop: "Affected crop",
    affectedCropPlaceholder: "For example: rice, cotton, groundnut",
    affectedCropError: "Name the crop affected by the pest or disease.",
    descriptionPlaceholder: "Up to 240 characters",
    optionalInfo: "Optional information",
    modelInputsHeading: "Measured inputs for a model-based crop recommendation",
    modelInputsToggle: "Optional: open measurements for a model prediction",
    modelInputsHelp: "Measurements are recorded in the farm advisory but are not used in the crop ranking because the installed evidence does not support scoring them. Entering all seven also runs a separate Random Forest prediction. Values are never inferred from your district or selections. The training data does not document the N/P/K units or weather aggregation, so enter values only if you have data you consider compatible.",
    soilTestInputsHeading: "Optional soil-test measurements",
    soilTestInputsHelp: "Electrical conductivity and organic carbon are recorded but not used in ranking because the current crop evidence does not support scoring them.",
    soilTestInputUnits: {
      electrical_conductivity_ds_m: "Soil electrical conductivity · dS/m",
      organic_carbon_pct: "Organic carbon · %",
    },
    soilTestInvalid: "These soil-test values are outside the accepted input range:",
    modelInputUnits: {
      N: "N · model unit undocumented",
      P: "P · model unit undocumented",
      K: "K · model unit undocumented",
      temperature: "Temperature · °C",
      humidity: "Humidity · %",
      ph: "Soil pH",
      rainfall: "Rainfall · mm",
    },
    modelMissing: "All seven measurements are required for a model prediction:",
    modelInvalid: "These measurements are outside the accepted input range:",
    modelIncomplete: "The farm analysis is complete. Add the remaining measurements for a model prediction:",
    modelPredictionError: "The crop analysis completed, but the separate model prediction failed:",
    modelMeasurementsNotScored: "Recorded measurements were not used in ranking because the evidence does not support scoring them.",
    modelUnavailableUnits: "A model result does not prove crop success or local suitability; verify the choice locally.",
    modelRecommendation: "Trained-model crop ranking",
    recommendedCrop: "Top model selection",
    modelRecommendationMethod: "This is only the Random Forest classification from the seven values you entered; it does not assess district or planting-season suitability. The training data does not document N/P/K units or weather aggregation.",
    modelVote: "Model vote fraction",
    modelVoteNote: "Uncalibrated; not the probability of crop success.",
    modelInputSummary: "Measurements sent to the model",
    modelLocationAction: "Use full analysis for location-data assistance",
    irrigation: "Irrigation availability",
    irrigationMethod: "Irrigation method",
    irrigationMethodDrip: "Drip",
    irrigationMethodSprinkler: "Sprinkler",
    irrigationMethodSurface: "Surface",
    irrigationMethodFurrow: "Furrow",
    irrigationMethodOther: "Other",
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
    verifiedSowingWindow: "TNAU-documented sowing window",
    varietiesLabel: "Varieties listed by source",
    waterRegimes: { rainfed: "Rain-fed", irrigated: "Irrigated" },
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
    requiredError: "Choose farm details or describe your farm.",
    otherDescriptionError: "Briefly describe the other farming issue.",
    pestDescriptionError: "Briefly describe the affected crop and visible symptoms.",
    apiError: "Recommendations are unavailable right now. Please try again.",
    responseError: "The Farmer Guide API is responding from a different version. In Vercel, remove VITE_API_BASE_URL or set it to /api; deploy the frontend and backend together from the repository root, then reload.",
    cropResponseError: "The crop recommendation details were invalid. Please try again.",
    comparison: "Assessment status",
    confidence: "Confidence level",
    confidenceLevels: { low: "Low · relative source comparison only", not_assessed: "Not assessed" },
    relativeRecommendationHeading: "Crop options based on your answers",
    relativeRecommendationNote: "These are relative options ranked using TNAU water/duration data and, for crops with published calendars, a district/month sowing-window match. This does not confirm field suitability.",
    relativeMatch: "Relative rank",
    relativeScore: "Relative evidence-table score",
    relativeMatchNote: "Only the top three evidence-supported options are shown; fewer may appear when the available evidence supports fewer crops. The 0–100 score reports the relative value of the primary evidence factor, not field suitability or crop-success probability.",
    conditionalSuitability: "Conditional option — full field suitability is not established",
    notRecommendedFromEvidence: "Not recommended under this selected condition",
    excludedCropReasons: {
      district_excluded_by_source: "The cited TNAU district list excludes this district.",
      district_not_listed_for_sowing_window: "The cited TNAU season table does not list this district for the selected sowing month.",
      month_not_listed_for_selected_water_regime: "The cited TNAU table does not list this month for the selected water regime.",
      sowing_month_not_listed_by_source: "The cited TNAU table does not list this sowing month.",
    },
    cropEvidence: {
      rice_excess_water_management: "TNAU guidance warns that excess ponding can harm rice at specific growth stages and recommends drainage.",
      rice_sowing_calendar_window: "The selected month appears in TNAU's rice season calendar; confirm the local variety and irrigation recommendation.",
      rice_duration_varies_by_season: "Rice duration varies by season; without a selected season window, rice is not assessed for a short-duration goal.",
      blackgram_avoid_water_stagnation: "TNAU advises avoiding water stagnation in blackgram and identifies flowering and pod formation as critical irrigation stages.",
      ragi_variety_duration_differs: "TNAU variety records show different ragi durations; without a selected variety, ragi is not assessed for the short-duration goal.",
      sorghum_sowing_calendar_window: "The selected district and month match a TNAU sorghum season entry.",
      cowpea_sowing_calendar_window: "The selected district and month match a TNAU cowpea season entry; the water requirement is not in the comparison table.",
      cowpea_water_and_duration_not_in_comparison_table: "TNAU provides crop-season and variety information here, but the installed comparison table does not document cowpea water requirement or a single crop duration.",
      redgram_sowing_calendar_window: "The selected district and month match a TNAU redgram season entry.",
      redgram_water_and_duration_not_in_comparison_table: "TNAU provides crop-season and variety information here, but the installed comparison table does not document redgram water requirement or a single crop duration.",
    },
    cropWaterRequirement: "Water requirement in source table",
    relativeWaterClass: "Relative water class in source table",
    waterClassLow: "Low (relative to this table)",
    waterClassMedium: "Medium (relative to this table)",
    waterClassHigh: "High (relative to this table)",
    cropDuration: "Duration in source table",
    notAssessed: "Not assessed",
    scoreBasis: "Primary score and ranking tie-breakers",
    factorRoles: {
      primary: "primary",
      secondary: "secondary",
      tie_breaker: "tie-breaker",
    },
    calendarOptionsNotRanked: "Calendar matches; water/duration evidence is not available for ranking",
    calendarOptionsNotRankedHelp: "A TNAU sowing-calendar entry matches. These crops are not included in the relative ranking because the comparison table does not document their water requirement or a single crop duration.",
    calendarOnlyReason: "The comparison table does not document this crop's water requirement or duration.",
    factorLabels: {
      water_availability: "Relative water-requirement comparison",
      farmer_goal: "Selected water/duration goal",
      verified_sowing_window_match: "TNAU sowing-window match",
      flood_risk_eligibility_gate: "Flood-risk eligibility gate",
    },
    inputUsageHeading: "How each farm input was used",
    inputUsageStatus: {
      scored: "Used in ranking",
      recorded_but_unscored: "Recorded, not scored",
      missing_or_unknown: "Not provided / unknown",
    },
    inputUsageFields: {
      district: "District",
      soil_type: "Soil type",
      rainfall: "Described rainfall",
      irrigation: "Irrigation availability",
      irrigation_method: "Irrigation method",
      season: "Season",
      sowing_month: "Sowing month",
      issue: "Farming challenge",
      goal: "Farming goal",
      free_text: "Farm description",
      N: "N",
      P: "P",
      K: "K",
      temperature: "Temperature",
      humidity: "Humidity",
      soil_ph: "Soil pH",
      measured_rainfall_mm: "Measured rainfall",
      electrical_conductivity_ds_m: "Electrical conductivity · EC",
      organic_carbon_pct: "Organic carbon",
    },
    aboutDaysUnit: "days",
    scoredWater: "Comparison based on irrigation / low-rainfall selection",
    scoredGoal: "Your selected goal",
    unavailableScore: "The available crop data does not assess this selection.",
    sourceAttribution: "Source",
    noSupportedRanking: "The selected answers do not match a supported ranking factor. Try a less-water or short-duration goal, and consult local agricultural advice.",
    lowRainfallIsQualitative: "Low rainfall is treated only as the concern you reported; this is not measured rainfall data.",
    heavyRainfallNotAssessed: "The available data does not establish crop tolerance to heavy rain or flooding, so it withheld a crop ranking.",
    noCropGuideAvailable: "This source table does not provide seed, land preparation, fertilizer-rate, pest-management, or harvest instructions.",
    viewFarmingGuide: "Farming guide",
    bestOptionSummary: "Top option in this comparison",
    rankingByWater: "Relative water-requirement order was used",
    rankingByGoal: "Your selected water/duration goal was used",
    monthLabel: "Sowing month",
    issueDescriptionLabel: "Symptom description",
    rankingStrategy: "Ranking method",
    rankingStrategies: {
      water_availability_primary: "Ordered primarily by relative water requirement in the source table.",
      short_duration_then_water: "Short-duration goal first; relative water requirement breaks ties.",
      farmer_goal_primary: "The source-supported farming goal was the primary ranking factor.",
      lowest_water_then_duration: "Lowest total water requirement in the table first; shorter duration breaks ties.",
      combined_water_and_goal: "Water availability and your water/duration goal are both included using the source-table values.",
      middle_water_then_goal_tiebreak: "Crops closest to the table's middle water requirement first; actual water allocation is unknown.",
      lowest_water_first: "Lowest total water requirement in the table first.",
      shortest_duration_first: "Shortest crop duration in the table first.",
      verified_sowing_window_only: "Only a source-backed sowing window for this district and month was used.",
      verified_sowing_window_and_goal: "The source-backed sowing window and supported water/duration goal were used.",
      withheld_heavy_rainfall: "No sourced heavy-rain/flood tolerance; ranking withheld.",
      not_available: "The available source does not support a ranking.",
    },
    topCrops: "Not enough verified data for a reliable crop recommendation",
    provisionalNote: "District, problem and goal selections alone do not establish crop suitability. Unsupported crop names are intentionally withheld.",
    evidenceReason: "This quick guide has no verified district soil, weather or crop-season dataset.",
    selectedContext: "Information you provided",
    noCropRecommendation: "No crop ranking was generated from these selections.",
    missingEvidence: "Verified information still needed",
    requiredEvidence: "The crop model requires soil-test N, P, K and pH plus reliable temperature, humidity and rainfall inputs.",
    modelAction: "Open the full crop analysis",
    modelActionHelp: "The existing trained model predicts only after all seven inputs are supplied. It is not a live-weather service.",
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
    advisoryNote: "Confirm planting decisions with a local agricultural extension officer.",
    pestAdvice: "If you see pest or disease symptoms, consult a local agricultural officer.",
    reason: {
      middle_relative_water_need: "This crop has a relatively medium water requirement in the source table.",
      relative_water_need_matches_selected_availability: "The source water requirement was ranked against your selected irrigation availability.",
      lower_water_use_supports_goal: "Its relatively lower water requirement aligns with your goal.",
      shorter_duration_supports_goal: "Its shorter duration in the source data aligns with your goal.",
      verified_sowing_window_match: "TNAU sowing-window evidence matches the selected district and month.",
      default: "This crop is listed based on the available source data.",
    },
    limitation: {
      district_crop_suitability_unavailable: "No district-specific crop suitability rules are available.",
      district_soil_climate_data_unavailable: "This quick guide has no verified district soil or crop-season dataset.",
      crop_specific_district_data_partial: "Verified district rules cover only crops with explicit TNAU records; other crops' district suitability remains unknown.",
      crop_specific_season_data_partial: "Verified month windows cover only crops with explicit TNAU records; no general season fit was inferred for other crops.",
      calendar_matched_crops_not_ranked_water_and_duration_unknown: "Some TNAU calendar matches lack comparative water-requirement and single-duration data, so they are disclosed separately rather than assigned a misleading score.",
      irrigation_method_not_scored: "Your irrigation method was recorded but not scored because the available crop data does not support a method comparison.",
      free_text_not_understood_structured_inputs_used: "The free-text description was not understood; supported structured selections alone were used.",
      meaningful_farm_description_required: "A meaningful farm description or supported structured selections are required.",
      reported_problem_not_assessed: "The reported challenge was not assessed by the available crop data.",
      farming_challenge_not_provided: "No farming challenge was selected.",
      selected_soil_type_not_scored: "Your soil selection was recorded; the available table cannot assess crop-soil suitability.",
      selected_season_not_scored: "Your season selection was recorded; no local crop calendar is available to use it in ranking.",
      selected_sowing_month_not_scored: "Your sowing month was recorded; no source-backed month-by-month crop calendar is available.",
      selected_sowing_month_partially_scored: "Sowing month was assessed only for crops with a TNAU calendar; suitability for other crops remains unknown.",
      season_month_consistency_not_local_calendar: "This is only a broad season/month input check, not a local sowing calendar.",
      low_rainfall_is_qualitative_only: "Low rainfall is treated only as the concern you reported; this is not measured rainfall data.",
      rainfall_not_measured: "No local rainfall observation or forecast was used in this analysis.",
      water_supply_volume_not_provided: "Only an irrigation category was provided; the available water volume is unknown.",
      reliable_irrigation_not_quantified: "Reliable irrigation was selected, but no water volume was supplied, so high-water crops were not favored on that basis.",
      heavy_rainfall_not_assessed: "This table has no evidence about crops' tolerance to heavy rain or waterlogging.",
      no_crop_ranking_for_unassessed_flood_risk: "Ranking was withheld to avoid an unsupported crop suggestion for an unassessed flood risk.",
      no_crop_ranking_for_unassessed_goal: "Ranking was withheld because the available crop evidence does not assess your selected goal.",
      crop_specific_farming_guide_unavailable: "Crop-specific cultivation guidance is not included in this source.",
      irrigation_not_used_low_rainfall_priority: "The low-rainfall challenge took priority, so the irrigation selection was not used in this ranking.",
      no_supported_ranking_factor_selected: "No water-availability or supported crop-goal factor was selected, so no ranking was generated.",
      current_weather_unavailable: "Live weather measurements are not available in this app; historical normals are not current weather.",
      soil_test_values_required: "The crop model needs soil-test values; N, P, K and pH cannot be inferred from district or soil type.",
      seasonal_sowing_guidance_unavailable: "Local guidance for the selected season or sowing month is unavailable.",
      soil_compatibility_not_assessed: "Source-backed compatibility for the selected soil type was not assessed.",
      cost_and_market_data_unavailable: "Reliable input-cost or current local market-price data are unavailable.",
      economic_goal_not_scored: "Your profit or investment goal was recorded but not scored because verified local cost, yield, price, and profit data are unavailable.",
      goal_not_supported_by_available_crop_data: "Available source data does not assess this goal; it was not used in the ranking.",
      soil_test_needed_for_fertility_goal: "Soil-test values are needed to assess the fertility goal; it was not included in crop ranking.",
      model_measurements_not_scored: "Recorded measurements were not used in ranking because the evidence does not support scoring them.",
      issue_not_supported_by_available_crop_data: "Available source data does not assess this challenge; it was not used in the ranking.",
      consult_agricultural_officer_for_pest_or_disease: "This tool does not diagnose pests or diseases. Consult a local agricultural officer.",
      water_availability_not_provided_mid_range_used: "Irrigation availability was not provided.",
      selected_soil_type_not_used_without_source_backed_rules: "The selected soil type was not used because no source-backed rules connect it to these crops.",
      selected_season_not_used_without_local_sowing_calendar: "The selected season was not used because a local sowing calendar is unavailable.",
      issue_description_is_context_only_not_diagnosed: "Your description was recorded as context; no pest or disease diagnosis was made.",
      default: "No local source is available for this information.",
    },
  },
};

export const FARMER_MODEL_INPUTS = [
  { name: "N", min: 0 },
  { name: "P", min: 0 },
  { name: "K", min: 0 },
  { name: "temperature", min: -90, max: 60 },
  { name: "humidity", min: 0, max: 100 },
  { name: "ph", min: 0, max: 14 },
  { name: "rainfall", min: 0 },
];

export const FARMER_SOIL_TEST_INPUTS = [
  { name: "electrical_conductivity_ds_m", min: 0, max: 1000 },
  { name: "organic_carbon_pct", min: 0, max: 100 },
];

export function validateFarmerModelMeasurements(values = {}) {
  const missing = FARMER_MODEL_INPUTS
    .filter(({ name }) => values[name] == null || String(values[name]).trim() === "")
    .map(({ name }) => name);
  const numericValues = Object.fromEntries(
    FARMER_MODEL_INPUTS
      .filter(({ name }) => !missing.includes(name))
      .map(({ name }) => [name, Number(values[name])]),
  );
  const invalid = FARMER_MODEL_INPUTS
    .filter(({ name, min, max }) => {
      if (missing.includes(name)) return false;
      const value = numericValues[name];
      return !Number.isFinite(value)
        || value < min
        || (max !== undefined && value > max);
    })
    .map(({ name }) => name);

  return { missing, invalid, values: numericValues };
}

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

function submittedMeasurementsMatch(response, submittedValues) {
  if (!isRecord(submittedValues) || !Object.hasOwn(submittedValues, "model_measurements")) {
    return true;
  }
  const expected = submittedValues.model_measurements;
  const actual = response?.selected_context?.model_measurements;
  if (!isRecord(expected) || !isRecord(actual)) return false;
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  return expectedKeys.length === actualKeys.length
    && expectedKeys.every((key, index) => (
      key === actualKeys[index] && expected[key] === actual[key]
    ))
    && response.analysis?.measurement_values_recorded === true
    && response.analysis?.measurement_values_used_for_ranking === false
    && response.limitations?.includes("model_measurements_not_scored");
}

function isValidSowingWindow(window) {
  return isRecord(window)
    && Array.isArray(window.months)
    && window.months.every((month) => Number.isInteger(month) && month >= 1 && month <= 12)
    && (window.season_name === undefined || isNonEmptyString(window.season_name))
    && (window.duration_text === undefined || isNonEmptyString(window.duration_text))
    && (
      window.water_regime === undefined
      || ["rainfed", "irrigated"].includes(window.water_regime)
    )
    && (
      window.varieties === undefined
      || (Array.isArray(window.varieties) && window.varieties.every(isNonEmptyString))
    );
}

function isValidInputUsage(inputUsage) {
  return isRecord(inputUsage)
    && Object.values(inputUsage).every((usage) => (
      isRecord(usage)
      && [
        "scored",
        "recorded_but_unscored",
        "missing_or_unknown",
      ].includes(usage.status)
      && Array.isArray(usage.scoring_factors)
      && usage.scoring_factors.every(isNonEmptyString)
    ));
}

function adaptLegacyRecommendationResponse(response, submittedValues) {
  if (
    !isRecord(response)
    || response.status !== "provisional"
    || response.method !== "tnau_source_based_relative_water_and_duration_ranking"
    || !isNonEmptyString(response.district)
    || !isNonEmptyString(response.issue)
    || !isNonEmptyString(response.goal)
    || !isRecord(response.selected_context)
    || !isRecord(response.district_data)
    || response.district_data.status !== "unavailable"
    || !Array.isArray(response.recommendations)
    || response.recommendations.length === 0
    || !response.recommendations.every(
      (recommendation) => isRecord(recommendation) && isNonEmptyString(recommendation.crop),
    )
    || response.advisory_only !== true
    || !isRecord(submittedValues)
    || response.district !== submittedValues.district
    || response.issue !== submittedValues.issue
    || response.goal !== submittedValues.goal
  ) {
    return response;
  }

  const selectedContext = {
    irrigation: submittedValues.irrigation ?? null,
    season: submittedValues.season ?? null,
    sowing_month: submittedValues.sowing_month ?? null,
    soil_type: submittedValues.soil_type ?? null,
    issue_description: submittedValues.issue_description ?? null,
  };
  if (
    Object.entries(selectedContext).some(
      ([key, value]) => response.selected_context[key] !== value,
    )
  ) {
    return response;
  }

  const limitations = [
    "district_soil_climate_data_unavailable",
    "seasonal_sowing_guidance_unavailable",
    "current_weather_unavailable",
    "soil_test_values_required",
    "cost_and_market_data_unavailable",
  ];
  if (submittedValues.issue === "pest_disease") {
    limitations.push("consult_agricultural_officer_for_pest_or_disease");
  }
  if (submittedValues.issue_description) {
    limitations.push("issue_description_is_context_only_not_diagnosed");
  }

  return {
    status: "insufficient_data",
    method: "no_crop_ranking_without_field_measurements",
    district: submittedValues.district,
    issue: submittedValues.issue,
    goal: submittedValues.goal,
    selected_context: selectedContext,
    district_data: {
      status: "unavailable",
      reason: "Verified field soil, crop-calendar, and current weather data are unavailable.",
    },
    recommendations: [],
    analysis: {
      crop_suitability_assessed: false,
      selected_context_recorded: true,
      required_model_inputs: [
        "N",
        "P",
        "K",
        "temperature",
        "humidity",
        "ph",
        "rainfall",
      ],
      weather_is_live: false,
    },
    limitations,
    advisory_only: true,
  };
}

export function validateFarmerSoilTestMeasurements(values = {}) {
  const present = FARMER_SOIL_TEST_INPUTS.filter(
    ({ name }) => values[name] != null && String(values[name]).trim() !== "",
  );
  const numericValues = Object.fromEntries(
    present.map(({ name }) => [name, Number(values[name])]),
  );
  const invalid = present
    .filter(({ name, min, max }) => (
      !Number.isFinite(numericValues[name])
      || numericValues[name] < min
      || numericValues[name] > max
    ))
    .map(({ name }) => name);
  return {
    values: Object.fromEntries(
      Object.entries(numericValues).filter(([name]) => !invalid.includes(name)),
    ),
    invalid,
  };
}

export function validateFarmerCropRecommendationsResponse(
  response,
  language = "en",
  submittedValues = null,
) {
  const compatibleResponse = adaptLegacyRecommendationResponse(response, submittedValues);
  if (!submittedMeasurementsMatch(compatibleResponse, submittedValues)) {
    throw new Error(translateFarmer(language, "responseError"));
  }
  if (
    isRecord(compatibleResponse)
    && ["relative_advisory", "insufficient_data", "clarification_required", "unsupported_request"].includes(compatibleResponse.status)
    && isRecord(compatibleResponse.parsed_conditions)
  ) {
    const recommendations = compatibleResponse.recommendations;
    const analysis = compatibleResponse.analysis;
    const validRecommendations = Array.isArray(recommendations)
      && recommendations.length <= 3
      && recommendations.every((recommendation, index) => (
        isRecord(recommendation)
        && recommendation.rank === index + 1
        && isNonEmptyString(recommendation.crop)
        && isNonEmptyString(recommendation.name_en)
        && isNonEmptyString(recommendation.name_ta)
        && recommendation.classification === "conditionally_suitable"
        && Number.isFinite(recommendation.relative_match_score)
        && recommendation.relative_match_score >= 0
        && recommendation.relative_match_score <= 100
        && (
          recommendation.water_requirement_mm === null
          || (
            Number.isFinite(recommendation.water_requirement_mm)
            && recommendation.water_requirement_mm > 0
          )
        )
        && (
          recommendation.duration_days === null
          || (
            Number.isFinite(recommendation.duration_days)
            && recommendation.duration_days > 0
          )
        )
        && [
          "low",
          "medium",
          "high",
          "not_assessed",
        ].includes(recommendation.water_requirement_class)
        && Array.isArray(recommendation.reasons)
        && recommendation.reasons.length > 0
        && recommendation.reasons.every((reason) => (
          reason === "water_availability"
          || reason === "farmer_goal"
          || (
            reason === "verified_sowing_window_match"
            && analysis?.ranked_factors?.includes(reason)
          )
        ))
        && Array.isArray(recommendation.reason_text)
        && recommendation.reason_text.length === recommendation.reasons.length
        && recommendation.reason_text.every(isNonEmptyString)
        && recommendation.seasonal_suitability === "not_assessed"
        && Array.isArray(recommendation.risks)
        && recommendation.risks.every(isNonEmptyString)
        && Array.isArray(recommendation.evidence_notes)
        && recommendation.evidence_notes.every(isNonEmptyString)
        && Array.isArray(recommendation.crop_sources)
        && recommendation.crop_sources.every((source) => (
          isRecord(source)
          && isNonEmptyString(source.title)
          && isNonEmptyString(source.publisher)
          && isNonEmptyString(source.url)
          && source.url.startsWith("https://")
        ))
        && Array.isArray(recommendation.sowing_window_evidence)
        && recommendation.sowing_window_evidence.every(isValidSowingWindow)
        && (
          recommendation.score_breakdown === undefined
          || (
            Array.isArray(recommendation.score_breakdown)
            && recommendation.score_breakdown.length === recommendation.reasons.length
            && recommendation.score_breakdown.every((item) => (
              isRecord(item)
              && [
                "water_availability",
                "farmer_goal",
                "verified_sowing_window_match",
              ].includes(item.factor)
              && Number.isFinite(item.score)
              && item.score >= 0
              && item.score <= 1
              && ["primary", "secondary", "tie_breaker"].includes(item.role)
            ))
          )
        )
      ));
    const selectedFields = ["district", "issue", "goal", "irrigation", "irrigation_method", "season", "sowing_month", "soil_type"];
    if (
      !isNonEmptyString(compatibleResponse.method)
      || !["low", "not_assessed"].includes(compatibleResponse.confidence)
      || !isNonEmptyString(compatibleResponse.message)
      || !isRecord(compatibleResponse.selected_context)
      || !validRecommendations
      || !isValidInputUsage(analysis?.input_usage)
      || (
        analysis?.calendar_options_not_ranked !== undefined
        && (
          !Array.isArray(analysis.calendar_options_not_ranked)
          || !analysis.calendar_options_not_ranked.every((option) => (
            isRecord(option)
            && isNonEmptyString(option.crop)
            && option.reason === "water_requirement_and_duration_not_in_comparison_table"
            && Array.isArray(option.sowing_window_evidence)
            && option.sowing_window_evidence.every(isValidSowingWindow)
          ))
        )
      )
      || (compatibleResponse.status === "relative_advisory" && recommendations.length === 0)
      || (compatibleResponse.status !== "relative_advisory" && recommendations.length !== 0)
      || !Array.isArray(compatibleResponse.questions)
      || !compatibleResponse.questions.every(isNonEmptyString)
      || !Array.isArray(compatibleResponse.assumptions)
      || !compatibleResponse.assumptions.every(isNonEmptyString)
      || !Array.isArray(compatibleResponse.limitations)
      || !compatibleResponse.limitations.every(isNonEmptyString)
      || !isRecord(compatibleResponse.source)
      || !isNonEmptyString(compatibleResponse.source.title)
      || !isNonEmptyString(compatibleResponse.source.publisher)
      || !isNonEmptyString(compatibleResponse.source.url)
      || !compatibleResponse.source.url.startsWith("https://")
      || compatibleResponse.advisory_only !== true
      || (submittedValues && selectedFields.some((field) => (
        Object.hasOwn(submittedValues, field)
        && submittedValues[field]
        && compatibleResponse.parsed_conditions[field] !== undefined
        && compatibleResponse.parsed_conditions[field] !== (
          field === "sowing_month"
            ? Number(submittedValues[field])
            : submittedValues[field]
        )
      )))
    ) {
      throw new Error(translateFarmer(language, "responseError"));
    }
    return compatibleResponse;
  }
  if (
    isRecord(compatibleResponse)
    && compatibleResponse.status === "relative_advisory"
    && compatibleResponse.method === "tnau_relative_water_duration_rule_ranking"
  ) {
    const recommendations = compatibleResponse.recommendations;
    const source = compatibleResponse.source;
    const analysis = compatibleResponse.analysis;
    const validRecommendations = Array.isArray(recommendations)
      && recommendations.length > 0
      && recommendations.length <= 3
      && recommendations.every((recommendation, index) => (
        isRecord(recommendation)
        && recommendation.rank === index + 1
        && isNonEmptyString(recommendation.crop)
        && recommendation.classification === "conditionally_suitable"
        && Number.isFinite(recommendation.relative_match_score)
        && recommendation.relative_match_score >= 0
        && recommendation.relative_match_score <= 100
        && (
          recommendation.water_requirement_mm === null
          || (
            Number.isFinite(recommendation.water_requirement_mm)
            && recommendation.water_requirement_mm > 0
          )
        )
        && [
          "low",
          "medium",
          "high",
          "not_assessed",
        ].includes(recommendation.water_requirement_class)
        && (
          recommendation.duration_days === null
          || (
            Number.isFinite(recommendation.duration_days)
            && recommendation.duration_days > 0
          )
        )
        && Array.isArray(recommendation.reasons)
        && recommendation.reasons.length > 0
        && Array.isArray(recommendation.evidence_notes)
        && recommendation.evidence_notes.every(isNonEmptyString)
        && Array.isArray(recommendation.crop_sources)
        && recommendation.crop_sources.every((cropSource) => (
          isRecord(cropSource)
          && isNonEmptyString(cropSource.title)
          && isNonEmptyString(cropSource.publisher)
          && isNonEmptyString(cropSource.url)
          && cropSource.url.startsWith("https://")
        ))
        && Array.isArray(recommendation.sowing_window_evidence)
        && recommendation.sowing_window_evidence.every(isValidSowingWindow)
        && recommendation.reasons.every((reason) => (
          [
            "water_availability",
            "farmer_goal",
            "verified_sowing_window_match",
          ].includes(reason)
          && analysis?.ranked_factors?.includes(reason)
        ))
      ));
    if (
      !isNonEmptyString(compatibleResponse.district)
      || !isNonEmptyString(compatibleResponse.issue)
      || !isNonEmptyString(compatibleResponse.goal)
      || !validRecommendations
      || !isRecord(source)
      || !isNonEmptyString(source.title)
      || !isNonEmptyString(source.publisher)
      || !isNonEmptyString(source.url)
      || !source.url.startsWith("https://")
      || !isRecord(analysis)
      || typeof analysis.district_used_for_ranking !== "boolean"
      || analysis.soil_used_for_ranking !== false
      || typeof analysis.season_used_for_ranking !== "boolean"
      || analysis.weather_measurement_used !== false
      || analysis.crop_suitability_assessed !== false
      || analysis.rainfall_measured !== false
      || analysis.crop_guide_available !== false
      || ![null, "irrigation", "reported_low_rainfall"].includes(
        analysis.water_preference_basis,
      )
      || !Array.isArray(analysis.ranked_factors)
      || analysis.ranked_factors.length === 0
      || ![
        "water_availability_primary",
        "short_duration_then_water",
        "farmer_goal_primary",
        "lowest_water_then_duration",
        "combined_water_and_goal",
        "middle_water_then_goal_tiebreak",
        "lowest_water_first",
        "shortest_duration_first",
        "verified_sowing_window_only",
        "verified_sowing_window_and_goal",
      ].includes(analysis.ranking_strategy)
      || !analysis.ranked_factors.every((factor) => (
        factor === "water_availability"
        || factor === "farmer_goal"
        || factor === "verified_sowing_window_match"
      ))
      || !Array.isArray(compatibleResponse.limitations)
      || !compatibleResponse.limitations.every(isNonEmptyString)
      || compatibleResponse.advisory_only !== true
      || (submittedValues && (
        compatibleResponse.district !== submittedValues.district
        || compatibleResponse.issue !== submittedValues.issue
        || compatibleResponse.goal !== submittedValues.goal
      ))
    ) {
      throw new Error(translateFarmer(language, "responseError"));
    }
    return compatibleResponse;
  }

  if (
    isRecord(compatibleResponse)
    && compatibleResponse.status === "insufficient_data"
    && compatibleResponse.method === "no_crop_ranking_without_supported_answers"
  ) {
    if (
      !isNonEmptyString(compatibleResponse.district)
      || !isNonEmptyString(compatibleResponse.issue)
      || !isNonEmptyString(compatibleResponse.goal)
      || !isRecord(compatibleResponse.selected_context)
      || !Array.isArray(compatibleResponse.recommendations)
      || compatibleResponse.recommendations.length !== 0
      || !isRecord(compatibleResponse.analysis)
      || !Array.isArray(compatibleResponse.analysis.ranked_factors)
      || compatibleResponse.analysis.ranked_factors.length !== 0
      || ![
        "withheld_heavy_rainfall",
        "not_available",
      ].includes(compatibleResponse.analysis.ranking_strategy)
      || !compatibleResponse.analysis.ranked_factors.every((factor) => (
        factor === "water_availability" || factor === "farmer_goal"
      ))
      || typeof compatibleResponse.analysis.district_used_for_ranking !== "boolean"
      || compatibleResponse.analysis.soil_used_for_ranking !== false
      || typeof compatibleResponse.analysis.season_used_for_ranking !== "boolean"
      || compatibleResponse.analysis.weather_measurement_used !== false
      || compatibleResponse.analysis.crop_suitability_assessed !== false
      || compatibleResponse.analysis.rainfall_measured !== false
      || compatibleResponse.analysis.crop_guide_available !== false
      || ![null, "irrigation", "reported_low_rainfall"].includes(
        compatibleResponse.analysis.water_preference_basis,
      )
      || !Array.isArray(compatibleResponse.limitations)
      || !compatibleResponse.limitations.every(isNonEmptyString)
      || compatibleResponse.advisory_only !== true
      || (submittedValues && (
        compatibleResponse.district !== submittedValues.district
        || compatibleResponse.issue !== submittedValues.issue
        || compatibleResponse.goal !== submittedValues.goal
      ))
    ) {
      throw new Error(translateFarmer(language, "responseError"));
    }
    return compatibleResponse;
  }

  const expectedModelInputs = [
    "N",
    "P",
    "K",
    "temperature",
    "humidity",
    "ph",
    "rainfall",
  ];
  if (
    !isRecord(compatibleResponse)
    || compatibleResponse.status !== "insufficient_data"
    || ![
      "no_crop_ranking_without_field_measurements",
      "no_crop_ranking_without_supported_answers",
    ].includes(compatibleResponse.method)
    || !isNonEmptyString(compatibleResponse.district)
    || !isNonEmptyString(compatibleResponse.issue)
    || !isNonEmptyString(compatibleResponse.goal)
    || !isRecord(compatibleResponse.selected_context)
    || !isRecord(compatibleResponse.district_data)
    || compatibleResponse.district_data.status !== "unavailable"
    || !isNonEmptyString(compatibleResponse.district_data.reason)
    || !Array.isArray(compatibleResponse.recommendations)
    || compatibleResponse.recommendations.length !== 0
    || !isRecord(compatibleResponse.analysis)
    || compatibleResponse.analysis.crop_suitability_assessed !== false
    || compatibleResponse.analysis.selected_context_recorded !== true
    || compatibleResponse.analysis.weather_is_live !== false
    || !Array.isArray(compatibleResponse.analysis.required_model_inputs)
    || compatibleResponse.analysis.required_model_inputs.length !== expectedModelInputs.length
    || compatibleResponse.analysis.required_model_inputs.some(
      (field, index) => field !== expectedModelInputs[index],
    )
    || !Array.isArray(compatibleResponse.limitations)
    || !compatibleResponse.limitations.every(isNonEmptyString)
    || typeof compatibleResponse.advisory_only !== "boolean"
    || compatibleResponse.advisory_only !== true
  ) {
    throw new Error(translateFarmer(language, "responseError"));
  }
  if (
    submittedValues
    && (
      compatibleResponse.district !== submittedValues.district
      || compatibleResponse.issue !== submittedValues.issue
      || compatibleResponse.goal !== submittedValues.goal
    )
  ) {
    throw new Error(translateFarmer(language, "responseError"));
  }
  return compatibleResponse;
}
