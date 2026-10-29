const MODEL_FIELDS = new Set([
  "N",
  "P",
  "K",
  "temperature",
  "humidity",
  "ph",
  "rainfall",
]);
const SOIL_AUTOFILL_FIELDS = new Set(["ph"]);
const CLIMATE_AUTOFILL_FIELDS = new Set(["temperature", "humidity", "rainfall"]);
const CLIMATE_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DATASET_STATUSES = new Set([
  "available",
  "partial",
  "no_data",
  "outside_coverage",
  "not_installed",
]);
const NUTRIENT_STATUSES = new Set([
  "available",
  "incompatible",
  "no_data",
  "outside_coverage",
  "not_installed",
]);
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteInput(value) {
  return isFiniteNumber(value)
    || (
      typeof value === "string"
      && value.trim().length > 0
      && Number.isFinite(Number(value))
    );
}

function isValidProperty(property) {
  return (
    isRecord(property)
    && isFiniteNumber(property.value)
    && typeof property.units === "string"
    && property.units.length > 0
    && typeof property.source === "string"
    && property.source.length > 0
    && ["direct_measurement", "mapped_estimate"].includes(property.value_type)
    && (
      isFiniteNumber(property.soil_depth_cm)
      || (
        Array.isArray(property.soil_depth_cm)
        && property.soil_depth_cm.length === 2
        && property.soil_depth_cm.every(isFiniteNumber)
      )
    )
  );
}

export function getSupportedAutofillValues(inputs, featureNames, manuallyEditedFields) {
  return Object.fromEntries(
    featureNames
      .filter((name) => (
        SOIL_AUTOFILL_FIELDS.has(name)
        && Object.hasOwn(inputs, name)
        && isFiniteNumber(inputs[name])
        && !manuallyEditedFields.has(name)
      ))
      .map((name) => [name, String(inputs[name])]),
  );
}

export function getSupportedClimateAutofillValues(
  climate,
  month,
  featureNames,
  manuallyEditedFields,
) {
  const monthlyValues = climate?.months?.[month];
  if (!monthlyValues || climate.status === "not_installed"
    || climate.status === "outside_coverage" || climate.status === "no_data") {
    return {};
  }

  const climateInputs = {
    temperature: monthlyValues.temperature_c,
    humidity: monthlyValues.relative_humidity_pct,
    rainfall: monthlyValues.precipitation_mm_month,
  };
  return Object.fromEntries(
    featureNames
      .filter((name) => (
        CLIMATE_AUTOFILL_FIELDS.has(name)
        && isFiniteNumber(climateInputs[name])
        && !manuallyEditedFields.has(name)
      ))
      .map((name) => [name, String(climateInputs[name])]),
  );
}

export function clearLocationAutofillOverrides(manuallyEditedFields) {
  for (const name of [...SOIL_AUTOFILL_FIELDS, ...CLIMATE_AUTOFILL_FIELDS]) {
    manuallyEditedFields.delete(name);
  }
}

export function getLocationInputUpdate(
  currentValues,
  previousLocationFields,
  nextLocationInputs,
  featureNames,
  manuallyEditedFields,
  nextClimateInputs = {},
) {
  const preservedValues = Object.fromEntries(
    Object.entries(currentValues).filter(([name]) => (
      !previousLocationFields.includes(name)
      || manuallyEditedFields.has(name)
    )),
  );
  return {
    ...preservedValues,
    ...getSupportedAutofillValues(
      nextLocationInputs,
      featureNames,
      manuallyEditedFields,
    ),
    ...Object.fromEntries(
      featureNames
        .filter((name) => (
          CLIMATE_AUTOFILL_FIELDS.has(name)
          && isFiniteInput(nextClimateInputs[name])
          && !manuallyEditedFields.has(name)
        ))
        .map((name) => [name, String(nextClimateInputs[name])]),
    ),
  };
}

export function getLocationLookupStatus(location, loading, soil) {
  if (!location) return null;
  if (loading) {
    return `Looking up local soil and historical climate for ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}.`;
  }
  const soilValueCount = soil?.available_properties?.length ?? 0;
  if (soilValueCount) {
    return `${soilValueCount} compatible local soil value${soilValueCount === 1 ? "" : "s"} available to auto-fill.`;
  }
  if (soil?.dataset_status === "not_installed") {
    return "No local soil dataset is installed; soil inputs must be entered manually.";
  }
  if (soil?.dataset_status === "outside_coverage") {
    return "This location is outside the installed soil dataset coverage; soil inputs must be entered manually.";
  }
  if (soil?.dataset_status === "no_data") {
    return "The installed soil dataset has no valid compatible value at this point; soil inputs must be entered manually.";
  }
  if (soil) {
    return "No compatible local soil model inputs are available at this point; soil inputs must be entered manually.";
  }
  return null;
}

