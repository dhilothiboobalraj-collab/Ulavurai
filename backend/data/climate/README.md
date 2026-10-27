# Local climate context dataset

The optional installed file `nasa_power_monthly_normals_1991_2020.json` is a
regional extraction of NASA POWER historical meteorological data. It is
generated only when the explicit setup command is run:

```powershell
python scripts/prepare_climate_data.py
```

The installer needs internet access to NASA POWER while it runs. The
application does not download or refresh data at startup or during a map
lookup. Completed parameter downloads are cached under `downloads/`, so
rerunning the installer reuses completed requests and retries only missing
ones. NASA POWER does not provide a separate checksum for these generated
regional responses; the installer records local SHA-256 digests for integrity
checks and provenance.

## Source, licence, and coverage

- **Dataset:** NASA POWER monthly meteorological regional service; source
  meteorology from GMAO MERRA-2.
- **Source:** <https://power.larc.nasa.gov/> and
  <https://power.larc.nasa.gov/docs/methodology/data/sources/>.
- **Reference period:** 1991–2020.
- **Retrieval date:** recorded in the installed JSON manifest.
- **License/data policy:** NASA Earth science data are shared under NASA's
  full-and-open data policy. Cite NASA POWER and GMAO MERRA-2; do not imply
  NASA endorsement. See
  <https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-information-guidance>.
- **Requested geographic bounds:** 75.5–82.5°E, 7.5–14.5°N (WGS84).
- **Installed coverage:** 180 POWER grid cells, 75.625–82.5°E and
  7.5–14.5°N. This rectangle covers much of Tamil Nadu and neighboring areas;
  it is not an administrative boundary.
- **Native grid spacing:** 0.5° latitude × 0.625° longitude, approximately
  55 km × 68 km at these latitudes. The service reports grid-cell centers.
  Lookup uses the nearest installed center only when it is within 50 km and
  reports the cell coordinates and actual point-to-cell distance. It does not
  interpolate or silently select a more distant cell.
- **Disk usage at installation:** approximately 0.42 MB for the normalized
  lookup file and 3.14 MB for the three cached source responses (about
  3.4 MB total). Actual sizes are recorded by the operating system.

## Variables and aggregation

The installer makes separate NASA POWER regional monthly requests for:

| NASA POWER parameter | Local value | Unit and meaning |
|---|---|---|
| `T2M` | `temperature_c` | °C, monthly mean 2 m air temperature |
| `RH2M` | `relative_humidity_pct` | %, monthly mean 2 m relative humidity |
| `PRECTOTCORR` | `precipitation_mm_month` | mm/month, mean monthly accumulation |

For rainfall, the NASA monthly regional response provides a mean daily
precipitation rate in mm/day. The installer multiplies each year's monthly
rate by the number of calendar days in that month, then averages those
monthly accumulations over 1991–2020. February therefore accounts for leap
years. Temperature and relative humidity are averaged across the corresponding
calendar month in the 30-year period. Incomplete values are kept unavailable;
the installer requires at least 27 valid years for a month's value.

## Model compatibility

The `Crop_recommendation.csv` training data do not identify their weather
observation dates, periods, or aggregations. The NASA monthly normals therefore
are **historical climate context only**: they are never inserted into the
Random Forest inputs. The map form displays all twelve monthly normals,
reference period, source, retrieval date, resolution, and selected grid-cell
distance. Temperature, humidity, and rainfall prediction fields remain
editable and require manual values with compatible semantics.

This dataset supplies no plant-available nitrogen, phosphorus, or potassium.
The installed SoilGrids total-nitrogen layer is not treated as model N.
SoilGrids pH remains a mapped estimate and is only populated when its selected
raster cell is valid.

The local lookup service reads this JSON file only. It makes no weather API,
geocoding, or other data-provider request. The application still uses its
existing Supabase authentication, and the map basemap and separate Field
Toolkit forecast may use internet services.

## Recent daily weather preview

The authenticated `POST /geospatial/local-lookup` map flow also requests
recent daily values from the NASA POWER Daily Point API
(<https://power.larc.nasa.gov/docs/services/api/temporal/daily/>). It requests
`T2M` (2 m air temperature, °C), `RH2M` (2 m relative humidity, %), and
`PRECTOTCORR` (corrected precipitation, mm/day) for the Agroclimatology
community, in UTC, over the previous 60 complete days. The lookup uses the
latest valid returned day for each property, excludes NASA fill values, and
shows each observation date and its age at retrieval. Availability delay varies;
the application does not assume a fixed delay or label these data as current
station observations.

The backend caches successful parsed responses in process memory for six hours
using coordinates rounded to 0.01° and the requested date range as the key. It
allows at most 256 entries and uses a 10-second provider timeout. A provider
failure is reported independently, so it does not hide installed soil or
historical climate results. NASA POWER/MERRA-2 values are gridded
model/reanalysis estimates, not direct field measurements.

Recent daily values may be previewed in the three climate form fields, but
they are not sent to the Random Forest while still map-filled. The form blocks
prediction until the user replaces those values because the training dataset
does not document the weather feature periods or aggregations. The
1991–2020 monthly normals above remain separate context and are never
substituted for the recent daily values or prediction inputs.
