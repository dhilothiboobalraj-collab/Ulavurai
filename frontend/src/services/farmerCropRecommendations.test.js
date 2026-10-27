import assert from "node:assert/strict";
import test from "node:test";
import {
  FARMER_GOALS,
  FARMING_ISSUES,
  FARMER_TRANSLATIONS,
  TAMIL_NADU_DISTRICTS,
  getDistrictDisplayName,
  getFarmerCropLimitation,
  getFarmerCropReason,
  searchTamilNaduDistricts,
  translateFarmer,
  validateFarmerCropRecommendationsResponse,
} from "./farmerCropRecommendations.js";

function response() {
  const source = {
    title: "Water Requirements of Agricultural Crops in Surface Irrigation Methods",
    publisher: "Tamil Nadu Agricultural University, Agritech Portal",
    url: "https://agritech.tnau.ac.in/agriculture/agri_irrigationmgt_waterrequirements.html",
  };
  return {
    status: "provisional",
    method: "tnau_source_based_relative_water_and_duration_ranking",
    district: "salem",
    issue: "low_rainfall",
    goal: "low_water",
    selected_context: {},
    district_data: {
      status: "unavailable",
      reason: "No district-level soil, climate, or crop-calendar dataset is installed.",
    },
    ranking_context: {},
    recommendations: [
      {
        rank: 1,
        crop: "sesame",
        crop_ta: "எள்",
        water_requirement_mm: 150,
        water_requirement_class: "low",
        duration_days: 85,
        reasons: ["lower_water_use_supports_goal"],
        season_guidance: null,
        soil_climate_suitability: "not_assessed",
        input_cost_category: null,
        market_information: null,
        source,
      },
      {
        rank: 2,
        crop: "blackgram",
        crop_ta: "உளுந்து",
        water_requirement_mm: 280,
        water_requirement_class: "low",
        duration_days: 65,
        reasons: ["lower_water_use_supports_goal"],
        season_guidance: null,
        soil_climate_suitability: "not_assessed",
        input_cost_category: null,
        market_information: null,
        source,
      },
      {
        rank: 3,
        crop: "soybean",
        crop_ta: "சோயாபீன்",
        water_requirement_mm: 320,
        water_requirement_class: "medium",
        duration_days: 85,
        reasons: ["lower_water_use_supports_goal"],
        season_guidance: null,
        soil_climate_suitability: "not_assessed",
        input_cost_category: null,
        market_information: null,
        source,
      },
    ],
    source,
    source_last_updated: null,
    limitations: ["district_soil_climate_data_unavailable"],
    advisory_only: true,
  };
}

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
    "Select your district, farming challenge and goal. We'll help you explore suitable crop options using available agricultural information.",
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

test("valid provisional result renders the selected language's reasons and limitations", () => {
  const result = validateFarmerCropRecommendationsResponse(response());
  assert.equal(result.recommendations[0].crop_ta, "எள்");
  assert.match(getFarmerCropReason("ta", result.recommendations[0].reasons[0]), /நீர்/);
  assert.match(getFarmerCropReason("en", result.recommendations[0].reasons[0]), /water requirement/);
  assert.match(
    getFarmerCropLimitation("ta", result.limitations[0]),
    /மாவட்டத்திற்கான உள்ளூர் மண் மற்றும் காலநிலைத் தரவு நிறுவப்படவில்லை/,
  );
  assert.match(
    getFarmerCropLimitation("en", result.limitations[0]),
    /Local soil and climate data for this district are not installed/,
  );
});

test("malformed ranking result or invented cost metadata is rejected", () => {
  const malformedCount = response();
  malformedCount.recommendations.pop();
  assert.throws(
    () => validateFarmerCropRecommendationsResponse(malformedCount, "ta"),
    /சரியான வடிவில் இல்லை/,
  );

  const inventedCost = response();
  inventedCost.recommendations[0].input_cost_category = "low";
  assert.throws(
    () => validateFarmerCropRecommendationsResponse(inventedCost, "en"),
    /invalid/,
  );
});
