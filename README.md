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

For local development, copy the root `.env.example` to `.env` and set
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; FastAPI loads this file at
startup. Copy the frontend template to `frontend/.env.local`; Vite loads that
file automatically. Never put a Supabase secret/service-role key in either
file. These local environment files are ignored by Git.

The backend validates bearer tokens using the Supabase Auth user endpoint and
the publishable key. `SUPABASE_JWKS_URL` can be set for deployments that use
JWT/JWKS verification; the current backend does not read that setting.

To set backend values directly in PowerShell instead of using `.env`:

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

Deploy the Vite frontend and FastAPI backend together from the repository root
on Vercel. The root `vercel.json` builds `frontend/` as a static site and
`api/index.py` as a Python function; `/api/*` requests are routed to the
existing FastAPI application in `backend/main.py`. Its existing routers keep
the authenticated predictions, farmer guidance, model information, and
user-specific history endpoints. The model, metadata, and dataset are loaded
using paths resolved from the backend source file.

In Vercel, import the repository and keep the project root directory set to
the repository root (not `frontend/`). Use the Other framework preset if
Vercel does not detect the mixed frontend/backend project automatically.
`vercel.json` defines the frontend build and API routing.

Set these environment variables for Production, Preview, and Development as
needed:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
DATABASE_URL=YOUR_HOSTED_POSTGRESQL_CONNECTION_STRING
APP_ENV=production
```

The frontend API base defaults to `/api` in production; leave
`VITE_API_BASE_URL` unset in Vercel. Do not set it to `localhost` or a Render
URL. `DATABASE_URL` must be a hosted PostgreSQL connection string because
Vercel functions do not provide persistent local SQLite storage. Use your
database provider's serverless-compatible connection/pooler URL. Keep database
credentials server-side and never put them in `VITE_*` variables. The
Supabase publishable key is intended for the frontend; do not expose a
Supabase secret/service-role key in frontend or environment examples.

The API health endpoint and interactive documentation are available at
`/api/health` and `/api/docs`. Protected operations require a Supabase session.
After deploying, verify the health endpoint, sign-in, and authenticated
prediction/history flows in the Vercel deployment.

Existing local history in `predictions.db` is not copied automatically. To
preserve it, run the migration from the project root on a machine that can
reach the configured PostgreSQL database:

```powershell
$env:DATABASE_URL = "postgresql://<user>:<password>@<host>/<database>?sslmode=require"
python -m backend.migrate_history
```

The migration is idempotent, preserves existing record IDs and user IDs when
available, and does not modify the SQLite source file.

A root-level `Dockerfile` also packages the API, saved model, metrics, and
dataset for local Docker testing or a Docker-capable backend host. Build it
from the project root:

```powershell
docker build -t seasonsense-api .
```

For a separate production backend host, configure `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `APP_ENV=production`, `CORS_ALLOWED_ORIGINS`, and
`DATABASE_URL` in that host. `PORT` is supplied by many container hosts; the
image defaults to port 8000 when it is absent. Production CORS origins must be
explicit HTTPS origins without a path or wildcard.

The container stores history at `/data/predictions.db` by default. Attach a
persistent writable disk at `/data` to preserve history across restarts. SQLite
is appropriate only for one backend instance with persistent local storage;
use a managed database before scaling to multiple instances or using ephemeral
storage. `DATABASE_PATH` can override the SQLite file path if the host mounts
persistent storage elsewhere. Ephemeral function/container filesystems do not
provide durable history storage; hosted PostgreSQL is recommended.

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
- `POST /farmer-guide/predict` saves Tamil/English farmer-guide choices in the
  configured history database. Without the seven actual model inputs, it
  returns farmer-situation guidance and never guesses a crop. The optional
  `model_inputs` object accepts N/P/K, pH, temperature, humidity, and rainfall;
  when supplied, it uses the existing Random Forest model and returns the
  model-ranked top three and their probabilities.
- `GET /health`, `/model/metrics`, `/model/features`, `/model/importance`,
  `/crops`, and `/history`; `DELETE /history` clears saved history.
- The interface has Expert Advisor and Easy Farmer Guide tabs. Expert pages for
  overview, measured prediction, results, analytics, history, and project
  information remain available. The farmer guide provides a Tamil-first
  six-step flow, English switch, Tamil Nadu district selection, soil/water/
  reported-weather/goal choices, tailored safe general actions, and browser
  speech playback where supported. After the six questions, farmers choose
  either Quick Farmer Guidance or AI Crop Recommendation. Quick Guidance is
  general situation advice only and never claims a model-backed crop.
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

## Re-run training (optional)

The existing model is already trained. To intentionally rebuild the artifact
from the dataset later, run `python train.py`. It compares five classifiers,
selects using validation macro F1 (accuracy breaks ties), and writes model and
metrics files into `models/`. The application itself never invokes this script.
