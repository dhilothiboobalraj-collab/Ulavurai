import assert from "node:assert/strict";
import test from "node:test";
import {
  hasDisplayableLocalSoilData,
  getLocationLookupStatus,
  getClimateLookupStatus,
  getLocationInputUpdate,
  getSupportedAutofillValues,
  getSupportedClimateAutofillValues,
  clearLocationAutofillOverrides,
  isCurrentLocationRequest,
  validateGeospatialLookupResponse,
  validateLocalClimateResponse,
  validateLocationDataResponse,
} from "./geospatialAutofill.js";

function lookupResponse(overrides = {}) {
  return {
    latitude: 9.93,
    longitude: 78.12,
    dataset_status: "partial",
    properties: {
      ph: {
        value: 7.3,
        units: "pH",
        value_type: "mapped_estimate",
        source: "ISRIC SoilGrids 2.0",
        soil_depth_cm: [0, 5],
        spatial_resolution_m: 250,
      },
    },
    context_properties: {},
    inputs: { ph: 7.3 },
    available_properties: ["ph"],
    unavailable_properties: ["N", "P", "K", "temperature", "humidity", "rainfall"],
    nutrient_availability: {
      N: {
        status: "incompatible",
        available: false,
        value: null,
        units: "cg/kg",
        source: "ISRIC SoilGrids 2.0",
        spatial_resolution_m: 250,
        soil_depth_cm: [0, 5],
        value_type: "mapped_estimate",
        reason: "Total nitrogen is not compatible with the undocumented model feature.",
        missing_requirements: ["Documented N definition and units."],
      },
      P: {
        status: "not_installed",
        available: false,
        value: null,
        units: null,
        source: null,
        spatial_resolution_m: null,
        soil_depth_cm: null,
        value_type: null,
        reason: "No compatible local measurement is installed.",
        missing_requirements: ["Documented P definition and units."],
      },
      K: {
        status: "not_installed",
        available: false,
        value: null,
        units: null,
        source: null,
        spatial_resolution_m: null,
        soil_depth_cm: null,
        value_type: null,
        reason: "No compatible local measurement is installed.",
        missing_requirements: ["Documented K definition and units."],
      },
    },
    provenance: {
      dataset_name: "ISRIC SoilGrids 2.0",
      source: "ISRIC World Soil Information",
      spatial_resolution_m: 250,
    },
    lookup: { method: "raster_cell" },
    warnings: ["Mapped estimate; not a field measurement."],
    ...overrides,
  };
}

function localClimateResponse(overrides = {}) {
  return {
    status: "available",
    latitude: 9.93,
    longitude: 78.12,
    dataset_name: "NASA POWER meteorological monthly normals",
    source: "NASA POWER; GMAO MERRA-2",
    source_url: "https://power.larc.nasa.gov/",
    license: "NASA full-and-open data policy.",
    reference_period: { start_year: 1991, end_year: 2020 },
    retrieved_at: "2026-10-27T00:00:00+00:00",
    installed_at: "2026-10-27T00:00:00+00:00",
    grid_resolution_degrees: { latitude: 0.5, longitude: 0.625 },
    grid_location: {
      latitude: 9.0,
      longitude: 78.125,
      distance_m: 200,
      method: "nearest_grid_cell",
    },
    months: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [
      String(index + 1).padStart(2, "0"),
      {
        temperature_c: 25,
        relative_humidity_pct: 70,
        precipitation_mm_month: 100,
      },
    ])),
    warning: "Historical values are context only.",
    context_only: true,
    ...overrides,
  };
}

test("autofill uses only returned model fields and preserves manual edits", () => {
  const values = getSupportedAutofillValues(
    { ph: 7.3, N: 92, P: Number.NaN, total_nitrogen: 252 },
    ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    new Set(["N"]),
  );

  assert.deepEqual(values, { ph: "7.3" });
});

test("explicit map autofill clears only overrides for compatible soil inputs", () => {
  const manualOverrides = new Set(["ph", "N", "temperature", "humidity"]);
  clearLocationAutofillOverrides(manualOverrides);

  const updated = getLocationInputUpdate(
    { ph: "5.2", N: "42", temperature: "28", humidity: "60" },
    [],
    { ph: 7.3, N: 92 },
    ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    manualOverrides,
    { temperature: 27, humidity: 80, rainfall: 100 },
  );

  assert.deepEqual(updated, {
    ph: "7.3",
    N: "42",
    temperature: "27",
    humidity: "80",
    rainfall: "100",
  });
  assert.deepEqual([...manualOverrides], ["N"]);
});

test("map climate autofill uses the selected local month and preserves manual entries", () => {
  const climate = localClimateResponse();
  const values = getSupportedClimateAutofillValues(
    climate,
    "10",
    ["temperature", "humidity", "rainfall", "ph"],
    new Set(["humidity"]),
  );

  assert.deepEqual(values, {
    temperature: "25",
    rainfall: "100",
  });
  assert.deepEqual(
    getSupportedClimateAutofillValues(
      { ...climate, status: "outside_coverage" },
      "10",
      ["temperature", "humidity", "rainfall"],
      new Set(),
    ),
    {},
  );
});

test("changing climate month replaces old automatic values but keeps manual values", () => {
  const currentValues = {
    temperature: "27",
    humidity: "manual humidity",
    rainfall: "100",
    ph: "7.3",
  };
  const manuallyEditedFields = new Set(["humidity"]);
  const climateInputs = getSupportedClimateAutofillValues(
    localClimateResponse({
      months: {
        ...localClimateResponse().months,
        "11": {
          temperature_c: 22,
          relative_humidity_pct: 65,
          precipitation_mm_month: 45,
        },
      },
    }),
    "11",
    ["temperature", "humidity", "rainfall"],
    manuallyEditedFields,
  );
  assert.deepEqual(
    getLocationInputUpdate(
      currentValues,
      ["temperature", "humidity", "rainfall"],
      {},
      ["temperature", "humidity", "rainfall", "ph"],
      manuallyEditedFields,
      climateInputs,
    ),
    {
      humidity: "manual humidity",
      ph: "7.3",
      temperature: "22",
      rainfall: "45",
    },
  );
});

