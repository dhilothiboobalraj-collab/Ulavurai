import { useRef, useState } from "react";
import { LoaderCircle, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
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
} from "../services/farmerCropRecommendations.js";

const IRRIGATION_OPTIONS = [
  ["rainfed", "irrigationRainfed"],
  ["limited", "irrigationLimited"],
  ["reliable", "irrigationReliable"],
];
const IRRIGATION_METHOD_OPTIONS = [
  ["drip", "irrigationMethodDrip"],
  ["sprinkler", "irrigationMethodSprinkler"],
  ["surface", "irrigationMethodSurface"],
  ["furrow", "irrigationMethodFurrow"],
  ["other", "irrigationMethodOther"],
];
const SEASON_OPTIONS = [
  ["kharif", "seasonKharif"],
  ["rabi", "seasonRabi"],
  ["summer", "seasonSummer"],
  ["year_round", "seasonYearRound"],
];
const SOIL_OPTIONS = [
  ["red_loam", "soilRedLoam"],
  ["black", "soilBlack"],
  ["clay", "soilClay"],
  ["sandy", "soilSandy"],
  ["unknown", "soilUnknown"],
];
const CROP_NAMES_TA = {
  apple: "ஆப்பிள்",
  banana: "வாழை",
  blackgram: "உளுந்து",
  chickpea: "கொண்டைக்கடலை",
  coconut: "தேங்காய்",
  coffee: "காபி",
  cotton: "பருத்தி",
  groundnut: "நிலக்கடலை",
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
  ragi: "கேழ்வரகு",
  sesame: "எள்",
  soybean: "சோயாபீன்",
  sorghum: "சோளம்",
  sugarcane: "கரும்பு",
  sunflower: "சூரியகாந்தி",
  watermelon: "தர்பூசணி",
};

