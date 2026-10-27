# Production deployment on Vercel

This repository can serve the React/Vite frontend and FastAPI backend from one
Vercel project. The root [app.py](./app.py) exports the FastAPI application,
mounts the built frontend through FastAPI's Vercel-aware `app.frontend()`
integration, and preserves the SPA fallback. On Vercel, [backend/main.py](./backend/main.py)
registers API routes under `/api`; the browser calls the same-origin `/api`
path. No Docker or WSL is required.

No hosting project, environment variable, database record, or Supabase setting
is changed by these repository changes. Complete the Vercel and Supabase
dashboard steps manually.

## Audit findings and deployment status

- The previous root Vercel configuration built only `frontend/dist` and
  rewrote every URL—including `/api/...`—to `index.html`. That prevented the
  FastAPI routes from serving the API.
- The production frontend defaulted to `/api`, but its URL check rejected all
  relative URLs. The app now allows the intended same-origin `/api` value and
  still rejects insecure or local absolute production API URLs.
- Vercel's `VERCEL=1` environment variable selects `/api` route prefixes.
  Vercel sets this value automatically; do not define it yourself.
- The existing root [app.py](./app.py) is a supported FastAPI entrypoint and
  uses `app.frontend()` for static files and client-side routes. The Vite
  build remains a separate build step in the same Vercel project.
- The redundant `api/index.py` wrapper was removed so Vercel uses the combined
  root FastAPI entrypoint rather than discovering a second API function.