export function hasDisplayableLocalSoilData(soil) {
  return Boolean(
    soil
    && (
      (Array.isArray(soil.available_properties) && soil.available_properties.length > 0)
      || Object.keys(soil.context_properties ?? {}).length > 0
    ),
  );
}

export function getClimateLookupStatus(climate, month) {
  if (!climate) return null;
  if (climate.status === "not_installed") {
    return "No local climate dataset is installed; weather inputs must be entered manually.";
  }
  if (climate.status === "outside_coverage") {
    return "This location is outside the installed climate grid coverage; weather inputs must be entered manually.";
  }
  if (climate.status === "no_data") {
    return "The nearest climate grid cell has no valid monthly values; weather inputs must be entered manually.";
  }
  if (climate.status === "partial") {
    return "Some historical monthly climate values are available; missing weather inputs must be entered manually.";
  }
  if (Number.isInteger(Number(month)) && Number(month) >= 1 && Number(month) <= 12) {
    const monthlyValues = climate.months?.[String(month).padStart(2, "0")];
    if (
      !monthlyValues
      || ![
        monthlyValues.temperature_c,
        monthlyValues.relative_humidity_pct,
        monthlyValues.precipitation_mm_month,
      ].some(isFiniteNumber)
    ) {
      return "No historical climate values are available for this month; weather inputs must be entered manually.";
    }
    const period = climate.reference_period;
    const dateRange = period
      ? ` (${period.start_year}–${period.end_year})`
      : "";
    return `${CLIMATE_MONTH_NAMES[Number(month) - 1]} historical climate estimates${dateRange} can auto-fill weather inputs; these are not live weather.`;
  }
  return "Historical monthly climate estimates can auto-fill weather inputs; these are not live weather.";
}

export function validateGeospatialLookupResponse(response) {
  if (
    !isRecord(response)
    || !isFiniteNumber(response.latitude)
    || response.latitude < -90
    || response.latitude > 90
    || !isFiniteNumber(response.longitude)
    || response.longitude < -180
    || response.longitude > 180
    || !DATASET_STATUSES.has(response.dataset_status)
    || !isRecord(response.inputs)
    || !isRecord(response.properties)
    || !isRecord(response.context_properties)
    || !isRecord(response.nutrient_availability)
    || !Array.isArray(response.available_properties)
    || !Array.isArray(response.unavailable_properties)
    || !Array.isArray(response.warnings)
    || !response.warnings.every((warning) => typeof warning === "string")
    || !(
      response.provenance === null
      || (
        isRecord(response.provenance)
        && typeof response.provenance.dataset_name === "string"
        && typeof response.provenance.source === "string"
        && isFiniteNumber(response.provenance.spatial_resolution_m)
      )
    )
    || !(
      response.lookup === null
      || isRecord(response.lookup)
    )
  ) {
    throw new Error("The soil lookup returned an invalid response. Please try again.");
  }

  const inputNames = Object.keys(response.inputs);
  const propertyNames = Object.keys(response.properties);
  const nutrientAvailability = response.nutrient_availability;
  const nutrientProperties = [...inputNames, ...propertyNames]
    .filter((name) => ["N", "P", "K"].includes(name));
  if (
    ["N", "P", "K"].some((name) => {
      const nutrient = nutrientAvailability[name];
      return !isRecord(nutrient)
        || !NUTRIENT_STATUSES.has(nutrient.status)
        || typeof nutrient.available !== "boolean"
        || !(nutrient.value === null || isFiniteNumber(nutrient.value))
        || !(nutrient.units === null || typeof nutrient.units === "string")
        || !(nutrient.source === null || typeof nutrient.source === "string")
        || !(nutrient.reason === null || typeof nutrient.reason === "string")
        || !Array.isArray(nutrient.missing_requirements)
        || !nutrient.missing_requirements.every((item) => typeof item === "string")
        || !(nutrient.spatial_resolution_m === null
          || isFiniteNumber(nutrient.spatial_resolution_m))
        || !(nutrient.soil_depth_cm === null
          || isFiniteNumber(nutrient.soil_depth_cm)
          || (
            Array.isArray(nutrient.soil_depth_cm)
            && nutrient.soil_depth_cm.length === 2
            && nutrient.soil_depth_cm.every(isFiniteNumber)
          ))
        || !(nutrient.value_type === null
          || ["direct_measurement", "mapped_estimate"].includes(nutrient.value_type))
        || (nutrient.available && (
          nutrient.status !== "available"
          || !isFiniteNumber(nutrient.value)
          || typeof nutrient.units !== "string"
          || typeof nutrient.source !== "string"
        ))
        || (!nutrient.available && nutrient.value !== null);
    })
    || nutrientProperties.some((name) => (
      !isRecord(nutrientAvailability)
      || nutrientAvailability[name]?.available !== true
    ))
    || inputNames.some((name) => (
      !MODEL_FIELDS.has(name)
      || !isFiniteNumber(response.inputs[name])
      || !isValidProperty(response.properties[name])
    ))
    || propertyNames.some((name) => (
      !MODEL_FIELDS.has(name)
      || !isValidProperty(response.properties[name])
    ))
    || !inputNames.every((name) => response.available_properties.includes(name))
    || !propertyNames.every((name) => response.available_properties.includes(name))
    || !response.available_properties.every((name) => MODEL_FIELDS.has(name))
    || !response.unavailable_properties.every((name) => MODEL_FIELDS.has(name))
  ) {
    throw new Error("The soil lookup returned inconsistent property data. Please try again.");
  }

  return response;
}

