import assert from "node:assert/strict";
import test from "node:test";
import {
  FARMER_MODEL_INPUTS,
  FARMER_SOIL_TEST_INPUTS,
  FARMER_GOALS,
  FARMING_ISSUES,
  FARMER_TRANSLATIONS,
  TAMIL_NADU_DISTRICTS,
  getDistrictDisplayName,
  getFarmerCropLimitation,
  searchTamilNaduDistricts,
  translateFarmer,
  validateFarmerModelMeasurements,
  validateFarmerSoilTestMeasurements,
  validateFarmerCropRecommendationsResponse,
} from "./farmerCropRecommendations.js";

function response() {
  return {
    status: "insufficient_data",
    method: "no_crop_ranking_without_field_measurements",
    district: "salem",
    issue: "low_rainfall",
    goal: "low_water",
    selected_context: {
      irrigation: "limited",
      season: "rabi",
      sowing_month: 11,
      soil_type: "black",
      issue_description: null,
    },
    district_data: {
      status: "unavailable",
      reason: "No verified local information is available.",
    },
    recommendations: [],
    analysis: {
      crop_suitability_assessed: false,
      selected_context_recorded: true,
      required_model_inputs: [
        "N", "P", "K", "temperature", "humidity", "ph", "rainfall",
      ],
      weather_is_live: false,
    },
    limitations: [
      "district_soil_climate_data_unavailable",
      "current_weather_unavailable",
      "soil_test_values_required",
    ],
    advisory_only: true,
  };
}

function relativeAdvisoryResponse() {
  return {
    status: "relative_advisory",
    method: "tnau_relative_water_duration_rule_ranking",
    district: "salem",
    issue: "low_rainfall",
    goal: "low_water",
    selected_context: {
      irrigation: "limited",
      season: "rabi",
      sowing_month: 11,
      soil_type: "black",
      issue_description: null,
    },
    recommendations: [
      {
        rank: 1,
        crop: "sesame",
        classification: "conditionally_suitable",
        relative_match_score: 100,
        water_requirement_mm: 150,
        water_requirement_class: "low",
        duration_days: 85,
        reasons: ["water_availability", "farmer_goal"],
        evidence_notes: [],
        crop_sources: [],
        sowing_window_evidence: [],
      },
    ],
    source: {
      title: "Water Requirements of Agricultural Crops in Surface Irrigation Methods",
      publisher: "Tamil Nadu Agricultural University, Agritech Portal",
      url: "https://agritech.tnau.ac.in/agriculture/agri_irrigationmgt_waterrequirements.html",
    },
    analysis: {
      selected_context_recorded: true,
      district_used_for_ranking: false,
      soil_used_for_ranking: false,
      season_used_for_ranking: false,
      weather_measurement_used: false,
      water_preference_basis: "reported_low_rainfall",
      crop_suitability_assessed: false,
      rainfall_measured: false,
      crop_guide_available: false,
      ranking_strategy: "lowest_water_then_duration",
      ranked_factors: ["water_availability", "farmer_goal"],
      input_usage: {
        district: { status: "recorded_but_unscored", scoring_factors: [] },
        soil_type: { status: "recorded_but_unscored", scoring_factors: [] },
        irrigation: { status: "scored", scoring_factors: ["water_availability"] },
        sowing_month: { status: "recorded_but_unscored", scoring_factors: [] },
        goal: { status: "scored", scoring_factors: ["farmer_goal"] },
      },
    },
    limitations: ["district_soil_climate_data_unavailable"],
    advisory_only: true,
  };
}

