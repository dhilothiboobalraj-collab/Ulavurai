# Ulavurai - Crop Recommendation Application

Ulavurai provides a FastAPI API and React/Vite dashboard using a trained crop
recommendation model. The backend loads the saved model; it does not retrain it
on startup.

## Dataset

Place the CSV at:

```text
datasets/Crop_recommendation.csv
```

Required columns: `N`, `P`, `K`, `temperature`, `humidity`, `ph`, `rainfall`,
and `label`.

The supplied `archive.zip` contains this CSV. The `CropRecommendation-main.zip`
contains a reference notebook and dataset description, not another training
dataset. The supplied `Rainfall_indselect_rfp25.grd` is empty (0 bytes), and
the supplied README describes separate Soil Health Card/SoilGrids analyses
whose R scripts and input data were not attached. Neither is used as a model
input. The crop CSV already includes rainfall as a feature.

The dataset description says its records were assembled from rainfall,
climate, and fertilizer data for India. It does not provide a region or date
for each row, so the model should be treated as a dataset-based demonstration,
not a universal or season-aware agronomic guarantee.

## Run the application

Install backend dependencies and start FastAPI from the project root:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

In another terminal, start the React app:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The backend API runs at `http://localhost:8000`;
interactive API documentation is at `http://localhost:8000/docs`.

## Authentication and deployment

The dashboard and protected API operations require a Supabase-authenticated
account. The frontend uses the project URL and publishable key; the backend
uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to validate bearer tokens
against the Supabase Auth user endpoint. A service-role/secret key is not
required. Copy the ignored local templates `.env.example` and
`frontend/.env.example` for local configuration. For the Docker-free
single-project Vercel production setup, required settings, build commands,
manual hosting steps, and smoke checks are in [DEPLOYMENT.md](./DEPLOYMENT.md).

Production history must use hosted PostgreSQL; local SQLite is for development
only. Existing local history in `predictions.db` is not migrated automatically.
If you intend to preserve it, see the migration instructions in
[DEPLOYMENT.md](./DEPLOYMENT.md).

## Existing model artifacts

- `models/crop_recommendation.joblib` - fitted Random Forest pipeline, ordered
  feature names, and crop labels
- `models/metrics.json` - model comparison and held-out test metrics
- `models/confusion_matrix.csv` - held-out test confusion matrix

The saved pipeline contains just the Random Forest classifier; no separate
scaler or label encoder is present. The API uses the model's `predict_proba`
and derives feature importance directly from its fitted classifier.
`datasets/Crop_recommendation.csv` is required at runtime for quartile-based
analysis and out-of-training-range warnings.

## Application features

- `POST /predict` returns the model's top three probability-ranked crops,
  input-value context, dataset-relative soil/environment analysis, and
  out-of-range warnings. Optional district/location/season/farm/soil/water/
  market/objective details are saved and displayed as user-provided advisory
  context only; they are not Random Forest inputs or verified external data.
  Successful predictions are saved to `predictions.db` locally or to the
  PostgreSQL database selected by `DATABASE_URL`.
- `POST /predict/preview` provides authenticated what-if recommendations
  without writing prediction history.
- `GET /model/crop-calendar` returns the existing TNAU crop duration reference.
  The field toolkit presents a general planning timeline, not region-specific
  sowing months or fertilizer instructions.
- `POST /farmer-guide/predict` saves Tamil/English farmer-guide choices in the
  configured history database. Without the seven actual model inputs, it
  returns farmer-situation guidance and never guesses a crop. The optional
  `model_inputs` object accepts N/P/K, pH, temperature, humidity, and rainfall;
  when supplied, it uses the existing Random Forest model and returns the
  model-ranked top three and their probabilities.
- `POST /geospatial/soil-lookup` accepts latitude/longitude and checks for the
  selected cell in the locally stored SoilGrids GeoTIFFs. The authenticated
  soil-only lookup uses the raster CRS and pixel only and does not substitute
  a nearby pixel. Dataset provenance, coverage, units, resolution, depth, and
  limitations are documented in `backend/data/soil/README.md`.
- `GET /geospatial/climate-lookup?latitude=...&longitude=...` reads the
  optional locally installed NASA POWER monthly climate grid. It makes no
  network request and returns historical monthly normals with the nearest
  grid-cell coordinates and actual distance. These values are shown as
  context only; none are inserted into the Random Forest inputs.
- The Expert Advisor map auto-fill calls the authenticated local soil and
  climate lookup routes. It does not call weather or reverse-geocoding
  providers. Map imagery itself still uses online tile providers.
