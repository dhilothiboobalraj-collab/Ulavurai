# SeasonSense AI - Crop Recommendation Application

SeasonSense AI provides a FastAPI API and React/Vite dashboard using the
existing trained crop recommendation model. The backend loads the saved model;
it does not retrain it on startup.

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
<<<<<<< HEAD

## Authentication and deployment

The dashboard and all API operations other than `GET /health` require a
Supabase-authenticated account. Create a Supabase project, then copy its
Project URL and publishable key from **Project Settings → API** (or the API
Keys page). Never use a service-role/secret key in the browser or in these
settings. Copy `frontend/.env.example` to `frontend/.env.local` and set:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_API_BASE_URL=http://localhost:8000
```

For local development, copy the template to `frontend/.env.local`; Vite loads
that file automatically. Set the backend values in the same PowerShell window
before starting FastAPI:

```powershell
$env:SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173"
python -m uvicorn backend.main:app --reload
```

Set the following on the backend host. `SUPABASE_PUBLISHABLE_KEY` is the same
public key used by the frontend; the API validates each bearer token against
Supabase Auth and does not need a service-role key.

```text
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
APP_ENV=production
CORS_ALLOWED_ORIGINS=https://YOUR_PRODUCTION_DOMAIN
```

In Supabase **Authentication → URL Configuration**, set the Site URL to the
production frontend URL. Add the production URL and its `/**` path pattern to
the allowed Redirect URLs, and add `http://localhost:5173/**` for local
development. Enable email confirmation under the email provider settings if
you want verification links; signup displays a verification notice until the
user confirms. The auth redirect returns to the app root.

For Vercel, keep the existing project and domain, set the project root to
`frontend`, the build command to `npm run build`, and the output directory to
`dist`. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_API_BASE_URL` in the existing Vercel project's Environment Variables for
each required deployment environment, then redeploy. Deploy the FastAPI backend
to a Python-compatible host and set `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `APP_ENV=production`, and
`CORS_ALLOWED_ORIGINS` there; point
`VITE_API_BASE_URL` at that backend's HTTPS URL. The frontend rewrite in
`frontend/vercel.json` supports direct navigation and refreshes on React
Router routes. Vercel deployment and live Supabase sign-in must be verified
against your actual project credentials and hosting setup.

The FastAPI backend is separate from Vercel's frontend hosting. A root-level
`Dockerfile` packages the API, existing trained model, metrics, and dataset for
a Docker-capable Python host. Build it from the project root:

```powershell
docker build -t seasonsense-api .
```

Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `APP_ENV=production`,
`CORS_ALLOWED_ORIGINS`, and `PORT` in the backend host. `PORT` is supplied by
many container hosts; the image defaults to port 8000 when it is absent. Set
`CORS_ALLOWED_ORIGINS` to the exact HTTPS origin of the deployed frontend, with
no path or wildcard. Production startup fails if CORS origins are missing or
include `*`. Point the Vercel `VITE_API_BASE_URL` variable to the backend's
public HTTPS URL.

The container stores history at `/data/predictions.db` by default. Attach a
persistent writable disk at `/data` to preserve history across restarts. SQLite
is appropriate only for one backend instance with persistent local storage;
use a managed database before scaling to multiple instances or using ephemeral
storage. `DATABASE_PATH` can override the SQLite file path if the host mounts
persistent storage elsewhere. Vercel does not provide the backend with access
to a local SQLite file.
=======
Local history continues to use `predictions.db` unless `DATABASE_URL` is set in
the backend process environment.

## Deploy to Vercel

The repository is configured as one Vercel project. Vercel runs the existing
FastAPI application as a Python Function and serves the Vite build through
FastAPI's Vercel-compatible frontend integration. In production, API routes use
the `/api` prefix so they do not collide with React pages such as `/predict` and
`/history`; route names and behavior are otherwise preserved. Local API paths
remain unchanged. The deployed frontend calls the API on the same origin.
React routes, including
`/predict`, `/results`, `/analytics`, `/history`, `/farmer`,
`/farmer-guide`, and `/about`, fall back to the built `index.html`.

Before deployment:

1. Push the project to a Git provider and import its repository into Vercel.
   Set the Vercel project root to the repository root (not `frontend/`).
2. Create a hosted PostgreSQL database with a pooled/runtime connection URL
   (Neon or Supabase PostgreSQL, for example). Add `DATABASE_URL` in the Vercel
   project's Production environment variables. Do not put this secret in Vite
   variables or client-side files.
3. If deploying the frontend on another origin, set `CORS_ORIGINS` to the
   comma-separated exact HTTPS frontend origins. For a same-origin combined
   deployment, CORS is not needed; leaving it empty denies cross-origin browser
   access in production. Wildcard origins are rejected on Vercel.
4. Keep `VITE_API_URL` unset/empty for the combined same-origin deployment (the
   production frontend defaults to `/api`). If the frontend is deployed
   separately, set it to the HTTPS backend URL including its `/api` suffix and
   add the frontend's exact origin to `CORS_ORIGINS`.

Vercel project settings:

- Framework preset: **FastAPI** (or **Other** if the preset is not detected).
- Root directory: repository root.
- Python runtime: 3.12, selected by `.python-version`.
- Build command: use the `tool.vercel.scripts.build` command in `pyproject.toml`
  (`npm --prefix frontend ci && npm --prefix frontend run build`).
- Output directory: leave unset; `app.py` registers `frontend/dist` with the
  FastAPI frontend integration.
- Function duration: 60 seconds, configured in `vercel.json`.

`models/crop_recommendation.joblib` is intentionally included by `.gitignore`
and must be committed to the deployment repository. It is the existing
approximately 11 MB saved model, not a generated or retrained model. The
Random Forest artifact, ordered inputs (`N`, `P`, `K`, `temperature`,
`humidity`, `ph`, `rainfall`), metrics, and prediction services are unchanged.
The dataset and model metrics files are also required at runtime. Vercel's
documented standard Function bundle limit is 500 MB; this model alone is well
below that limit, but an actual Vercel build/deployment is required to verify
the complete Python dependency bundle against the account's limits.

### Preserve existing local history in PostgreSQL

The local SQLite database is not automatically copied during deployment. Before
switching production to PostgreSQL, run the idempotent migration from a machine
that can reach the hosted database, using that database's connection URL:

```powershell
$env:DATABASE_URL = "postgresql://<user>:<password>@<host>/<database>?sslmode=require"
python -m backend.migrate_history
```

The migration copies existing Expert and Easy Farmer Guide rows, preserves
their IDs, interface types, contextual fields, results, and timestamps, and
does not delete or modify `predictions.db`. Re-running it skips IDs already
present in PostgreSQL. Vercel initializes the same PostgreSQL schema on startup;
no one-off schema tool is required.

In production, the original API endpoints are available beneath `/api`
(`GET /api/health`, `POST /api/predict`, `GET /api/history`, and so on). This
prefix is required because the React application itself owns page paths such
as `/predict` and `/history`. Local development retains the original unprefixed
API paths.

### Deploy commands

After importing/linking the repository and setting the Vercel environment
variables in the dashboard:

```powershell
npm install --global vercel
vercel login
vercel link
vercel --prod
```

Deployments are not performed automatically by this repository setup. Verify
the resulting Vercel URL and `/api/health`, `/api/model/metrics`, `/docs`,
prediction, and history flows after the first production deployment.
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e

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

<<<<<<< HEAD
=======
- The API paths below are shown as used locally. On Vercel, prepend `/api`
  (for example, `POST /api/predict`) so browser routes such as `/predict` and
  `/history` remain available to React.
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
- `POST /predict` returns the model's top three probability-ranked crops,
  input-value context, dataset-relative soil/environment analysis, and
  out-of-range warnings. Optional district/location/season/farm/soil/water/
  market/objective details are saved and displayed as user-provided advisory
  context only; they are not Random Forest inputs or verified external data.
<<<<<<< HEAD
  Successful predictions are saved to `predictions.db`.
- `POST /farmer-guide/predict` saves Tamil/English farmer-guide choices in the
  same SQLite database. Without the seven actual model inputs, it returns
  farmer-situation guidance and never guesses a crop. The optional
  `model_inputs` object accepts N/P/K, pH, temperature, humidity, and rainfall;
  when supplied, it uses the existing Random Forest model and returns the
  model-ranked top three and their probabilities.
=======
  Successful predictions are saved to `predictions.db` locally, or the
  PostgreSQL database selected by `DATABASE_URL`.
- `POST /farmer-guide/predict` saves Tamil/English farmer-guide choices in the
  configured history database for the existing measured-input farmer Random
  Forest path. Its optional `model_inputs` object accepts N/P/K, pH, temperature,
  humidity, and rainfall; when supplied, it calls the shared Random Forest
  recommendation service and returns the same top three as Expert Advisor for
  identical values.
- `POST /farmer-guide/recommend` returns a separate basic farmer recommendation
  using the five answers: district, soil choice, water availability, reported
  problem, and farmer goal. Its transparent rule source is
  `backend/data/farmer_crop_rules.json`, based on TNAU's surface-irrigation
  crop water-requirement table. Water availability is scored against relative
  requirements in that table. Low-water and shorter-duration goals are scored
  only against the published table values. The weights are configurable in the
  rule file. District, soil, reported problem, profit, and safe-choice goals
  are recorded but do not affect ranking because applicable source-backed
  rules are not currently included. Rule Match Score is not AI confidence.
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
- `GET /health`, `/model/metrics`, `/model/features`, `/model/importance`,
  `/crops`, and `/history`; `DELETE /history` clears saved history.
- The interface has Expert Advisor and Easy Farmer Guide tabs. Expert pages for
  overview, measured prediction, results, analytics, history, and project
  information remain available. The farmer guide provides a Tamil-first
  six-step flow, English switch, Tamil Nadu district selection, soil/water/
  reported-weather/goal choices, tailored safe general actions, and browser
  speech playback where supported. After the six questions, farmers choose
<<<<<<< HEAD
  either Quick Farmer Guidance or AI Crop Recommendation. Quick Guidance is
  general situation advice only and never claims a model-backed crop.
=======
  either Basic Farmer Recommendation or AI Model Recommendation. The basic
  path returns a source-cited top three relative crop ranking and never claims
  to be a Random Forest prediction.
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e
- AI Crop Recommendation requires all seven measured Random Forest inputs:
  `N`, `P`, `K`, `temperature`, `humidity`, `ph`, and `rainfall`. The farmer
  form displays ranges and example values derived from the existing training
  CSV; examples are explicitly not the farmer's own measurements. No values
  are inferred from district, soil selection, water availability, or reported
  conditions. Numeric values are sent as entered; the application performs no
  unit conversion, so farmers should confirm that report units match the model
  inputs. The measured-input request uses the same shared recommendation
  service as the Expert Advisor and returns the same model result for identical
  inputs. Non-model Expert fields and farmer selections are saved as contextual
  information only.

The held-out test accuracy (99.32%) is read from `metrics.json`; it is never
hard-coded in the frontend and applies to the saved model's held-out evaluation,
not guaranteed field accuracy. The classifier was selected using validation
macro F1 (accuracy as the tie-breaker); the separate held-out test split is used
for final reporting.
Recommendations are dataset-based and are not a guarantee of yield or a
substitute for local agronomic advice.

<<<<<<< HEAD
## Current limitations

- No live weather service is integrated.
- No live market-price service is integrated. A price entered by an Expert user
  is user-provided and is not verified.
- No yield prediction model is integrated.
- No district-specific soil database or automatic soil/weather measurement
  source is integrated.
- Quick Farmer Guidance works without measurements but does not provide a
  model-backed crop prediction.
- AI Crop Recommendation requires all seven measured inputs to the existing
  Random Forest. Missing values are not guessed or silently filled.
- The saved model and its held-out test accuracy remain unchanged by normal
  application startup and use.
=======
The basic TNAU rule engine and the measured-input Random Forest are separate
methods. The Random Forest's **99.32% held-out test accuracy does not represent
the accuracy of the basic farmer recommendation engine**.

## Remaining Limitations

- No live weather service is currently integrated.
- No live market-price service is currently integrated. Any market price
  entered by an Expert user is user-provided and is not verified.
- No yield prediction model is currently integrated.
- No district-specific soil database is currently integrated.
- The Basic Farmer Recommendation works without measurements but is a
  rule-based relative ranking, not a model-backed prediction. Its available
  source currently addresses water requirement only; it does not establish
  district- or selected-soil-specific suitability, pest/disease detection,
  profit, or safety.
- AI Crop Recommendation requires all seven existing Random Forest inputs:
  `N`, `P`, `K`, `temperature`, `humidity`, `ph`, and `rainfall`. Missing values
  are never guessed or silently filled.
- The existing Random Forest remains unchanged. Its held-out test accuracy
  remains **99.32%**; this test result is not a guarantee of field performance.
>>>>>>> 1e78fbc7c314b401cd6d1fd5b4ad02bbbf8f911e

## Re-run training (optional)

The existing model is already trained. To intentionally rebuild the artifact
from the dataset later, run `python train.py`. It compares five classifiers,
selects using validation macro F1 (accuracy breaks ties), and writes model and
metrics files into `models/`. The application itself never invokes this script.