function parsedRecommendationResponse() {
  return {
    status: "relative_advisory",
    method: "deterministic_tnau_relative_water_duration_rules",
    confidence: "low",
    district: "kallakurichi",
    issue: "no_problem",
    goal: "higher_profit",
    selected_context: {
      irrigation: "limited",
      season: null,
      sowing_month: 11,
      soil_type: "clay",
      free_text: null,
    },
    parsed_conditions: {
      district: "kallakurichi",
      soil_type: "clay",
      rainfall: "not_provided",
      irrigation: "limited",
      sowing_month: 11,
      season: "not_provided",
      issue: "no_problem",
      goal: "higher_profit",
    },
    recommendations: [{
      rank: 1,
      crop: "sesame",
      name_en: "Sesame",
      name_ta: "எள்",
      classification: "conditionally_suitable",
      relative_match_score: 100,
      water_requirement_mm: 150,
      water_requirement_class: "low",
      duration_days: 85,
      reasons: ["water_availability"],
      reason_text: ["Lower relative water requirement"],
      seasonal_suitability: "not_assessed",
      risks: ["Local soil suitability is not assessed."],
      evidence_notes: [],
      crop_sources: [],
      sowing_window_evidence: [],
    }],
    questions: [],
    conflicts: [],
    assumptions: ["Relative source-data comparison only."],
    limitations: ["Economic objective not scored."],
    source: {
      title: "Water Requirements of Agricultural Crops in Surface Irrigation Methods",
      publisher: "Tamil Nadu Agricultural University, Agritech Portal",
      url: "https://agritech.tnau.ac.in/agriculture/agri_irrigationmgt_waterrequirements.html",
    },
    analysis: {
      selected_context_recorded: true,
      district_used_for_ranking: false,
      soil_used_for_ranking: false,
      season_used_for_ranking: false,
      weather_measurement_used: false,
      water_preference_basis: "irrigation",
      crop_suitability_assessed: false,
      rainfall_measured: false,
      crop_guide_available: false,
      ranking_strategy: "short_duration_then_water",
      ranked_factors: ["water_availability"],
      input_usage: {
        district: { status: "recorded_but_unscored", scoring_factors: [] },
        soil_type: { status: "recorded_but_unscored", scoring_factors: [] },
        irrigation: { status: "scored", scoring_factors: ["water_availability"] },
        sowing_month: { status: "recorded_but_unscored", scoring_factors: [] },
        goal: { status: "recorded_but_unscored", scoring_factors: [] },
      },
    },
    advisory_only: true,
    message: "Relative crop options only.",
    farming_guide: [],
  };
}

function legacyResponse() {
  return {
    status: "provisional",
    method: "tnau_source_based_relative_water_and_duration_ranking",
    district: "salem",
    issue: "low_rainfall",
    goal: "higher_profit",
    selected_context: {
      irrigation: "rainfed",
      season: "rabi",
      sowing_month: 1,
      soil_type: "clay",
      issue_description: null,
    },
    district_data: {
      status: "unavailable",
      reason: "No district-level crop data is installed.",
    },
    recommendations: [
      { rank: 1, crop: "sesame" },
      { rank: 2, crop: "blackgram" },
      { rank: 3, crop: "groundnut" },
    ],
    limitations: ["district_crop_suitability_unavailable"],
    advisory_only: true,
  };
}

test("Easy Guide model measurements preserve the trained feature order and parse valid numeric values", () => {
  const rawValues = {
    N: "90",
    P: "42",
    K: "43",
    temperature: "20.8",
    humidity: "82",
    ph: "6.5",
    rainfall: "202.9",
  };
  const result = validateFarmerModelMeasurements(rawValues);

  assert.deepEqual(FARMER_MODEL_INPUTS.map(({ name }) => name), [
    "N", "P", "K", "temperature", "humidity", "ph", "rainfall",
  ]);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
  assert.deepEqual(result.values, {
    N: 90,
    P: 42,
    K: 43,
    temperature: 20.8,
    humidity: 82,
    ph: 6.5,
    rainfall: 202.9,
  });
});

test("Easy Guide model measurements reject incomplete and out-of-range values", () => {
  const missing = validateFarmerModelMeasurements({ N: "10" });
  assert.deepEqual(missing.missing, ["P", "K", "temperature", "humidity", "ph", "rainfall"]);
  assert.deepEqual(missing.invalid, []);

  const invalid = validateFarmerModelMeasurements({
    N: "-1",
    P: "10",
    K: "10",
    temperature: "61",
    humidity: "101",
    ph: "14.1",
    rainfall: "0",
  });
  assert.deepEqual(invalid.missing, []);
  assert.deepEqual(invalid.invalid, ["N", "temperature", "humidity", "ph"]);
});