- Backend auth reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` and fails
  closed if either is missing. The frontend separately reads the
  `VITE_SUPABASE_*` variables.
- Production history requires PostgreSQL. SQLite is local-only and is not
  durable or writable storage for Vercel Functions.

The project is prepared for this setup, but no Vercel deployment or live
Supabase/database check has been performed.

## Vercel project settings

Import the repository into Vercel and use:

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (`.`); do not select `frontend` |
| Framework Preset | **FastAPI** |
| Install Command | `npm --prefix frontend ci` |
| Build Command | `npm --prefix frontend run build` |
| Output Directory | Leave unset/default. FastAPI `app.frontend()` promotes `frontend/dist` to the CDN. |
| Python version | **3.12**, from root `.python-version` |

These commands and function settings are checked into [vercel.json](./vercel.json).
Do not add an SPA rewrite that routes `/api/*` to `index.html`.
Vercel installs Python dependencies from the root `requirements.txt`, which
includes the fully pinned `requirements.lock.txt` dependency closure.

The FastAPI application is deployed as one Vercel Function. Its maximum
duration is configured to 60 seconds because weather/geocoding provider calls
can take several seconds. The selected Vercel plan must permit this duration.
Function memory is controlled by Vercel's project settings when Fluid Compute
is enabled; monitor cold starts and memory after deployment and increase the
setting if the account plan permits. As a starting point, choose 2 GB where
available; this is a conservative deployment recommendation, not a measured
minimum for the Linux Vercel runtime.

## Environment variables

Set the following in Vercel **Project Settings → Environment Variables**.
Never put server-only values into a `VITE_*` variable.

| Variable | Scope | Requirement | Value |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Backend/server | Required | Supabase project URL, e.g. `https://YOUR_PROJECT_ID.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Backend/server | Required | Supabase publishable key (legacy anon/public key also works); not a service-role or secret key |
| `DATABASE_URL` | Backend/server | Required | PostgreSQL connection URL for prediction history |
| `APP_ENV` | Backend/server | Recommended | `production`; Vercel's `VERCEL=1` also enables production validation |
| `VITE_SUPABASE_URL` | Frontend/build | Required for sign-in | Same Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend/build | Required for sign-in | Same publishable/public key |
| `VITE_API_BASE_URL` | Frontend/build | Recommended | `/api` (same Vercel origin; works for Production and Preview; this is also the production default) |
| `VITE_APP_ORIGIN` | Frontend/build | Recommended | Stable production site origin, e.g. `https://YOUR_PROJECT.vercel.app`, no path |

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are the exact backend variables
used by [backend/auth.py](./backend/auth.py) to validate bearer tokens against
the Supabase Auth user endpoint. The frontend's `VITE_` variables do not
configure backend authentication. The `SUPABASE_JWKS_URL` key, if present in
an old local environment, is not read by the current authentication code.

Obtain `SUPABASE_URL` and the publishable key from the Supabase project's API
settings. Obtain `DATABASE_URL` from that project's database connection
settings; use the provider's recommended pooled connection string for
serverless clients and ensure its SSL requirements are retained. The app
connects to PostgreSQL using `psycopg`; it does not use Supabase's REST database
API. Never expose the database URL, a service-role key, or any secret key to
the browser.

The `VITE_*` values are embedded at frontend build time. Set them for each
Vercel environment and redeploy after changing them. Do not copy secret values
into `.env.example`, source files, screenshots, logs, or this guide.

### Fixing “Backend Supabase authentication is not configured”

This response is generated when a protected API request has a bearer token
but either backend variable `SUPABASE_URL` or
`SUPABASE_PUBLISHABLE_KEY` is empty. Vercel startup validation also checks
these settings (and `DATABASE_URL`), so missing values may instead prevent the
function from starting. Add both Supabase variables to Vercel as server-side
environment variables, then redeploy. Do not disable auth or substitute a
service-role/secret key.

## Supabase redirect configuration

In Supabase **Authentication → URL Configuration**, set the Site URL to the
stable production Vercel origin. Add its allowed redirect URL for
`/reset-password`; add a custom-domain URL if the app will use one. Keep local
development redirects only if they are still needed. These are manual steps;
the repository does not change Supabase configuration.

## Runtime assets, dependencies, and constraints

The root `requirements.txt` includes the fully pinned
`requirements.lock.txt` dependency closure. The supported runtime is Python
**3.12**, which Vercel's Python runtime supports and which is declared
in `.python-version` and `backend/pyproject.toml`. The saved model must continue
to use the pinned `scikit-learn==1.9.1` and compatible NumPy version; changing
those versions requires an explicit model-load and prediction test.

The Vercel function explicitly includes the runtime assets used by the
predictor and local lookups:

- `models/crop_recommendation.joblib` (about 10.52 MB)
- `models/metrics.json`
- `datasets/Crop_recommendation.csv` (about 0.14 MB)
- `backend/data/**` (about 8 MB, including soil rasters and climate JSON)
- `frontend/dist/**` for the FastAPI SPA fallback

The listed local Windows `site-packages` directories for NumPy, SciPy, pandas,
scikit-learn, rasterio, and the main runtime dependencies total roughly
300 MB. This is only an estimate: Vercel builds Linux wheels, so the final
uncompressed function size must be confirmed by the Vercel build. Vercel's
documented standard FastAPI bundle limit is 500 MB. The source assets are
small relative to that limit, but rasterio/GDAL and the scientific Python
stack account for most of the package bundle.

The model, metrics, CSV, and geospatial files are loaded from paths relative
to the source tree. Model and data loading is cached in the FastAPI process:
it happens on each new serverless instance/cold start, not on every request.
Vercel may start more instances under load, so cold-start time and memory are
not the same as the local Windows measurements. No online Vercel bundle,
Linux Python 3.12 install, or live function memory measurement has been
verified here.

The function must use an external PostgreSQL database for history. Vercel's
function filesystem must not be used for persistent history. Local soil and
climate files are read-only and are bundled with the function; no local
persistent disk is required. NASA POWER, Open-Meteo, and Nominatim lookups are
request-time network operations with existing client timeouts and process-local
caches. External provider latency can still approach or exceed browser
timeouts.

On each new function instance, the current FastAPI lifespan calls
`database.initialize()`, which creates the history tables and adds missing
columns. Before the first live invocation, review that schema behavior and
back up an existing database; do not connect an existing production database
until that is acceptable.

## Local verification

Run these commands from the repository root in PowerShell:

```powershell
python -m pip install -r requirements-dev.lock.txt
python -m pytest -q
Set-Location frontend
npm ci
npm test
npm run build
```

For a local API server, set backend Supabase variables in the ignored root
`.env`, then run:

```powershell
Set-Location ..
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

In local Vite development, `VITE_API_BASE_URL` can be omitted to use
`http://localhost:8000`. Local API routes have no `/api` prefix.

## Manual deployment and checks

1. Import the repository into Vercel with repository root as the project root.
   Apply the settings in the table above. Do not select `frontend` as the root.
2. Add all backend and frontend variables from the environment table to the
   correct Vercel Production environment. Configure Preview values separately
   if using preview deployments; keep Preview database access appropriately
   isolated.
3. Configure Supabase Site URL and allowed password-reset redirect URLs
   manually as described above.
4. Trigger a Vercel deployment and review the build log for the Python 3.12
   runtime, dependency installation, static frontend build, function bundle
   size, and successful function packaging.
5. Verify the public health endpoint:

   ```text
   https://YOUR_PROJECT.vercel.app/api/health
   ```

   Expect HTTP 200 with `status: "ok"` and `model_loaded: true`.
6. Verify `/api/docs` or `/api/openapi.json`, then sign in and test a
   prediction, prediction history, map soil/climate autofill, and an SPA route
   such as `/reset-password`.
7. Check Vercel runtime logs and function metrics for cold starts, memory
   pressure, request duration, and provider timeouts. Verify authenticated
   history writes in the configured PostgreSQL database.

These checks must be performed after you manually deploy. Passing local tests
does not prove that the Vercel bundle or live Supabase/PostgreSQL credentials
work.

## Known limitations

- Vercel builds and runs Python on Linux; the current local Python test
  environment is Windows and Python 3.14.2. Python 3.12/Linux package and
  rasterio/GDAL compatibility still needs confirmation in Vercel's build log.
- The Python dependency footprint is close enough to warrant checking the
  actual final uncompressed function bundle against the documented 500 MB
  limit.
- Model and raster files load on cold starts; very low function memory or
  repeated cold starts can affect response time.
- History depends on valid PostgreSQL connectivity and Supabase bearer-token
  validation. No live database or authentication test was performed.
- Current-weather and reverse-geocoding provider availability, latency, and
  usage limits remain external service constraints.

## Official Vercel references

- [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi)
- [Python runtime and supported versions](https://vercel.com/docs/functions/runtimes/python)
- [Function size and duration limits](https://vercel.com/docs/functions/limitations)