- Install the optional climate context dataset explicitly, from the project
  root, with `python scripts/prepare_climate_data.py`. The installer fetches
  NASA POWER regional monthly data for 1991–2020, saves resumable per-parameter
  downloads under `backend/data/climate/downloads/`, and creates
  `backend/data/climate/nasa_power_monthly_normals_1991_2020.json`. No data is
  downloaded at application startup or during normal local lookup. The NASA
  POWER meteorological grid has 0.5° latitude × 0.625° longitude spacing
  (roughly 55–69 km in this region); matching is limited to 50 km and the
  selected grid-cell distance is displayed. The source provides monthly mean
  2 m temperature, monthly mean relative humidity, and monthly precipitation
  accumulation computed from its monthly mean daily precipitation rate.
  NASA Earth science data are shared under its full-and-open data policy;
  cite NASA POWER and GMAO MERRA-2, and do not imply NASA endorsement.
  The installer records dataset provenance, retrieval time, source parameter
  hashes, units, reference period, and geographic coverage.
- `GET /location-data?latitude=...&longitude=...` (published as
  `/api/location-data` on Vercel) independently returns the local soil result
  and current Open-Meteo model weather context, plus an optional nearby place
  label from OpenStreetMap Nominatim. A provider failure for one source does
  not discard the other source's result. The authenticated backend sends the
  selected coordinates to these public providers; no API key is needed.
  Open-Meteo responses are cached for five minutes by rounded coordinates;
  successful place labels are cached for 30 days and requests to Nominatim
  are rate-limited to at most one per second per backend process. Open-Meteo
  API data are CC BY 4.0 and require the attribution shown with displayed
  weather. Place names link to the OpenStreetMap copyright page and include
  © OpenStreetMap contributors attribution; the provider name links to
  Nominatim. Nominatim has a public-use policy
  and limited capacity; use a suitable hosted geocoder for higher-volume
  deployments. Place labels are geographic context, not soil or model data.
  Open-Meteo's free API is limited to non-commercial use and published request
  limits; use an appropriate commercial plan if this app is operated
  commercially.
- `GET /health`, `/model/metrics`, `/model/features`, `/model/importance`,
  `/crops`, and `/history`; `DELETE /history` clears saved history.
- The Expert Advisor map uses map clicks or browser geolocation to select
  coordinates locally. A place name can be entered manually; there is no
  reverse-geocoding request in its auto-fill flow. A valid local SoilGrids pH
  estimate may fill `ph`. Total nitrogen is not compatible with the model's
  N input, and no compatible local N/P/K soil dataset is installed, so those
  fields remain manual. NASA POWER historical monthly climate normals can be
  installed and displayed as context, but temperature, humidity, and rainfall
  remain manual model inputs because the training CSV does not document their
  periods or aggregation. The older authenticated `/location-data` route is
  separate from this flow and still calls its documented live providers.
  This does not make the entire application offline: Supabase authentication,
  the online map basemap, and the separate Field Toolkit forecast still use
  network services. The local dataset lookup itself makes no outbound
  data-provider calls.
  The local soil response reports N, P, and K availability separately and
  refuses to use candidate nutrient measurements unless their definitions and
  units can be matched to the model. The installed CSV matches the ICFA
  Figshare dataset (DOI `10.6084/m9.figshare.26308696.v2`), whose metadata only
  defines N/P/K as nutrient-content ratios; it does not specify units,
  chemical/extraction form, depth, or locations. No compatible open
  georeferenced N/P/K data source with verified reuse terms was found. No NPK
  installer is provided; the existing SoilGrids setup script installs pH and
  total nitrogen only. Generate the local grid-coverage report with
  `python -m scripts.report_npk_coverage --output backend/data/soil/npk_coverage_report.json`.
  The SoilGrids pH mapped estimate may fill `ph`; total soil nitrogen is displayed
  as context only in the backend lookup and is not validated as equivalent to
  the model's N feature. The two SoilGrids extracts can be recreated during
  development with `python scripts/prepare_geospatial_data.py`; map lookups
  never download data. The Farmer Guide retains
  the chosen coordinates and can show the locally available soil values.
  Expert pages for overview, measured prediction, results, analytics, history,
  field toolkit, and project information remain available. The farmer guide
  provides a Tamil-first six-step flow, English switch, Tamil Nadu district
  selection, soil/water/reported-weather/goal choices, tailored safe actions, and browser
  speech playback where supported. After the six questions, farmers choose
  either Quick Farmer Guidance or AI Crop Recommendation. Quick Guidance is
  general situation advice only and never claims a model-backed crop.