test("Easy Guide soil-test readings are normalized and range-checked without being required", () => {
  const empty = validateFarmerSoilTestMeasurements();
  assert.deepEqual(empty, { values: {}, invalid: [] });
  assert.equal(FARMER_SOIL_TEST_INPUTS.length, 2);

  const valid = validateFarmerSoilTestMeasurements({
    electrical_conductivity_ds_m: "0.8",
    organic_carbon_pct: "0.45",
  });
  assert.deepEqual(valid, {
    values: {
      electrical_conductivity_ds_m: 0.8,
      organic_carbon_pct: 0.45,
    },
    invalid: [],
  });
  assert.deepEqual(
    validateFarmerSoilTestMeasurements({
      electrical_conductivity_ds_m: "1001",
      organic_carbon_pct: "-1",
    }).invalid,
    ["electrical_conductivity_ds_m", "organic_carbon_pct"],
  );
});

test("Tamil farmer selections and district search options are available", () => {
  assert.equal(TAMIL_NADU_DISTRICTS.length, 38);
  assert.equal(searchTamilNaduDistricts().length, 38);
  assert.deepEqual(searchTamilNaduDistricts("மயிலாடுதுறை").map(([code]) => code), [
    "mayiladuthurai",
  ]);
  assert.deepEqual(searchTamilNaduDistricts("Tiruppur").map(([code]) => code), [
    "tiruppur",
  ]);
  assert.ok(TAMIL_NADU_DISTRICTS.some(([code, tamil, english]) => (
    code === "salem" && tamil === "சேலம்" && english === "Salem"
  )));
  assert.equal(getDistrictDisplayName("salem", "ta"), "சேலம் — Salem");
  assert.equal(getDistrictDisplayName("salem", "en"), "Salem");
  assert.equal(getDistrictDisplayName("unknown", "en"), "");
  assert.deepEqual(
    FARMING_ISSUES.map(([, key]) => translateFarmer("ta", key)),
    ["குறைந்த மழை / தண்ணீர் பற்றாக்குறை", "அதிக மழை / வெள்ள அபாயம்", "மண் வளம் குறைவு", "மண்ணின் pH பிரச்சினை", "பூச்சி அல்லது நோய் பாதிப்பு", "சந்தை விலை / லாபப் பிரச்சினை", "குறிப்பிட்ட பிரச்சினை இல்லை", "மற்றவை"],
  );
  assert.deepEqual(
    FARMER_GOALS.map(([, key]) => translateFarmer("ta", key)),
    ["அதிக மகசூல்", "குறைந்த தண்ணீரில் சாகுபடி", "குறுகிய காலத்தில் அறுவடை", "குறைந்த முதலீடு", "அதிக லாபம்", "மண் வளத்தை மேம்படுத்துதல்"],
  );
  assert.deepEqual(
    FARMING_ISSUES.map(([, key]) => translateFarmer("en", key)),
    ["Low rainfall / water scarcity", "Heavy rainfall / flood risk", "Low soil fertility", "Soil pH issue", "Pest or disease problem", "Market price / profitability problem", "No specific problem", "Other"],
  );
  assert.deepEqual(
    FARMER_GOALS.map(([, key]) => translateFarmer("en", key)),
    ["Higher yield", "Less-water farming", "Short-duration crop", "Lower investment", "Higher profitability", "Improve soil fertility"],
  );
});

test("the shared translations cover both languages without Tamil copy leaking into English", () => {
  const tamilScript = /[\u0B80-\u0BFF]/;
  const englishStrings = [];
  function collectStrings(value) {
    if (typeof value === "string") englishStrings.push(value);
    else if (Array.isArray(value)) value.forEach(collectStrings);
    else if (value && typeof value === "object") Object.values(value).forEach(collectStrings);
  }
  collectStrings(FARMER_TRANSLATIONS.en);
  assert.ok(englishStrings.length > 0);
  assert.ok(englishStrings.every((value) => !tamilScript.test(value)));
  assert.equal(translateFarmer("en", "heading"), "Choose the right crop for your farm");
  assert.equal(
    translateFarmer("en", "description"),
    "This guide compares crops only using sourced water-requirement and duration data. If evidence for soil fertility, profit, district, soil type or season is missing, it asks for more information instead of showing an unsupported crop list.",
  );
  assert.equal(translateFarmer("ta", "heading"), "உங்கள் விவசாயத்திற்கு ஏற்ற பயிரைத் தேர்வு செய்வோம்");
  assert.equal(translateFarmer("en", "missingKey"), "[Missing translation: missingKey]");
  assert.equal(translateFarmer("en", "loading"), "Preparing recommendations…");
  assert.equal(translateFarmer("en", "apiError"), "Recommendations are unavailable right now. Please try again.");
  assert.equal(translateFarmer("en", "seasonRabi"), "Rabi / northeast monsoon");
  assert.equal(translateFarmer("en", "soilClay"), "Clay soil");
  assert.deepEqual(FARMER_TRANSLATIONS.en.months, [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]);
  assert.ok(FARMER_TRANSLATIONS.ta.months.every((month) => tamilScript.test(month)));
});

