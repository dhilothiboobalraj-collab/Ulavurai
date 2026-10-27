import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocationLookupStatus,
  getClimateLookupStatus,
  getLocationInputUpdate,
  getRecentWeatherFormValues,
  getSupportedAutofillValues,
  isCurrentLocationRequest,
  validateGeospatialLookupResponse,
  validateLocalClimateResponse,
  validateLocalGeospatialResponse,
  validateLocationDataResponse,
  validateRecentWeatherResponse,
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

function recentWeatherResponse(overrides = {}) {
  const source = "NASA POWER Daily API (MERRA-2)";
  const observation = (value, units) => ({
    value,
    units,
    observation_date: "2026-10-22",
    data_delay_days: 5,
    source,
    value_type: "mapped_estimate",
  });
  return {
    status: "available",
    latitude: 9.93,
    longitude: 78.12,
    dataset_name: source,
    source,
    source_url: "https://power.larc.nasa.gov/",
    license: "NASA full-and-open data policy.",
    license_url: "https://www.earthdata.nasa.gov/",
    retrieved_at: "2026-10-27T12:00:00+00:00",
    requested_period: { start_date: "2026-08-28", end_date: "2026-10-26" },
    latest_observation_date: "2026-10-22",
    data_delay_days: 5,
    api_coordinates: { latitude: 9.93, longitude: 78.12 },
    grid_resolution_degrees: { latitude: 0.5, longitude: 0.625 },
    observations: {
      temperature: observation(27.3, "°C"),
      humidity: observation(86.2, "%"),
      rainfall: observation(8.79, "mm/day"),
    },
    model_compatible: false,
    context_only: false,
    warning: "Daily estimates; compatible aggregation unknown.",
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

test("recent NASA weather fills dated form previews but is not model-compatible", () => {
  const weather = recentWeatherResponse();
  assert.equal(validateRecentWeatherResponse(weather), weather);
  assert.deepEqual(
    getRecentWeatherFormValues(weather, new Set(["humidity"])),
    { temperature: "27.3", rainfall: "8.79" },
  );
  assert.throws(
    () => validateRecentWeatherResponse(recentWeatherResponse({
      observations: {
        ...recentWeatherResponse().observations,
        rainfall: {
          ...recentWeatherResponse().observations.rainfall,
          units: "mm/month",
        },
      },
    })),
    /inconsistent values or units/,
  );
});

test("map-selection response populates available pH and recent weather fields only", () => {
  const manual = new Set();
  const soilValues = getSupportedAutofillValues(
    lookupResponse().inputs,
    ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
    manual,
  );
  const weatherValues = getRecentWeatherFormValues(recentWeatherResponse(), manual);

  assert.deepEqual(
    { ...soilValues, ...weatherValues },
    {
      ph: "7.3",
      temperature: "27.3",
      humidity: "86.2",
      rainfall: "8.79",
    },
  );
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

test("location status summarizes soil by field and climate as context instead of a zero count", () => {
  const location = { latitude: 9.93, longitude: 78.12 };
  const loadingMessage = getLocationLookupStatus(location, true, null);
  assert.match(loadingMessage, /Looking up local soil and climate data and recent NASA POWER weather/);
  assert.match(loadingMessage, /9\.93000, 78\.12000/);

  const missingSoilInputs = lookupResponse({
    inputs: {},
    properties: {},
    available_properties: [],
    dataset_status: "no_data",
  });

  const climate = {
    status: "available",
    reference_period: { start_year: 1991, end_year: 2020 },
    grid_location: {
      latitude: 10,
      longitude: 78.125,
      distance_m: 7802.9,
    },
    months: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [
      String(index + 1).padStart(2, "0"),
      {},
    ])),
  };
  const completedMessage = getLocationLookupStatus(
    location,
    false,
    missingSoilInputs,
    climate,
  );
  assert.match(completedMessage, /pH: unavailable/);
  assert.match(completedMessage, /N: unavailable/);
  assert.match(completedMessage, /P: unavailable/);
  assert.match(completedMessage, /K: unavailable/);
  assert.match(completedMessage, /12 monthly normals/);
  assert.match(completedMessage, /context only/);
  assert.match(completedMessage, /not current weather or prediction inputs/);
  assert.match(completedMessage, /No compatible soil model inputs auto-filled/);
  assert.doesNotMatch(completedMessage, /0 supported soil model inputs/);
  assert.deepEqual(getSupportedAutofillValues(
    missingSoilInputs.inputs,
    ["N", "P", "K", "ph"],
    new Set(),
  ), {});

  const validSoilStatus = getLocationLookupStatus(location, false, lookupResponse(), climate);
  assert.match(validSoilStatus, /pH: 7\.3 pH mapped estimate available/);
  assert.match(validSoilStatus, /1 compatible soil model input auto-filled/);
});

test("historical climate context is validated and never used as a model input", () => {
  const climate = {
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
  };

  assert.equal(validateLocalClimateResponse(climate), climate);
  assert.match(getClimateLookupStatus(climate), /not current weather or model inputs/);
  assert.deepEqual(getSupportedAutofillValues(climate.months, ["temperature", "humidity", "rainfall"], new Set()), {});
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

test("combined local lookup requires independent soil and climate statuses for the same coordinates", () => {
  const climate = {
    status: "not_installed",
    latitude: 9.93,
    longitude: 78.12,
    dataset_name: "NASA POWER meteorological monthly normals",
    source: "NASA POWER; GMAO MERRA-2",
    source_url: "https://power.larc.nasa.gov/",
    license: "NASA full-and-open data policy.",
    license_url: "https://www.earthdata.nasa.gov/",
    reference_period: null,
    retrieved_at: null,
    installed_at: null,
    grid_resolution_degrees: null,
    grid_location: null,
    months: {},
    warning: "No local climate dataset is installed.",
    context_only: true,
  };
  const response = {
    latitude: 9.93,
    longitude: 78.12,
    soil: lookupResponse(),
    soil_error: null,
    climate,
    climate_error: null,
    recent_weather: recentWeatherResponse(),
    recent_weather_error: null,
  };

  assert.equal(validateLocalGeospatialResponse(response), response);
  assert.throws(
    () => validateLocalGeospatialResponse({
      ...response,
      climate: { ...climate, longitude: 78.13 },
    }),
    /different coordinate/,
  );
  assert.throws(
    () => validateLocalGeospatialResponse({
      ...response,
      climate: null,
    }),
    /invalid response/,
  );
  assert.throws(
    () => validateLocalGeospatialResponse({
      ...response,
      recent_weather_error: "timeout",
    }),
    /invalid response/,
  );
  assert.throws(
    () => validateLocalGeospatialResponse({
      ...response,
      recent_weather: {
        ...response.recent_weather,
        latitude: 9.94,
      },
    }),
    /different coordinate/,
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

test("weather context is validated separately and cannot populate model features", () => {
  const response = {
    latitude: 13.05539,
    longitude: 80.22194,
    location_name: {
      status: "available",
      name: "Chennai, Tamil Nadu",
      source: "OpenStreetMap Nominatim",
      source_url: "https://nominatim.openstreetmap.org/",
      attribution_url: "https://www.openstreetmap.org/copyright",
      attribution: "© OpenStreetMap contributors",
    },
    soil: lookupResponse({ latitude: 13.05539, longitude: 80.22194 }),
    soil_error: null,
    weather: {
      status: "available",
      source: "Open-Meteo Forecast API (Best Match)",
      license: "CC BY 4.0",
      source_url: "https://open-meteo.com/",
      license_url: "https://open-meteo.com/en/licence",
      properties: {
        temperature_2m: {
          label: "Air temperature at 2 m",
          value: 29.3,
          units: "°C",
          value_type: "modelled_estimate",
          source: "Open-Meteo Forecast API (Best Match)",
          time: "2026-10-27T09:45",
          temporal_definition: "Current model-derived condition.",
        },
      },
      unavailable_properties: [],
      retrieved_at: "2026-10-27T09:45",
      interval_seconds: 900,
      grid_location: { latitude: 13.04, longitude: 80.25, timezone: "Asia/Kolkata" },
      warnings: ["Weather data is modelled."],
    },
    weather_model_inputs: {},
  };

  assert.equal(validateLocationDataResponse(response), response);
  assert.throws(
    () => validateLocationDataResponse({
      ...response,
      location_name: { status: "available", name: null },
    }),
    /invalid response/,
  );
  assert.throws(
    () => validateLocationDataResponse({
      ...response,
      weather_model_inputs: { temperature: 29.3 },
    }),
    /invalid response/,
  );
  assert.throws(
    () => validateLocationDataResponse({
      ...response,
      weather: {
        ...response.weather,
        properties: {
          temperature: response.weather.properties.temperature_2m,
        },
      },
    }),
    /inconsistent weather data/,
  );
});