- The Easy Farmer Guide provides a Tamil-first crop recommendation form with
  optional structured district, soil, water, issue, goal, season, and month
  fields plus an English/Tamil "Describe your farm" input. `POST
  /farmer-guide/crop-recommendations` normalizes supported facts, preserves
  explicit selections, asks for confirmation on conflicts, and compares crops
  using only the TNAU crop water-requirement and duration table in
  `backend/data/farmer_crop_rules.json`. Its typed response uses `status` values
  `relative_advisory`, `clarification_required`, `insufficient_data`, and
  `unsupported_request`; request validation and engine failures use
  `{status: "error", code, message, errors}`. A relative ranking is advisory,
  not a suitability score, Random Forest prediction, or probability of success.
  District/soil compatibility, seasonal sowing windows, waterlogging tolerance,
  prices, yields, and profits are not installed and are not inferred. Flood or
  waterlogging risk withholds crop ranking. No LLM API key is required; the
  feature uses a deterministic local parser and rule fallback.
- AI Crop Recommendation requires all seven measured Random Forest inputs:
  `N`, `P`, `K`, `temperature`, `humidity`, `ph`, and `rainfall`. The farmer
  form displays ranges and example values derived from the existing training
  CSV; examples are explicitly not the farmer's own measurements. No values
  are inferred from district, soil selection, water availability, or reported
  conditions. Optional map estimates are labeled and editable; verify them
  before use. Numeric values are sent as entered; the application performs no
  unit conversion, so farmers should confirm that report units match the model
  inputs. The measured-input request uses the same shared recommendation
  service as the Expert Advisor and returns the same model result for identical
  inputs. Non-model Expert fields and farmer selections are saved as contextual
  information only.
- The field toolkit includes what-if sliders with probability score bars,
  optional numeric voice entry where browser speech recognition is supported,
  an interactive satellite map for marking a forecast location or opting in to
  browser geolocation, a seven-day Open-Meteo forecast, a user-assumption
  revenue scenario, broad companion-crop ideas, a sourced duration reference,
  and browser print-to-PDF. Marked coordinates are sent to Open-Meteo only when
  the user requests a forecast; browser geolocation is optional. Current
  weather is not a long-term climate or annual rainfall substitute.

The held-out test accuracy (99.32%) is read from `metrics.json`; it is never
hard-coded in the frontend and applies to the saved model's held-out evaluation,
not guaranteed field accuracy. The classifier was selected using validation
macro F1 (accuracy as the tie-breaker); the separate held-out test split is used
for final reporting.
Recommendations are dataset-based and are not a guarantee of yield or a
substitute for local agronomic advice.

## Current limitations

- There is no live market-price service or yield-prediction model. The toolkit's
  price, yield, area, and cost fields are user-provided scenario assumptions.
- The installed SoilGrids regional extract is a 250 m mapped prediction, not a
  field test; its pH is the only soil model input currently autofilled.
  Coverage is a WGS84 bounding rectangle (76–81°E, 8–14°N), includes areas
  outside Tamil Nadu, and contains unavailable pixels. Compatible N/P/K
  fertilizer measurements remain unavailable and must be entered manually.
  Historical climate normals are approximate gridded context, not field or
  current weather observations and not compatible with undocumented model
  feature periods. See `backend/data/soil/README.md`.
- The crop CSV contains no images, disease labels, sowing dates, or location
  labels. It cannot train an image-diagnosis model or support region-specific
  sowing calendars.
- The simple farmer crop ranking uses the TNAU water-requirement table as a
  relative comparison. Its water classes are tertiles within that table, not
  universal water thresholds; its totals and durations are not district-
  specific field measurements. Source publication update dates are not
  available in the installed reference. Yield, profit, pest resistance, and
  local seasonal suitability are not predicted. A profit or investment goal is
  recorded but not scored without verified local cost, yield, and price data.
- Companion-crop suggestions are broad educational ideas, not validated crop
  compatibility recommendations for a specific location or variety.
- Quick Farmer Guidance works without measurements but does not provide a
  model-backed crop prediction.
- AI Crop Recommendation requires all seven measured inputs to the existing
  Random Forest. Missing values are not guessed or silently filled.
- The saved model and its held-out test accuracy remain unchanged by normal
  application startup and use.

## Re-run training (optional)

The existing model is already trained. To intentionally rebuild the artifact
from the supplied CSV, run
`python train.py --dataset datasets/Crop_recommendation.csv --output-dir models`.
It compares five classifiers,
selects using validation macro F1 (accuracy breaks ties), and writes model and
metrics files into `models/`. The application itself never invokes this script.
#   U l a v u r a i 
 
 