test("all districts retain stable codes and localized names", () => {
  assert.equal(TAMIL_NADU_DISTRICTS.length, 38);
  for (const [code, tamil, english] of TAMIL_NADU_DISTRICTS) {
    assert.ok(code);
    assert.ok(tamil);
    assert.ok(english);
    assert.equal(getDistrictDisplayName(code, "ta"), `${tamil} — ${english}`);
    assert.equal(getDistrictDisplayName(code, "en"), english);
  }
  const formValues = {
    district: "salem",
    issue: "low_rainfall",
    goal: "low_water",
    irrigation: "limited",
    season: "rabi",
    sowingMonth: "11",
    soilType: "black",
    issueDescription: "limited water",
  };
  getDistrictDisplayName(formValues.district, "ta");
  getDistrictDisplayName(formValues.district, "en");
  assert.deepEqual(formValues, {
    district: "salem",
    issue: "low_rainfall",
    goal: "low_water",
    irrigation: "limited",
    season: "rabi",
    sowingMonth: "11",
    soilType: "black",
    issueDescription: "limited water",
  });
});

test("valid quick analysis withholds crop names when evidence is insufficient", () => {
  const result = validateFarmerCropRecommendationsResponse(response());
  assert.equal(result.status, "insufficient_data");
  assert.deepEqual(result.recommendations, []);
  assert.equal(result.analysis.weather_is_live, false);
  assert.match(
    getFarmerCropLimitation("ta", result.limitations[0]),
    /இந்த மாவட்டத்திற்கான உள்ளூர் மண் மற்றும் காலநிலைத் தரவு நிறுவப்படவில்லை/,
  );
  assert.match(
    getFarmerCropLimitation("en", result.limitations[0]),
    /no verified district soil or crop-season dataset/,
  );
});

test("validates and returns source-backed simple-question crop suggestions", () => {
  const submittedValues = {
    district: "salem",
    issue: "low_rainfall",
    goal: "low_water",
    irrigation: "limited",
    season: "rabi",
    sowing_month: 11,
    soil_type: "black",
  };
  const result = validateFarmerCropRecommendationsResponse(
    relativeAdvisoryResponse(),
    "en",
    submittedValues,
  );
  assert.equal(result.status, "relative_advisory");
  assert.equal(result.recommendations[0].crop, "sesame");
  assert.equal(result.analysis.district_used_for_ranking, false);
  assert.equal("rule_match_score" in result.recommendations[0], false);

  assert.throws(() => validateFarmerCropRecommendationsResponse({
    ...relativeAdvisoryResponse(),
    recommendations: [],
  }, "en", submittedValues));
  assert.throws(() => validateFarmerCropRecommendationsResponse({
    ...relativeAdvisoryResponse(),
    district: "madurai",
  }, "en", submittedValues));
});

test("validates a ranking that combines water availability and the duration goal", () => {
  const combinedResponse = relativeAdvisoryResponse();
  combinedResponse.goal = "short_duration";
  combinedResponse.analysis.ranking_strategy = "short_duration_then_water";
  const result = validateFarmerCropRecommendationsResponse(
    combinedResponse,
    "en",
    {
      district: "salem",
      issue: "low_rainfall",
      goal: "short_duration",
      irrigation: "limited",
      season: "rabi",
      sowing_month: 11,
      soil_type: "black",
    },
  );

  assert.equal(result.analysis.ranking_strategy, "short_duration_then_water");
});

test("validates a verified district and sowing-month match without crop preference", () => {
  const response = relativeAdvisoryResponse();
  response.analysis.ranked_factors.push("verified_sowing_window_match");
  response.recommendations[0].reasons.push("verified_sowing_window_match");
  const result = validateFarmerCropRecommendationsResponse(
    response,
    "en",
    {
      district: "salem",
      issue: "low_rainfall",
      goal: "low_water",
      irrigation: "limited",
      sowing_month: 9,
    },
  );

  assert.ok(
    result.recommendations[0].reasons.includes("verified_sowing_window_match"),
  );
  assert.equal("preferred_crop" in result.selected_context, false);
});

