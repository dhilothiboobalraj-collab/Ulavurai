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

## Runtime and model compatibility

The normalized JSON file is read locally. The installer needs internet access
only when downloading or refreshing this dataset; application startup, the
Expert Advisor, and coordinate lookups do not call NASA POWER or any other
weather provider. The checked-in regional file is ready to use offline.

The Expert Advisor can fill temperature, humidity, and rainfall with the
selected location's normal for the selected calendar month. The values come
from the nearest installed grid cell within the documented 50 km matching
limit. They are 1991–2020 historical monthly normals, not live conditions,
field measurements, or a forecast. Rainfall is monthly accumulation in
mm/month.

The `Crop_recommendation.csv` training data do not identify the weather
observation dates, periods, or aggregations. Consequently, these local climate
normals are estimates for convenient form completion, not verified
measurement-equivalent model inputs. The form labels them as historical
estimates and requires the user to review and acknowledge them before
prediction. Field measurements or a validated model-compatible weather source
are preferable for agronomic decisions.

This dataset supplies no plant-available nitrogen, phosphorus, or potassium.
The installed SoilGrids total-nitrogen layer is not treated as model N.
SoilGrids pH remains a mapped estimate and is only populated when its selected
raster cell is valid.

The map uses a local interactive latitude/longitude grid rather than a map
image or online tile service. Geolocation is optional and may require HTTPS or
localhost; manual coordinate selection and entry do not require permission.
The application still uses its existing Supabase authentication and configured
database, which remain separate service requirements.
