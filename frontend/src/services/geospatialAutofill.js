const MODEL_FIELDS = new Set([
  "N",
  "P",
  "K",
  "temperature",
  "humidity",
  "ph",
  "rainfall",
]);
const SOIL_AUTOFILL_FIELDS = new Set(["N", "P", "K", "ph"]);

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
const WEATHER_PROPERTIES = new Set([
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "soil_temperature_0cm",
  "soil_moisture_0_to_1cm",
]);
const RECENT_WEATHER_FIELDS = {
  temperature: "temperature",
  humidity: "humidity",
  rainfall: "rainfall",
};
const RECENT_WEATHER_UNITS = {
  temperature: "°C",
  humidity: "%",
  rainfall: "mm/day",
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
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

export function getRecentWeatherFormValues(weather, manuallyEditedFields) {
  if (!weather || !["available", "partial"].includes(weather.status)) return {};
  return Object.fromEntries(
    Object.entries(RECENT_WEATHER_FIELDS)
      .filter(([name]) => (
        !manuallyEditedFields.has(name)
        && isRecord(weather.observations?.[name])
        && isFiniteNumber(weather.observations[name].value)
      ))
      .map(([name]) => [name, String(weather.observations[name].value)]),
  );
}

export function getLocationInputUpdate(
  currentValues,
  previousLocationFields,
  nextLocationInputs,
  featureNames,
  manuallyEditedFields,
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
  };
}

export function getLocationLookupStatus(location, loading, soil, climate, recentWeather) {
  if (!location) return null;
  if (loading) {
    return `Looking up local soil and climate data and recent NASA POWER weather for ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}.`;
  }
  if (!soil && !climate && !recentWeather) return null;

  const soilStatus = soil
    ? [
      Object.hasOwn(soil.inputs, "ph")
        ? `pH: ${soil.inputs.ph} ${soil.properties.ph.units} mapped estimate available`
        : "pH: unavailable (no valid value in the selected raster cell)",
      ...["N", "P", "K"].map((name) => {
        const nutrient = soil.nutrient_availability?.[name];
        return nutrient?.available
          ? `${name}: compatible local value available`
          : `${name}: unavailable${nutrient?.reason ? ` (${nutrient.reason})` : ""}`;
      }),
    ].join("; ")
    : "Soil lookup unavailable";

  let climateStatus = "Climate lookup unavailable";
  if (climate?.status === "available" || climate?.status === "partial") {
    const monthCount = Object.keys(climate.months ?? {}).length;
    const period = climate.reference_period
      ? `${climate.reference_period.start_year}–${climate.reference_period.end_year}`
      : "historical period";
    const grid = climate.grid_location
      ? `; nearest grid cell ${climate.grid_location.latitude.toFixed(3)}, ${climate.grid_location.longitude.toFixed(3)}, ${(climate.grid_location.distance_m / 1000).toFixed(1)} km away`
      : "";
    climateStatus = `Historical climate: ${monthCount} monthly normals (${period}) available as context only${grid}; not current weather or prediction inputs`;
  } else if (climate?.status) {
    climateStatus = `Historical climate: ${getClimateLookupStatus(climate)}`;
  }

  const recentStatus = recentWeather
    ? recentWeather.latest_observation_date
      ? `Recent NASA POWER daily data through ${recentWeather.latest_observation_date} (${recentWeather.data_delay_days} days old), shown as modelled estimates and not current station observations`
      : `Recent NASA POWER daily weather: ${recentWeather.status.replaceAll("_", " ")}`
    : "Recent NASA POWER weather unavailable";
  const inputCount = soil ? Object.keys(soil.inputs).length : 0;
  const autofillStatus = inputCount
    ? `${inputCount} compatible soil model input${inputCount === 1 ? "" : "s"} auto-filled`
    : "No compatible soil model inputs auto-filled";
  return `Location lookup complete. ${soilStatus}. ${recentStatus}. ${climateStatus}. ${autofillStatus}; incompatible fields require compatible user-entered values before prediction.`;
}