export function validateLocalClimateResponse(response) {
  const statuses = new Set([
    "available",
    "partial",
    "no_data",
    "outside_coverage",
    "not_installed",
  ]);
  if (
    !isRecord(response)
    || !isFiniteNumber(response.latitude)
    || !isFiniteNumber(response.longitude)
    || !statuses.has(response.status)
    || typeof response.dataset_name !== "string"
    || typeof response.source !== "string"
    || typeof response.source_url !== "string"
    || typeof response.license !== "string"
    || !(
      response.reference_period === null
      || (
        isRecord(response.reference_period)
        && Number.isInteger(response.reference_period.start_year)
        && Number.isInteger(response.reference_period.end_year)
        && response.reference_period.start_year <= response.reference_period.end_year
      )
    )
    || !(response.retrieved_at === null || typeof response.retrieved_at === "string")
    || !(response.installed_at === null || typeof response.installed_at === "string")
    || !(response.grid_location === null || (
      isRecord(response.grid_location)
      && isFiniteNumber(response.grid_location.latitude)
      && isFiniteNumber(response.grid_location.longitude)
      && isFiniteNumber(response.grid_location.distance_m)
      && response.grid_location.distance_m >= 0
    ))
    || !isRecord(response.months)
    || typeof response.warning !== "string"
    || response.context_only !== true
  ) {
    throw new Error("The local climate lookup returned an invalid response. Please try again.");
  }

  const monthKeys = Object.keys(response.months);
  if (
    monthKeys.some((month) => !/^(0[1-9]|1[0-2])$/.test(month))
    || Object.values(response.months).some((month) => (
      !isRecord(month)
      || ["temperature_c", "relative_humidity_pct", "precipitation_mm_month"].some(
        (name) => month[name] !== null && !isFiniteNumber(month[name]),
      )
      || (
        month.temperature_c !== null
        && month.temperature_c !== undefined
        && (month.temperature_c < -100 || month.temperature_c > 70)
      )
      || (
        month.relative_humidity_pct !== null
        && month.relative_humidity_pct !== undefined
        && (month.relative_humidity_pct < 0 || month.relative_humidity_pct > 100)
      )
      || (
        month.precipitation_mm_month !== null
        && month.precipitation_mm_month !== undefined
        && month.precipitation_mm_month < 0
      )
    ))
    || (response.status === "available" && monthKeys.length !== 12)
    || (response.status === "not_installed" && monthKeys.length !== 0)
  ) {
    throw new Error("The local climate lookup returned inconsistent monthly data.");
  }
  return response;
}

export function validateLocationDataResponse(response) {
  if (
    !isRecord(response)
    || !isFiniteNumber(response.latitude)
    || response.latitude < -90
    || response.latitude > 90
    || !isFiniteNumber(response.longitude)
    || response.longitude < -180
    || response.longitude > 180
    || !(response.soil === null || isRecord(response.soil))
    || !(response.soil_error === null || typeof response.soil_error === "string")
    || (response.soil === null) !== (response.soil_error !== null)
    || !(response.climate === null || isRecord(response.climate))
    || !(response.climate_error === null || typeof response.climate_error === "string")
    || (response.climate === null) !== (response.climate_error !== null)
  ) {
    throw new Error("The location lookup returned an invalid response. Please try again.");
  }

  if (response.soil) validateGeospatialLookupResponse(response.soil);
  if (response.climate) validateLocalClimateResponse(response.climate);
  if (
    response.soil
    && (
      response.soil.latitude !== response.latitude
      || response.soil.longitude !== response.longitude
    )
  ) {
    throw new Error("The location lookup returned soil data for a different coordinate.");
  }
  if (
    response.climate
    && (
      response.climate.latitude !== response.latitude
      || response.climate.longitude !== response.longitude
    )
  ) {
    throw new Error("The location lookup returned climate data for a different coordinate.");
  }
  return response;
}

export function isCurrentLocationRequest(currentRequestId, requestId) {
  return currentRequestId === requestId;
}