function DistrictField({ district, setDistrict, language, text }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");
  const matches = searchTamilNaduDistricts(query);
  const selectedDistrict = TAMIL_NADU_DISTRICTS.find(([code]) => code === district);

  function updateDistrict(value) {
    setQuery(value);
    setDistrict("");
    setActiveIndex(0);
    setIsOpen(true);
  }

  function chooseDistrict(option) {
    setDistrict(option[0]);
    setQuery("");
    setIsOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter" && isOpen && matches.length) {
      event.preventDefault();
      chooseDistrict(matches[activeIndex] ?? matches[0]);
    }
  }

  return (
    <div className="simple-farmer-field simple-farmer-district-field">
      <label htmlFor="simple-farmer-district">
        {text.district}
      </label>
      <input
        id="simple-farmer-district"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="simple-farmer-district-options"
        aria-activedescendant={isOpen && matches.length
          ? `simple-farmer-district-option-${matches[activeIndex]?.[0]}`
          : undefined}
        value={isOpen ? query : selectedDistrict ? getDistrictDisplayName(district, language) : ""}
        onFocus={() => {
          setQuery("");
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onChange={(event) => updateDistrict(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setIsOpen(false)}
        placeholder={text.districtSearchPlaceholder}
        autoComplete="off"
        aria-required="false"
      />
      {isOpen && (
        <ul
          id="simple-farmer-district-options"
          className="simple-farmer-district-options"
          role="listbox"
          aria-label={text.districtListLabel}
        >
          {matches.length ? matches.map((option, index) => (
            <li
              id={`simple-farmer-district-option-${option[0]}`}
              role="option"
              aria-selected={district === option[0]}
              key={option[0]}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseDistrict(option)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {getDistrictDisplayName(option[0], language)}
              </button>
            </li>
          )) : (
            <li className="simple-farmer-district-empty" role="option" aria-disabled="true">
              {text.districtNoResults}
            </li>
          )}
        </ul>
      )}
      <small>{text.districtHelp}</small>
    </div>
  );
}

function selectOptions(items, language) {
  return items.map(([value, translationKey]) => (
    <option value={value} key={value}>{translateFarmer(language, translationKey)}</option>
  ));
}

function displayParsedValue(field, value, language, text) {
  if (value === "not_provided") return text.notProvided;
  if (field === "district") return getDistrictDisplayName(value, language) || value;
  if (field === "sowing_month" && Number.isInteger(value)) {
    return text.months[value - 1] ?? value;
  }
  if (field === "rainfall") return translateFarmer(language, `rainfall.${value}`);
  if (field === "season_month_consistency") {
    return translateFarmer(language, `seasonMonthConsistency.${value}`);
  }
  if (field === "issue" && value in Object.fromEntries(FARMING_ISSUES.map(([key]) => [key, true]))) {
    return translateFarmer(language, `issues.${value}`);
  }
  if (field === "goal" && value in Object.fromEntries(FARMER_GOALS.map(([key]) => [key, true]))) {
    return translateFarmer(language, `goals.${value}`);
  }
  if (field === "irrigation") {
    const key = value === "rainfed" ? "irrigationRainfed" : value === "limited" ? "irrigationLimited" : "irrigationReliable";
    return translateFarmer(language, key);
  }
  if (field === "season") {
    const key = value === "kharif" ? "seasonKharif" : value === "rabi" ? "seasonRabi" : value === "summer" ? "seasonSummer" : "seasonYearRound";
    return translateFarmer(language, key);
  }
  if (field === "soil_type") {
    const key = value === "red_loam" ? "soilRedLoam" : `soil${value[0].toUpperCase()}${value.slice(1)}`;
    return translateFarmer(language, key);
  }
  if (field === "affected_crop" && language === "ta") {
    return CROP_NAMES_TA[value] ?? value;
  }
  return String(value);
}

export default function FarmerCropRecommendations({ initialDistrict = "", language = "ta" }) {
  const text = { ...FARMER_TRANSLATIONS.en, ...(FARMER_TRANSLATIONS[language] ?? {}) };
  const initial = TAMIL_NADU_DISTRICTS.find(([code]) => code === initialDistrict);
  const [district, setDistrict] = useState(initial?.[0] ?? "");
  const [issue, setIssue] = useState("");
  const [goal, setGoal] = useState("");
  const [irrigation, setIrrigation] = useState("");
  const [irrigationMethod, setIrrigationMethod] = useState("");
  const [season, setSeason] = useState("");
  const [sowingMonth, setSowingMonth] = useState("");
  const [soilType, setSoilType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [affectedCrop, setAffectedCrop] = useState("");
  const [freeText, setFreeText] = useState("");
  const [modelInputs, setModelInputs] = useState({});
  const [soilTestInputs, setSoilTestInputs] = useState({});
  const [result, setResult] = useState(null);
  const [modelResult, setModelResult] = useState(null);
  const [modelNotice, setModelNotice] = useState("");
  const [modelError, setModelError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestSequence = useRef(0);

  const requiresDescription = issue === "other" || issue === "pest_disease";
  function updateDistrict(value) {
    requestSequence.current += 1;
    setDistrict(value);
    setResult(null);
    setModelResult(null);
    setModelNotice("");
    setModelError("");
    setError("");
    setLoading(false);
  }

  async function submit(event) {
    event.preventDefault();
    const requestId = ++requestSequence.current;
    setError("");
    setResult(null);
    setModelResult(null);
    setModelNotice("");
    setModelError("");
    if (district && !TAMIL_NADU_DISTRICTS.some(([code]) => code === district)) {
      setError(text.selectDistrictError);
      return;
    }
    if (
      !freeText.trim()
      && ![district, issue, goal, irrigation, irrigationMethod, season, sowingMonth, soilType].some(Boolean)
    ) {
      setError(text.requiredError);
      return;
    }
    if (requiresDescription && !issueDescription.trim() && !freeText.trim()) {
      setError(issue === "pest_disease" ? text.pestDescriptionError : text.otherDescriptionError);
      return;
    }
    if (issue === "pest_disease" && !affectedCrop.trim() && !freeText.trim()) {
      setError(text.affectedCropError);
      return;
    }

    setLoading(true);
    const farmerContext = {
      language,
      ...(freeText.trim() ? { free_text: freeText.trim() } : {}),
      ...(district ? { district } : {}),
      ...(issue ? { issue } : {}),
      ...(goal ? { goal } : {}),
      ...(irrigation ? { irrigation } : {}),
      ...(irrigationMethod ? { irrigation_method: irrigationMethod } : {}),
      ...(season ? { season } : {}),
      ...(sowingMonth ? { sowing_month: Number(sowingMonth) } : {}),
      ...(soilType ? { soil_type: soilType } : {}),
      ...(requiresDescription && issueDescription.trim()
        ? { issue_description: issueDescription.trim() }
        : {}),
      ...(affectedCrop.trim() ? { affected_crop: affectedCrop.trim() } : {}),
    };
    const hasAnyModelInput = FARMER_MODEL_INPUTS.some(
      ({ name }) => modelInputs[name] !== undefined && modelInputs[name] !== "",
    );
    const modelValidation = validateFarmerModelMeasurements(modelInputs);
    const soilTestValidation = validateFarmerSoilTestMeasurements(soilTestInputs);
    const measurementErrors = [];
    if (modelValidation.invalid.length) {
      measurementErrors.push(
        `${text.modelInvalid} ${modelValidation.invalid.map(
          (name) => text.modelInputUnits[name],
        ).join(", ")}.`,
      );
    }
    if (soilTestValidation.invalid.length) {
      measurementErrors.push(
        `${text.soilTestInvalid} ${soilTestValidation.invalid.map(
          (name) => text.soilTestInputUnits[name],
        ).join(", ")}.`,
      );
    }
    if (measurementErrors.length) setModelError(measurementErrors.join(" "));
    if (hasAnyModelInput && modelValidation.missing.length) {
      setModelNotice(
        `${text.modelIncomplete} ${modelValidation.missing.map(
          (name) => text.modelInputUnits[name],
        ).join(", ")}.`,
      );
    }

    const validModelMeasurements = Object.fromEntries(
      Object.entries(modelValidation.values).filter(
        ([name]) => !modelValidation.invalid.includes(name),
      ),
    );
    const modelMeasurements = {
      ...validModelMeasurements,
      ...soilTestValidation.values,
    };
    if (Object.keys(modelMeasurements).length) {
      farmerContext.model_measurements = modelMeasurements;
    }

    const tasks = [
      api.farmerCropRecommendations(farmerContext, language)
        .then((recommendation) => {
          if (requestId === requestSequence.current) setResult(recommendation);
        })
        .catch((reason) => {
          if (requestId !== requestSequence.current) return;
          setError(
            reason instanceof Error && reason.message.trim()
              ? reason.message
              : text.apiError,
          );
        }),
    ];

    if (
      hasAnyModelInput
      && modelValidation.missing.length === 0
      && modelValidation.invalid.length === 0
    ) {
      const modelPayload = { ...modelValidation.values };
      const guideFields = [
        "district",
        "issue",
        "goal",
        "irrigation",
        "season",
        "sowing_month",
        "soil_type",
        "issue_description",
      ];
      const guideContext = Object.fromEntries(
        guideFields
          .filter((field) => farmerContext[field] !== undefined)
          .map((field) => [field, farmerContext[field]]),
      );
      if (guideContext.district && guideContext.issue && guideContext.goal) {
        modelPayload.advisory_context = { farmer_guide: guideContext };
      }
      tasks.push(
        api.predict(modelPayload)
          .then((prediction) => {
            if (requestId === requestSequence.current) setModelResult(prediction);
          })
          .catch((reason) => {
            if (requestId !== requestSequence.current) return;
            setModelError(
              reason instanceof Error && reason.message.trim()
                ? `${text.modelPredictionError} ${reason.message}`
                : text.modelPredictionError,
            );
          }),
      );
    }

    try {
      await Promise.all(tasks);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }

  return (
    <div className="simple-farmer-analysis">
      <header className="simple-farmer-heading">
        <p className="eyebrow"><Sprout size={15} /> {text.analysisEyebrow}</p>
        <h1>{text.heading}</h1>
        <p>{text.description}</p>
      </header>

      <form
        className="simple-farmer-form panel"
        onSubmit={submit}
        onChange={() => {
          requestSequence.current += 1;
          setResult(null);
          setModelResult(null);
          setModelNotice("");
          setModelError("");
          setError("");
          setLoading(false);
        }}
        noValidate
      >
        <DistrictField
          district={district}
          setDistrict={updateDistrict}
          language={language}
          text={text}
        />
        <label className="simple-farmer-field" htmlFor="simple-farmer-description">
          {text.describeFarm}
          <textarea
            id="simple-farmer-description"
            maxLength={1000}
            rows={4}
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
            placeholder={text.describeFarmPlaceholder}
          />
          <small>{text.describeFarmHelp}</small>
        </label>
        <label className="simple-farmer-field" htmlFor="simple-farmer-issue">
            {text.issue}
          <select id="simple-farmer-issue" value={issue} onChange={(event) => setIssue(event.target.value)}>
            <option value="">{text.chooseIssue}</option>
            {selectOptions(FARMING_ISSUES, language)}
          </select>
        </label>
        <label className="simple-farmer-field" htmlFor="simple-farmer-goal">
            {text.goal}
          <select id="simple-farmer-goal" value={goal} onChange={(event) => setGoal(event.target.value)}>
            <option value="">{text.chooseGoal}</option>
            {selectOptions(FARMER_GOALS, language)}
          </select>
        </label>
        {requiresDescription && (
          <>
            {issue === "pest_disease" && (
              <label className="simple-farmer-field" htmlFor="simple-farmer-affected-crop">
                {text.affectedCrop}
                <input
                  id="simple-farmer-affected-crop"
                  maxLength={80}
                  value={affectedCrop}
                  onChange={(event) => setAffectedCrop(event.target.value)}
                  placeholder={text.affectedCropPlaceholder}
                />
              </label>
            )}
          <label className="simple-farmer-field" htmlFor="simple-farmer-issue-description">
            {issue === "pest_disease" ? text.pestDescription : text.issueDescription}
            <textarea
              id="simple-farmer-issue-description"
              maxLength={240}
              rows={3}
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              placeholder={text.descriptionPlaceholder}
              aria-required={requiresDescription}
            />
          </label>
          </>
        )}

        <fieldset className="simple-farmer-optional">
          <legend>{text.optionalInfo}</legend>
          <label className="simple-farmer-field" htmlFor="simple-farmer-irrigation">
            {text.irrigation}
            <select id="simple-farmer-irrigation" value={irrigation} onChange={(event) => setIrrigation(event.target.value)}>
              <option value="">{text.irrigationUnknown}</option>
              {selectOptions(IRRIGATION_OPTIONS, language)}
            </select>
          </label>
          <label className="simple-farmer-field" htmlFor="simple-farmer-irrigation-method">
            {text.irrigationMethod}
            <select
              id="simple-farmer-irrigation-method"
              value={irrigationMethod}
              onChange={(event) => setIrrigationMethod(event.target.value)}
            >
              <option value="">{text.irrigationUnknown}</option>
              {selectOptions(IRRIGATION_METHOD_OPTIONS, language)}
            </select>
          </label>
          <label className="simple-farmer-field" htmlFor="simple-farmer-season">
            {text.season}
            <select id="simple-farmer-season" value={season} onChange={(event) => setSeason(event.target.value)}>
              <option value="">{text.seasonNotSelected}</option>
              {selectOptions(SEASON_OPTIONS, language)}
            </select>
          </label>
          <label className="simple-farmer-field" htmlFor="simple-farmer-month">
            {text.sowingMonth}
            <select id="simple-farmer-month" value={sowingMonth} onChange={(event) => setSowingMonth(event.target.value)}>
              <option value="">{text.seasonNotSelected}</option>
              {text.months.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}
            </select>
          </label>
          <label className="simple-farmer-field" htmlFor="simple-farmer-soil">
            {text.soilType}
            <select id="simple-farmer-soil" value={soilType} onChange={(event) => setSoilType(event.target.value)}>
              <option value="">{text.soilUnknown}</option>
              {selectOptions(SOIL_OPTIONS, language)}
            </select>
          </label>
        </fieldset>

        <details className="simple-farmer-model-details">
          <summary>{text.modelInputsToggle}</summary>
          <fieldset className="simple-farmer-model-inputs">
            <legend>{text.modelInputsHeading}</legend>
            <p>{text.modelInputsHelp}</p>
            <div className="simple-farmer-model-input-grid">
              {FARMER_MODEL_INPUTS.map(({ name, min, max }) => (
                <label className="simple-farmer-field" htmlFor={`farmer-model-${name}`} key={name}>
                  {text.modelInputUnits[name]}
                  <input
                    id={`farmer-model-${name}`}
                    name={name}
                    type="number"
                    step="any"
                    min={min}
                    max={max}
                    value={modelInputs[name] ?? ""}
                    onChange={(event) => {
                      setModelInputs((previous) => ({
                        ...previous,
                        [name]: event.target.value,
                      }));
                      setError("");
                      setResult(null);
                      setModelResult(null);
                    }}
                    inputMode="decimal"
                  />
                </label>
              ))}
            </div>
            <small>{text.modelUnavailableUnits}</small>
          </fieldset>
          <fieldset className="simple-farmer-model-inputs">
            <legend>{text.soilTestInputsHeading}</legend>
            <p>{text.soilTestInputsHelp}</p>
            <div className="simple-farmer-model-input-grid">
              {FARMER_SOIL_TEST_INPUTS.map(({ name, min, max }) => (
                <label className="simple-farmer-field" htmlFor={`farmer-soil-test-${name}`} key={name}>
                  {text.soilTestInputUnits[name]}
                  <input
                    id={`farmer-soil-test-${name}`}
                    name={name}
                    type="number"
                    step="any"
                    min={min}
                    max={max}
                    value={soilTestInputs[name] ?? ""}
                    onChange={(event) => {
                      setSoilTestInputs((previous) => ({
                        ...previous,
                        [name]: event.target.value,
                      }));
                      setError("");
                      setResult(null);
                      setModelResult(null);
                    }}
                    inputMode="decimal"
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </details>

        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <button className="button button-primary simple-farmer-submit" type="submit" disabled={loading}>
          {loading
            ? <><LoaderCircle className="spin" size={18} /> {text.loading}</>
            : text.submit}
        </button>
      </form>

        {result && (
        <section className="simple-farmer-results" aria-labelledby="simple-farmer-results-heading">
          <div className="simple-farmer-result-intro">
            <p className="eyebrow">{text.comparison}</p>
            <h2 id="simple-farmer-results-heading">
              {result.status === "clarification_required"
                ? text.clarificationHeading
                : result.status === "unsupported_request"
                  ? text.unsupportedHeading
                  : result.recommendations.length
                ? text.relativeRecommendationHeading
                : text.topCrops}
            </h2>
            <p>{result.message || (
              result.recommendations.length
                ? text.relativeRecommendationNote
                : result.issue === "heavy_rainfall"
                  ? text.heavyRainfallNotAssessed
                  : text.noSupportedRanking
            )}</p>
            {result.confidence && (
              <p><strong>{text.confidence}: </strong>{translateFarmer(language, `confidenceLevels.${result.confidence}`)}</p>
            )}
            {result.questions?.length > 0 && (
              <ul>{result.questions.map((question) => <li key={question}>{question}</li>)}</ul>
            )}
            {result.conflicts?.length > 0 && (
              <p>{text.conflictFields}: {result.conflicts.map((field) => translateFarmer(language, `fields.${field}`)).join(", ")}</p>
            )}
            {result.parsed_conditions && (
              <details>
                <summary>{text.parsedConditions}</summary>
                <ul>
                  {Object.entries(result.parsed_conditions)
                    .filter(([, value]) => value !== null && value !== "not_provided")
                    .map(([field, value]) => (
                      <li key={field}>{translateFarmer(language, `fields.${field}`)}: {displayParsedValue(field, value, language, text)}</li>
                    ))}
                </ul>
              </details>
            )}
            {result.assumptions?.map((assumption) => <p key={assumption}>{assumption}</p>)}
            {result.recommendations.length > 0 && (
              <>
                <p>{text.relativeMatchNote}</p>
                <p>
                  <strong>{text.bestOptionSummary}: </strong>
                  {language === "ta"
                    ? CROP_NAMES_TA[result.recommendations[0].crop] ?? result.recommendations[0].crop
                    : result.recommendations[0].crop.replaceAll("_", " ")}
                </p>
                <p>
                  <strong>{text.rankingStrategy}: </strong>
                  {translateFarmer(
                    language,
                    `rankingStrategies.${result.analysis.ranking_strategy}`,
                  )}
                </p>
              </>
            )}
          </div>
          {result.recommendations.length > 0 && (
            <div className="simple-farmer-crop-grid">
              {result.recommendations.map((recommendation) => (
                <article className="simple-farmer-crop-card" key={recommendation.crop}>
                  <p className="eyebrow">{text.option} {recommendation.rank}</p>
                  {recommendation.classification === "conditionally_suitable" && (
                    <p className="simple-farmer-suitability-status">
                      {text.conditionalSuitability}
                    </p>
                  )}
                  <h3>
                    {language === "ta"
                      ? recommendation.name_ta ?? CROP_NAMES_TA[recommendation.crop] ?? recommendation.crop
                      : recommendation.name_en ?? recommendation.crop.replaceAll("_", " ")}
                    <small>
                      {language === "ta"
                        ? recommendation.name_en ?? recommendation.crop.replaceAll("_", " ")
                        : recommendation.name_ta ?? CROP_NAMES_TA[recommendation.crop] ?? recommendation.crop}
                    </small>
                  </h3>
                  <ul>
                    <li>{text.relativeMatch}: {recommendation.rank}</li>
                    <li>{text.relativeScore}: {recommendation.relative_match_score.toFixed(1)} / 100</li>
                    <li>
                      {text.relativeWaterClass}: {recommendation.water_requirement_class === "not_assessed"
                        ? text.notAssessed
                        : text[`waterClass${recommendation.water_requirement_class[0].toUpperCase()}${recommendation.water_requirement_class.slice(1)}`]}
                    </li>
                    <li>{text.cropWaterRequirement}: {recommendation.water_requirement_mm == null
                      ? text.notAssessed
                      : `${recommendation.water_requirement_mm} mm`}</li>
                    <li>{text.cropDuration}: {recommendation.duration_days == null
                      ? text.notAssessed
                      : `${recommendation.duration_days} ${text.aboutDaysUnit}`}</li>
                    {recommendation.score_breakdown?.length > 0 && (
                      <li>
                        {text.scoreBasis}:{" "}
                        {recommendation.score_breakdown.map((factor) => (
                          `${translateFarmer(language, `factorRoles.${factor.role}`)}: ${translateFarmer(language, `factorLabels.${factor.factor}`)} ${(
                            factor.score * 100
                          ).toFixed(1)}%`
                        )).join("; ")}
                      </li>
                    )}
                    {(recommendation.reason_text ?? recommendation.reasons).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                    {recommendation.evidence_notes?.map((note) => (
                      <li key={note}>{translateFarmer(language, `cropEvidence.${note}`)}</li>
                    ))}
                    {recommendation.sowing_window_evidence?.map((window) => {
                      const details = [
                        window.season_name,
                        window.water_regime ? text.waterRegimes[window.water_regime] : "",
                        window.months.map((month) => text.months[month - 1]).join(", "),
                        window.duration_text,
                        window.varieties?.length
                          ? `${text.varietiesLabel}: ${window.varieties.join(", ")}`
                          : "",
                      ].filter(Boolean);
                      return (
                        <li key={`${window.season_name ?? window.water_regime}-${window.months.join("-")}`}>
                          {text.verifiedSowingWindow}: {details.join(" · ")}
                        </li>
                      );
                    })}
                    <li>{text.seasonalAssessment}: {translateFarmer(language, `seasonal.${recommendation.seasonal_suitability ?? "not_assessed"}`)}</li>
                    {recommendation.risks?.map((risk) => <li key={risk}>{risk}</li>)}
                  </ul>
                  {recommendation.crop_sources?.map((source) => (
                    <p key={source.url}>
                      {text.sourceAttribution}:{" "}
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title} — {source.publisher}
                      </a>
                    </p>
                  ))}
                  <details className="simple-farmer-crop-guide">
                    <summary>{text.viewFarmingGuide}</summary>
                    <p>{text.noCropGuideAvailable}</p>
                  </details>
                </article>
              ))}
            </div>
          )}
          {result.analysis?.calendar_options_not_ranked?.length > 0 && (
            <aside className="simple-farmer-limitations">
              <h3>{text.calendarOptionsNotRanked}</h3>
              <p>{text.calendarOptionsNotRankedHelp}</p>
              <ul>
                {result.analysis.calendar_options_not_ranked.map((option) => (
                  <li key={option.crop}>
                    <strong>
                      {language === "ta"
                        ? CROP_NAMES_TA[option.crop] ?? option.crop
                        : translateFarmer(language, `crops.${option.crop}`)}
                    </strong>
                    {`: ${text.calendarOnlyReason} `}
                    {option.sowing_window_evidence.map((window) => (
                      `${window.season_name}: ${window.months.map((month) => text.months[month - 1]).join(", ")}`
                    )).join("; ")}
                    {option.crop_sources?.map((source) => (
                      <span key={source.url}>
                        {" "}
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title} — {source.publisher}
                        </a>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </aside>
          )}
          {result.analysis?.excluded_crops?.length > 0 && (
            <aside className="simple-farmer-limitations">
              <h3>{text.notRecommendedFromEvidence}</h3>
              <ul>
                {result.analysis.excluded_crops.map((excluded) => (
                  <li key={`${excluded.crop}-${excluded.reason}`}>
                    {language === "ta"
                      ? CROP_NAMES_TA[excluded.crop] ?? excluded.crop
                      : excluded.crop.replaceAll("_", " ")}
                    {": "}
                    {translateFarmer(language, `excludedCropReasons.${excluded.reason}`)}
                    {excluded.source?.url && (
                      <>
                        {" "}
                        <a href={excluded.source.url} target="_blank" rel="noreferrer">
                          {excluded.source.title}
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <aside className="simple-farmer-limitations">
            <h3>{text.selectedContext}</h3>
            <ul>
              <li>{text.district}: {getDistrictDisplayName(result.district, language)}</li>
              <li>{text.issue}: {result.issue === "not_provided" ? text.notProvided : translateFarmer(language, `issues.${result.issue}`)}</li>
              <li>{text.goal}: {result.goal === "not_provided" ? text.notProvided : translateFarmer(language, `goals.${result.goal}`)}</li>
              {result.selected_context.irrigation && (
                <li>{text.irrigation}: {translateFarmer(language, `irrigation${result.selected_context.irrigation === "rainfed" ? "Rainfed" : result.selected_context.irrigation === "limited" ? "Limited" : "Reliable"}`)}</li>
              )}
              {result.selected_context.irrigation_method && (
                <li>{text.irrigationMethod}: {translateFarmer(language, `irrigationMethod${result.selected_context.irrigation_method[0].toUpperCase()}${result.selected_context.irrigation_method.slice(1)}`)}</li>
              )}
              {result.selected_context.season && (
                <li>{text.season}: {translateFarmer(language, `season${result.selected_context.season === "kharif" ? "Kharif" : result.selected_context.season === "rabi" ? "Rabi" : result.selected_context.season === "summer" ? "Summer" : "YearRound"}`)}</li>
              )}
              {result.selected_context.sowing_month && (
                <li>{text.monthLabel}: {text.months[result.selected_context.sowing_month - 1]}</li>
              )}
              {result.selected_context.soil_type && (
                <li>{text.soilType}: {translateFarmer(language, `soil${result.selected_context.soil_type === "red_loam" ? "RedLoam" : result.selected_context.soil_type[0].toUpperCase() + result.selected_context.soil_type.slice(1)}`)}</li>
              )}
              {result.selected_context.issue_description && (
                <li>{text.issueDescriptionLabel}: {result.selected_context.issue_description}</li>
              )}
              {result.selected_context.free_text && (
                <li>{text.describeFarm}: {result.selected_context.free_text}</li>
              )}
              {result.selected_context.model_measurements && (
                <>
                  <li>{text.modelMeasurementsNotScored}</li>
                  {Object.entries(result.selected_context.model_measurements).map(([field, value]) => (
                    <li key={field}>{text.modelInputUnits[field] ?? field}: {value}</li>
                  ))}
                </>
              )}
            </ul>
            {result.analysis?.input_usage && (
              <details>
                <summary>{text.inputUsageHeading}</summary>
                <ul>
                  {Object.entries(result.analysis.input_usage).map(([field, usage]) => (
                    <li key={field}>
                      {translateFarmer(language, `inputUsageFields.${field}`)}:{" "}
                      {translateFarmer(language, `inputUsageStatus.${usage.status}`)}
                      {usage.scoring_factors?.length > 0
                        ? ` · ${usage.scoring_factors.map((factor) => translateFarmer(language, `factorLabels.${factor}`)).join(", ")}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {result.limitations.length > 0 && (
              <>
                <h3>{text.limitationsHeading}</h3>
                <ul>{result.limitations.map((limitation) => (
                  <li key={limitation}>{getFarmerCropLimitation(language, limitation)}</li>
                ))}</ul>
              </>
            )}
            {result.issue === "pest_disease" && <p>{text.pestAdvice}</p>}
            {result.farming_guide?.length > 0 && (
              <>
                <h3>{text.viewFarmingGuide}</h3>
                <ul>{result.farming_guide.map((item) => <li key={item}>{item}</li>)}</ul>
              </>
            )}
            {result.source?.url && (
              <p>
                {text.sourceAttribution}:{" "}
                <a href={result.source.url} target="_blank" rel="noreferrer">
                  {result.source.title} — {result.source.publisher}
                </a>
              </p>
            )}
            <p>{text.advisoryNote}</p>
          </aside>
        </section>
      )}
      {modelNotice && <p className="alert" role="status">{modelNotice}</p>}
      {modelError && <p className="alert alert-error" role="alert">{modelError}</p>}
      {modelResult && (
        <section className="simple-farmer-results" aria-labelledby="simple-farmer-model-result-heading">
          <div className="simple-farmer-result-intro">
            <p className="eyebrow">{text.comparison}</p>
            <h2 id="simple-farmer-model-result-heading">{text.modelRecommendation}</h2>
            <p>{text.modelRecommendationMethod}</p>
            <p>{text.modelVoteNote}</p>
          </div>
          <div className="simple-farmer-crop-grid">
            {modelResult.recommendations.map((recommendation) => (
              <article className="simple-farmer-crop-card" key={recommendation.crop}>
                <p className="eyebrow">
                  {recommendation.rank === 1 ? text.recommendedCrop : `${text.option} ${recommendation.rank}`}
                </p>
                <h3>
                  {language === "ta"
                    ? CROP_NAMES_TA[recommendation.crop] ?? recommendation.crop
                    : recommendation.crop.replaceAll("_", " ")}
                  {language === "ta" && (
                    <small>{recommendation.crop.replaceAll("_", " ")}</small>
                  )}
                </h3>
                <p>{text.modelVote}: {recommendation.confidence.toFixed(1)}%</p>
              </article>
            ))}
          </div>
          <aside className="simple-farmer-limitations">
            {modelResult.explanation?.summary && <p>{modelResult.explanation.summary}</p>}
            <h3>{text.modelInputSummary}</h3>
            <ul>
              {FARMER_MODEL_INPUTS.map(({ name }) => (
                <li key={name}>{text.modelInputUnits[name]}: {modelInputs[name]}</li>
              ))}
            </ul>
            {modelResult.warnings?.map((warning, index) => <p key={`${index}-${warning}`}>{warning}</p>)}
            <Link
              className="button button-primary"
              to="/predict"
              state={{
                farmerGuideContext: modelResult.advisory_context?.farmer_guide,
              }}
            >
              {text.modelLocationAction}
            </Link>
          </aside>
        </section>
      )}
    </div>
  );
}