export function getClimateLookupStatus(climate) {
  if (!climate) return null;
  if (climate.status === "not_installed") {
    return "No local climate dataset is installed; temperature, humidity, and rainfall remain manual.";
  }
  if (climate.status === "outside_coverage") {
    return "The selected location is outside the installed climate grid coverage.";
  }
  if (climate.status === "no_data") {
    return "The nearest local climate grid cell has no valid monthly values.";
  }
  if (climate.status === "partial") {
    return "Partial historical climate normals are available as context only.";
  }
  return "Historical monthly climate normals are available as context only, not current weather or model inputs.";
}

export function validateGeospatialLookupResponse(response) {
  if (
    !isRecord(response)
    || !isFiniteNumber(response.latitude)
    || !isFiniteNumber(response.longitude)
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

export function validateLocalGeospatialResponse(response) {
  if (
    !isRecord(response)
    || !isFiniteNumber(response.latitude)
    || !isFiniteNumber(response.longitude)
    || !(response.soil === null || isRecord(response.soil))
    || !(response.climate === null || isRecord(response.climate))
    || !(response.soil_error === null || typeof response.soil_error === "string")
    || !(response.climate_error === null || typeof response.climate_error === "string")
    || (response.soil === null) !== (response.soil_error !== null)
    || (response.climate === null) !== (response.climate_error !== null)
    || !(
      response.recent_weather === null
      || isRecord(response.recent_weather)
    )
    || !(
      response.recent_weather_error === null
      || typeof response.recent_weather_error === "string"
    )
    || (response.recent_weather === null) !== (response.recent_weather_error !== null)
  ) {
    throw new Error("The local location lookup returned an invalid response.");
  }
  if (response.soil) {
    validateGeospatialLookupResponse(response.soil);
    if (
      response.soil.latitude !== response.latitude
      || response.soil.longitude !== response.longitude
    ) {
      throw new Error("The local location lookup returned soil data for a different coordinate.");
    }
  }
  if (response.climate) {
    validateLocalClimateResponse(response.climate);
    if (
      response.climate.latitude !== response.latitude
      || response.climate.longitude !== response.longitude
    ) {
      throw new Error("The local location lookup returned climate data for a different coordinate.");
    }
  }
  if (response.recent_weather) {
    validateRecentWeatherResponse(response.recent_weather);
    if (
      response.recent_weather.latitude !== response.latitude
      || response.recent_weather.longitude !== response.longitude
    ) {
      throw new Error("The recent weather lookup returned data for a different coordinate.");
    }
  }
  return response;
}

export function validateRecentWeatherResponse(response) {
  const statuses = new Set(["available", "partial", "no_data"]);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !isRecord(response)
    || !isFiniteNumber(response.latitude)
    || !isFiniteNumber(response.longitude)
    || !statuses.has(response.status)
    || typeof response.dataset_name !== "string"
    || typeof response.source !== "string"
    || typeof response.source_url !== "string"
    || typeof response.license !== "string"
    || typeof response.license_url !== "string"
    || typeof response.retrieved_at !== "string"
    || !isRecord(response.requested_period)
    || !datePattern.test(response.requested_period.start_date)
    || !datePattern.test(response.requested_period.end_date)
    || !(
      response.latest_observation_date === null
      || (
        typeof response.latest_observation_date === "string"
        && datePattern.test(response.latest_observation_date)
      )
    )
    || !(
      response.data_delay_days === null
      || (
        Number.isInteger(response.data_delay_days)
        && response.data_delay_days >= 0
      )
    )
    || !(response.api_coordinates === null || (
      isRecord(response.api_coordinates)
      && isFiniteNumber(response.api_coordinates.latitude)
      && isFiniteNumber(response.api_coordinates.longitude)
    ))
    || !isRecord(response.grid_resolution_degrees)
    || !isFiniteNumber(response.grid_resolution_degrees.latitude)
    || !isFiniteNumber(response.grid_resolution_degrees.longitude)
    || !isRecord(response.observations)
    || response.model_compatible !== false
    || typeof response.warning !== "string"
  ) {
    throw new Error("The recent NASA POWER weather lookup returned an invalid response.");
  }

  const availableCount = Object.entries(RECENT_WEATHER_UNITS).filter(([name, units]) => {
    const observation = response.observations[name];
    return isRecord(observation)
      && isFiniteNumber(observation.value)
      && observation.units === units
      && typeof observation.observation_date === "string"
      && datePattern.test(observation.observation_date)
      && Number.isInteger(observation.data_delay_days)
      && observation.data_delay_days >= 0
      && observation.source === response.source
      && observation.value_type === "mapped_estimate";
  }).length;
  const hasInvalidObservation = Object.entries(RECENT_WEATHER_UNITS).some(([name, units]) => {
    const observation = response.observations[name];
    return observation !== null && (
      !isRecord(observation)
      || !isFiniteNumber(observation.value)
      || observation.units !== units
      || typeof observation.observation_date !== "string"
      || !datePattern.test(observation.observation_date)
      || !Number.isInteger(observation.data_delay_days)
      || observation.data_delay_days < 0
      || observation.source !== response.source
      || observation.value_type !== "mapped_estimate"
    );
  });
  if (
    hasInvalidObservation
    || Object.keys(RECENT_WEATHER_UNITS).some(
      (name) => !Object.hasOwn(response.observations, name),
    )
    || (response.status === "available" && availableCount !== 3)
    || (response.status === "partial" && (availableCount === 0 || availableCount === 3))
    || (response.status === "no_data" && availableCount !== 0)
  ) {
    throw new Error("The recent NASA POWER weather response has inconsistent values or units.");
  }
  return response;
}

export function validateLocationDataResponse(response) {
  if (
    !isRecord(response)
    || !isFiniteNumber(response.latitude)
    || !isFiniteNumber(response.longitude)
    || !isRecord(response.location_name)
    || !["available", "unavailable"].includes(response.location_name.status)
    || !(response.location_name.name === null || typeof response.location_name.name === "string")
    || typeof response.location_name.source !== "string"
    || typeof response.location_name.source_url !== "string"
    || typeof response.location_name.attribution_url !== "string"
    || typeof response.location_name.attribution !== "string"
    || !(response.soil === null || isRecord(response.soil))
    || !(response.soil_error === null || typeof response.soil_error === "string")
    || (response.soil === null) !== (response.soil_error !== null)
    || !isRecord(response.weather)
    || !["available", "partial", "unavailable"].includes(response.weather.status)
    || typeof response.weather.source !== "string"
    || typeof response.weather.license !== "string"
    || typeof response.weather.source_url !== "string"
    || !isRecord(response.weather.properties)
    || !Array.isArray(response.weather.unavailable_properties)
    || !Array.isArray(response.weather.warnings)
    || !response.weather.warnings.every((warning) => typeof warning === "string")
    || !isRecord(response.weather_model_inputs)
    || Object.keys(response.weather_model_inputs).length !== 0
  ) {
    throw new Error("The location lookup returned an invalid response. Please try again.");
  }

  if (response.soil) validateGeospatialLookupResponse(response.soil);
  if (
    response.soil
    && (
      response.soil.latitude !== response.latitude
      || response.soil.longitude !== response.longitude
    )
  ) {
    throw new Error("The location lookup returned soil data for a different coordinate.");
  }
  if (Object.entries(response.weather.properties).some(([name, property]) => (
    !WEATHER_PROPERTIES.has(name)
    || !isRecord(property)
    || !isFiniteNumber(property.value)
    || typeof property.units !== "string"
    || typeof property.source !== "string"
    || property.value_type !== "modelled_estimate"
    || typeof property.time !== "string"
    || typeof property.temporal_definition !== "string"
  )) || response.weather.unavailable_properties.some((name) => !WEATHER_PROPERTIES.has(name))) {
    throw new Error("The location lookup returned inconsistent weather data. Please try again.");
  }

  return response;
}

export function isCurrentLocationRequest(currentRequestId, requestId) {
  return currentRequestId === requestId;
}