test("validates up to three ranked crops and calendar-only crops without inventing water or duration", () => {
  const response = parsedRecommendationResponse();
  const cowpea = response.recommendations[0];
  cowpea.crop = "cowpea";
  cowpea.name_en = "Cowpea";
  cowpea.name_ta = "காராமணி";
  cowpea.water_requirement_mm = null;
  cowpea.water_requirement_class = "not_assessed";
  cowpea.duration_days = null;
  cowpea.relative_match_score = 100;
  cowpea.reasons = ["verified_sowing_window_match"];
  cowpea.reason_text = ["The TNAU sowing window matches."];
  cowpea.crop_sources = [{
    title: "Crop Production: Season & Varieties — Cowpea",
    publisher: "Tamil Nadu Agricultural University, Agritech Portal",
    url: "https://agritech.tnau.ac.in/agriculture/agri_seasonandvarieties_cowpea.html",
  }];
  cowpea.sowing_window_evidence = [{
    months: [6, 7, 8],
    season_name: "Adipattam",
    varieties: ["Co(CP) 7"],
  }];
  cowpea.score_breakdown = [{
    factor: "verified_sowing_window_match",
    score: 1,
    role: "primary",
  }];
  response.recommendations = Array.from({ length: 3 }, (_, index) => ({
    ...cowpea,
    rank: index + 1,
    crop: `supported_crop_${index + 1}`,
  }));
  response.analysis.ranked_factors = ["verified_sowing_window_match"];
  response.analysis.calendar_options_not_ranked = [{
    crop: "redgram",
    reason: "water_requirement_and_duration_not_in_comparison_table",
    sowing_window_evidence: [{
      months: [9, 10],
      season_name: "Purattasipattam",
    }],
    crop_sources: [{
      title: "Crop Production: Season & Varieties — Redgram",
      publisher: "Tamil Nadu Agricultural University, Agritech Portal",
      url: "https://agritech.tnau.ac.in/agriculture/agri_seasonandvarieties_redgram.html",
    }],
  }];

  const validated = validateFarmerCropRecommendationsResponse(response);
  assert.equal(validated.recommendations[0].water_requirement_mm, null);
  assert.equal(validated.recommendations[0].duration_days, null);
  assert.equal(validated.analysis.calendar_options_not_ranked[0].crop, "redgram");
  assert.throws(() => validateFarmerCropRecommendationsResponse({
    ...response,
    recommendations: Array.from({ length: 4 }, (_, index) => ({
      ...cowpea,
      rank: index + 1,
      crop: `supported_crop_${index + 1}`,
    })),
  }));
});

test("validates parsed bilingual recommendations and rejects malformed response details", () => {
  const submittedValues = {
    district: "kallakurichi",
    goal: "higher_profit",
    irrigation: "limited",
    sowing_month: 11,
    soil_type: "clay",
    issue: "no_problem",
  };
  const result = validateFarmerCropRecommendationsResponse(
    parsedRecommendationResponse(),
    "ta",
    submittedValues,
  );
  assert.equal(result.recommendations[0].name_ta, "எள்");
  assert.equal(result.parsed_conditions.goal, "higher_profit");

  const invalid = parsedRecommendationResponse();
  invalid.recommendations[0].reason_text = [];
  assert.throws(
    () => validateFarmerCropRecommendationsResponse(invalid, "en", submittedValues),
    /different version/,
  );
});

test("validates that submitted model measurements are returned as unscored context", () => {
  const response = parsedRecommendationResponse();
  response.analysis = relativeAdvisoryResponse().analysis;
  const measurements = { N: 12.5, ph: 6.4 };
  response.selected_context.model_measurements = measurements;
  response.analysis.measurement_values_recorded = true;
  response.analysis.measurement_values_used_for_ranking = false;
  response.limitations.push("model_measurements_not_scored");
  const submittedValues = {
    district: "kallakurichi",
    issue: "no_problem",
    goal: "higher_profit",
    model_measurements: measurements,
  };

  assert.deepEqual(
    validateFarmerCropRecommendationsResponse(
      response,
      "en",
      submittedValues,
    ).selected_context.model_measurements,
    measurements,
  );

  const mismatchedResponse = structuredClone(response);
  mismatchedResponse.selected_context.model_measurements.ph = 7.1;
  assert.throws(
    () => validateFarmerCropRecommendationsResponse(
      mismatchedResponse,
      "en",
      submittedValues,
    ),
    /different version/,
  );
});

