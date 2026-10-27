import { useState } from "react";
import { LoaderCircle, Sprout } from "lucide-react";
import { api } from "../services/api.js";
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
} from "../services/farmerCropRecommendations.js";

const IRRIGATION_OPTIONS = [
  ["rainfed", "irrigationRainfed"],
  ["limited", "irrigationLimited"],
  ["reliable", "irrigationReliable"],
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
        {text.district} <span aria-hidden="true">*</span>
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
        aria-required="true"
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

export default function FarmerCropRecommendations({ initialDistrict = "", language = "ta" }) {
  const text = { ...FARMER_TRANSLATIONS.en, ...(FARMER_TRANSLATIONS[language] ?? {}) };
  const initial = TAMIL_NADU_DISTRICTS.find(([code]) => code === initialDistrict);
  const [district, setDistrict] = useState(initial?.[0] ?? "");
  const [issue, setIssue] = useState("");
  const [goal, setGoal] = useState("");
  const [irrigation, setIrrigation] = useState("");
  const [season, setSeason] = useState("");
  const [sowingMonth, setSowingMonth] = useState("");
  const [soilType, setSoilType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requiresDescription = issue === "other" || issue === "pest_disease";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!TAMIL_NADU_DISTRICTS.some(([code]) => code === district)) {
      setError(text.selectDistrictError);
      return;
    }
    if (!issue || !goal) {
      setError(text.requiredError);
      return;
    }
    if (issue === "other" && !issueDescription.trim()) {
      setError(text.otherDescriptionError);
      return;
    }

    setLoading(true);
    try {
      const recommendation = await api.farmerCropRecommendations({
        district,
        issue,
        goal,
        ...(irrigation ? { irrigation } : {}),
        ...(season ? { season } : {}),
        ...(sowingMonth ? { sowing_month: Number(sowingMonth) } : {}),
        ...(soilType ? { soil_type: soilType } : {}),
        ...(requiresDescription && issueDescription.trim()
          ? { issue_description: issueDescription.trim() }
          : {}),
      }, language);
      setResult(recommendation);
    } catch (reason) {
      setError(text.apiError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="simple-farmer-analysis">
      <header className="simple-farmer-heading">
        <p className="eyebrow"><Sprout size={15} /> {text.analysisEyebrow}</p>
        <h1>{text.heading}</h1>
        <p>{text.description}</p>
      </header>

      <form className="simple-farmer-form panel" onSubmit={submit} noValidate>
        <DistrictField
          district={district}
          setDistrict={setDistrict}
          language={language}
          text={text}
        />
        <label className="simple-farmer-field" htmlFor="simple-farmer-issue">
          {text.issue} <span aria-hidden="true">*</span>
          <select id="simple-farmer-issue" value={issue} onChange={(event) => setIssue(event.target.value)} aria-required="true">
            <option value="">{text.chooseIssue}</option>
            {selectOptions(FARMING_ISSUES, language)}
          </select>
        </label>
        <label className="simple-farmer-field" htmlFor="simple-farmer-goal">
          {text.goal} <span aria-hidden="true">*</span>
          <select id="simple-farmer-goal" value={goal} onChange={(event) => setGoal(event.target.value)} aria-required="true">
            <option value="">{text.chooseGoal}</option>
            {selectOptions(FARMER_GOALS, language)}
          </select>
        </label>

        {requiresDescription && (
          <label className="simple-farmer-field" htmlFor="simple-farmer-issue-description">
            {issue === "pest_disease" ? text.pestDescription : text.issueDescription}
            <textarea
              id="simple-farmer-issue-description"
              maxLength={240}
              rows={3}
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              placeholder={text.descriptionPlaceholder}
              aria-required={issue === "other"}
            />
          </label>
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
            <h2 id="simple-farmer-results-heading">{text.topCrops}</h2>
            <p>{text.provisionalNote}</p>
          </div>
          <div className="simple-farmer-crop-grid">
            {result.recommendations.map((crop) => (
              <article className="simple-farmer-crop-card" key={crop.rank}>
                <p className="eyebrow">{text.option} {crop.rank}</p>
                <h3>{language === "ta" ? crop.crop_ta : crop.crop}</h3>
                <p className="eyebrow">{text.why}</p>
                <ul>
                  {crop.reasons.map((reason) => <li key={reason}>{getFarmerCropReason(language, reason)}</li>)}
                </ul>
                <dl>
                  <div><dt>{text.sourceWater}</dt><dd>{crop.water_requirement_mm.toLocaleString(language === "ta" ? "ta-IN" : "en-IN")} mm · {text[crop.water_requirement_class === "low" ? "relativeLow" : crop.water_requirement_class === "high" ? "relativeHigh" : "relativeMedium"]}</dd></div>
                  <div><dt>{text.duration}</dt><dd>{translateFarmer(language, "aboutDays", { days: crop.duration_days })}</dd></div>
                  <div><dt>{text.suitability}</dt><dd>{text.districtUnavailable}</dd></div>
                  <div><dt>{text.cost}</dt><dd>{text.localDataUnavailable}</dd></div>
                </dl>
                <p className="simple-farmer-source">
                  {text.sourceLabel}: <a href={crop.source.url} target="_blank" rel="noreferrer">{crop.source.publisher}</a>.
                  {" "}{result.source_last_updated
                    ? translateFarmer(language, "updated", { date: result.source_last_updated })
                    : text.sourceDateUnavailable}
                </p>
              </article>
            ))}
          </div>
          <aside className="simple-farmer-limitations">
            <h3>{text.limitationsHeading}</h3>
            <ul>{result.limitations.map((limitation) => (
              <li key={limitation}>{getFarmerCropLimitation(language, limitation)}</li>
            ))}</ul>
            {result.issue === "pest_disease" && <p>{text.pestAdvice}</p>}
            <p>{text.advisoryNote}</p>
          </aside>
        </section>
      )}
    </div>
  );
}