test("only verified soil properties are eligible for map autofill", () => {
  const soilInputs = {
    ...lookupResponse().inputs,
    temperature: 24,
    humidity: 75,
    rainfall: 80,
    total_nitrogen: 252,
  };
  const values = getSupportedAutofillValues(
    soilInputs,
    ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    new Set(),
  );

  assert.deepEqual(values, { ph: "7.3" });
});

test("only mapped soil model inputs are eligible for map-based form autofill", () => {
  const soilValues = getSupportedAutofillValues(
    lookupResponse().inputs,
    ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    new Set(),
  );
  assert.deepEqual(soilValues, { ph: "7.3" });
  assert.equal(soilValues.N, undefined);
  assert.equal(soilValues.P, undefined);
  assert.equal(soilValues.K, undefined);
});

test("changing locations clears stale estimates but preserves manual values", () => {
  const updated = getLocationInputUpdate(
    { ph: "7.3", N: "manual nitrogen", temperature: "28" },
    ["ph", "temperature", "humidity", "rainfall"],
    {},
    ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    new Set(["N"]),
  );

  assert.deepEqual(updated, { N: "manual nitrogen" });
});

test("location status shows loading and useful local soil availability only", () => {
  const location = { latitude: 9.93, longitude: 78.12 };
  const loadingMessage = getLocationLookupStatus(location, true, null);
  assert.match(loadingMessage, /local soil and historical climate/);
  assert.match(loadingMessage, /9\.93000, 78\.12000/);

  const missingSoilInputs = lookupResponse({
    inputs: {},
    properties: {},
    available_properties: [],
    dataset_status: "no_data",
  });

  assert.match(
    getLocationLookupStatus(location, false, missingSoilInputs),
    /no valid compatible value/,
  );
  assert.equal(hasDisplayableLocalSoilData(missingSoilInputs), false);
  assert.deepEqual(getSupportedAutofillValues(
    missingSoilInputs.inputs,
    ["N", "P", "K", "ph"],
    new Set(),
  ), {});

  const validSoilStatus = getLocationLookupStatus(location, false, lookupResponse());
  assert.match(validSoilStatus, /1 compatible local soil value available/);
  assert.equal(hasDisplayableLocalSoilData(lookupResponse()), true);
  assert.equal(hasDisplayableLocalSoilData({
    ...missingSoilInputs,
    context_properties: { clay_content: { value: 260 } },
  }), true);
});

test("historical climate values are validated and kept separate from soil autofill", () => {
  const climate = localClimateResponse();

  assert.equal(validateLocalClimateResponse(climate), climate);
  assert.match(getClimateLookupStatus(climate, "10"), /October historical climate estimates.*1991–2020/);
  assert.match(getClimateLookupStatus(climate, "10"), /not live weather/);
  assert.deepEqual(
    getSupportedAutofillValues(
      climate.months,
      ["temperature", "humidity", "rainfall"],
      new Set(),
    ),
    {},
  );
  assert.throws(
    () => validateLocalClimateResponse({
      ...climate,
      months: { "01": { temperature_c: Number.NaN } },
    }),
    /inconsistent monthly data/,
  );
  assert.throws(
    () => validateLocalClimateResponse({
      ...climate,
      context_only: false,
    }),
    /invalid response/,
  );
});

test("lookup responses are checked before fields can be filled", () => {
  const response = lookupResponse();

  assert.equal(validateGeospatialLookupResponse(response), response);
  assert.throws(
    () => validateGeospatialLookupResponse(lookupResponse({
      inputs: { N: 0 },
    })),
    /inconsistent property data/,
  );
  assert.throws(
    () => validateGeospatialLookupResponse(lookupResponse({
      properties: { ph: { value: Number.NaN } },
    })),
    /inconsistent property data/,
  );
  assert.throws(
    () => validateGeospatialLookupResponse(lookupResponse({
      inputs: { N: 90 },
      properties: {
        N: {
          value: 90,
          units: "kg/ha",
          value_type: "direct_measurement",
          source: "Unverified sample",
          soil_depth_cm: 15,
        },
        ph: lookupResponse().properties.ph,
      },
      available_properties: ["N", "ph"],
      nutrient_availability: {
        ...lookupResponse().nutrient_availability,
        N: {
          ...lookupResponse().nutrient_availability.N,
          status: "incompatible",
          value: null,
        },
      },
    })),
    /inconsistent property data/,
  );
});

test("responses from older map selections are rejected", () => {
  assert.equal(isCurrentLocationRequest(4, 3), false);
  assert.equal(isCurrentLocationRequest(4, 4), true);
});

test("location responses validate only local soil and climate datasets", () => {
  const response = {
    latitude: 13.05539,
    longitude: 80.22194,
    soil: lookupResponse({ latitude: 13.05539, longitude: 80.22194 }),
    soil_error: null,
    climate: localClimateResponse({ latitude: 13.05539, longitude: 80.22194 }),
    climate_error: null,
  };

  assert.equal(validateLocationDataResponse(response), response);
  assert.throws(
    () => validateLocationDataResponse({
      ...response,
      climate: localClimateResponse({ latitude: 9.93, longitude: 78.12 }),
    }),
    /different coordinate/,
  );
  assert.throws(
    () => validateLocationDataResponse({
      ...response,
      climate_error: "Dataset missing",
    }),
    /invalid response/,
  );
});