test("validates source windows that provide month, water regime, and varieties but no duration", () => {
  const result = parsedRecommendationResponse();
  result.recommendations[0].sowing_window_evidence = [{
    months: [9, 10],
    water_regime: "rainfed",
    varieties: ["Paiyur 1", "CO 13"],
  }];

  assert.doesNotThrow(() => validateFarmerCropRecommendationsResponse(result, "en"));
  result.recommendations[0].sowing_window_evidence[0].months = [13];
  assert.throws(() => validateFarmerCropRecommendationsResponse(result, "en"));
});

test("validates flood-risk clarification with a season/month conflict and no crops", () => {
  const response = parsedRecommendationResponse();
  response.status = "clarification_required";
  response.confidence = "not_assessed";
  response.recommendations = [];
  response.questions = ["Please confirm the sowing month or season."];
  response.conflicts = ["season_month"];
  response.parsed_conditions.season = "rabi";
  response.parsed_conditions.sowing_month = 9;
  response.parsed_conditions.season_month_consistency = "conflict";
  const result = validateFarmerCropRecommendationsResponse(response, "en");
  assert.equal(result.status, "clarification_required");
  assert.deepEqual(result.recommendations, []);
  assert.equal(result.conflicts[0], "season_month");
});

test("validates a flood-risk response that intentionally withholds a crop ranking", () => {
  const responseWithoutRanking = {
    ...relativeAdvisoryResponse(),
    status: "insufficient_data",
    method: "no_crop_ranking_without_supported_answers",
    issue: "heavy_rainfall",
    goal: "higher_yield",
    recommendations: [],
    analysis: {
      ...relativeAdvisoryResponse().analysis,
      ranking_strategy: "withheld_heavy_rainfall",
      ranked_factors: [],
    },
  };
  const result = validateFarmerCropRecommendationsResponse(
    responseWithoutRanking,
    "en",
    {
      district: "salem",
      issue: "heavy_rainfall",
      goal: "higher_yield",
    },
  );
  assert.equal(result.status, "insufficient_data");
  assert.deepEqual(result.recommendations, []);
});

test("legacy provisional rankings are safely converted to no recommendation", () => {
  const submittedValues = {
    district: "salem",
    issue: "low_rainfall",
    goal: "higher_profit",
    irrigation: "rainfed",
    season: "rabi",
    sowing_month: 1,
    soil_type: "clay",
  };
  const result = validateFarmerCropRecommendationsResponse(
    legacyResponse(),
    "en",
    submittedValues,
  );
  assert.equal(result.status, "insufficient_data");
  assert.deepEqual(result.recommendations, []);
  assert.equal(result.selected_context.soil_type, "clay");
  assert.equal(result.analysis.weather_is_live, false);
  assert.ok(result.limitations.includes("soil_test_values_required"));
});

test("legacy response adaptation rejects mismatched form selections", () => {
  assert.throws(
    () => validateFarmerCropRecommendationsResponse(
      legacyResponse(),
      "en",
      {
        district: "salem",
        issue: "low_rainfall",
        goal: "higher_profit",
        irrigation: "limited",
        season: "rabi",
        sowing_month: 1,
        soil_type: "clay",
      },
    ),
    /different version/,
  );
});

test("quick analysis rejects any unsupported crop ranking or claimed live weather", () => {
  const inventedCrop = response();
  inventedCrop.recommendations.push({ crop: "sesame" });
  assert.throws(
    () => validateFarmerCropRecommendationsResponse(inventedCrop, "ta"),
    /Farmer Guide API வேறு பதிப்பிலிருந்து பதில் அளிக்கிறது/,
  );

  const claimedLiveWeather = response();
  claimedLiveWeather.analysis.weather_is_live = true;
  assert.throws(
    () => validateFarmerCropRecommendationsResponse(claimedLiveWeather, "en"),
    /different version/,
  );
});
