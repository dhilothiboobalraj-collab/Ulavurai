# Local geospatial soil data

This directory contains a regional extract of the genuine, documented
**ISRIC SoilGrids 2.0** global soil-property prediction dataset:

- `soilgrids_ph_0-5cm_mean_tamil-nadu-extent.tif`
- `soilgrids_nitrogen_0-5cm_mean_tamil-nadu-extent.tif`
- `soilgrids_metadata.json`

The rasters were downloaded during development from the ISRIC SoilGrids WCS
service. Their requested WGS84 extent is 76–81°E, 8–14°N. This covers much of
Tamil Nadu and adjacent areas; it is a rectangle, not an administrative state
clip. Locations outside the raster extent and NoData pixels return no values.
The application transforms the selected WGS84 coordinate into each raster's
own CRS and samples only the containing pixel; it never substitutes a nearby
pixel.

## Provenance and limitations

Source: ISRIC World Soil Information, SoilGrids 2.0.

Citation: Poggio, L., de Sousa, L. M., Batjes, N. H., Heuvelink, G. B. M.,
Kempen, B., Ribeiro, E., and Rossiter, D. (2021). “SoilGrids 2.0: producing
soil information for the globe with quantified spatial uncertainty.” *SOIL*,
7, 217–240. <https://doi.org/10.5194/soil-7-217-2021>.

License: Creative Commons Attribution 4.0 International (CC BY 4.0). The
global product is mapped prediction data at a nominal 250 m resolution, not a
field sample. The WCS exports have an output pixel size of approximately
295.42 × 266.00 m in their projected raster grid. The source layer is the
0–5 cm mean-depth interval. The pH layer is encoded as pH × 10 and is divided by
10 when read. The nitrogen layer is in cg/kg.

The WCS GeoTIFFs do not carry a NoData tag. Zero-valued pixels are treated as
unavailable, never as measurements. Per-property metadata, units, and these
limitations are also recorded in `soilgrids_metadata.json`.

The files can be recreated during development (this is not run by the app at
runtime) with Python and the project's installed Rasterio dependency:

```powershell
python scripts/prepare_geospatial_data.py
```

The script downloads the two documented SoilGrids 2.0 coverages from the
public ISRIC WCS endpoint without an API key, verifies the expected GeoTIFF
grid/CRS/resolution, and replaces the local extracts only after both files
have downloaded and passed validation. The regional output is approximately
5 MB total. Runtime map lookups continue to use only these local files.

### Supported model inputs

- **pH:** a SoilGrids mapped estimate is supplied as the `ph` model input when
  the selected pixel has a valid value. It is visibly labeled as an estimate;
  it is not represented as a field measurement and should be checked against a
  soil test.
- **N, P, and K:** remain manual model inputs. The training CSV and saved model
  document feature names but not nutrient chemical forms, extraction methods,
  or units. A local sample file's own unit label is not sufficient to establish
  compatibility. SoilGrids total nitrogen is contextual information in cg/kg,
  not a validated equivalent of model N; the installed SoilGrids extract has no
  phosphorus or potassium layers. No compatible, geographically matched,
  openly downloadable N/P/K dataset with documented measurement definitions
  and reuse terms was identified for this installation.
- **Temperature, humidity, and rainfall:** the soil rasters do not provide
  weather properties. An optional NASA POWER historical monthly climate
  dataset is installed separately under `backend/data/climate/`; its values
  are displayed as context only and are not prediction inputs. Its historical
  period and aggregation are not known to match the training CSV.

No N/P/K values are inferred from organic carbon, cation-exchange capacity,
district, soil type, satellite imagery, or crop-training rows. The crop model,
its training CSV, and its feature order remain unchanged.

## Runtime and adding data

The authenticated `POST /geospatial/soil-lookup` endpoint reads local raster
files only; it makes no external soil or weather requests. Raster bands are
cached in memory and reloaded when the files change. If a raster or its
metadata is missing or unreadable, the endpoint reports a dataset error rather
than manufacturing a value. The authenticated
`GET /geospatial/climate-lookup` endpoint likewise reads the optional local
climate file only. The Expert Advisor requests both local endpoints and keeps
historical climate context separate from the model feature vector.

The separate authenticated `GET /location-data` endpoint also requests current
gridded weather context from Open-Meteo and a place name from Nominatim. It is
not used by the Expert Advisor's local auto-fill flow. See the root README for
the endpoint's provider attribution and use conditions.

The WCS preparation request is reproducible for this fixed extent and grid;
the ISRIC service can change or become unavailable. Compare the metadata and
license before redistributing an updated extract.

The soil service can read an optional georeferenced point CSV named
`soil_samples.csv` with matching `metadata.json`. These files must document
coordinates, source, citation, license, units, depth, missing-value markers,
resolution, and a scientifically justified maximum sample-match distance.
Such records may supply pH, but N/P/K columns are reported only as
unavailable/incompatible status metadata and are never copied into model inputs:
the model feature definitions and units are not documented well enough to
validate them. The training CSV is not a soil dataset; it has no coordinates or
documented nutrient units. No N/P/K download installer is provided because
there is currently no verified compatible source to install. The existing
`scripts/prepare_geospatial_data.py` remains the reproducible installer for the
documented SoilGrids pH and total-nitrogen rasters.

### N/P/K source investigation

The public Tamil Nadu AGRISNET landing page
(<https://www.tnagrisnet.tn.gov.in/>) was reachable during the 2026-10-27
review, but no downloadable georeferenced soil file or underlying-data license
was verified there. The user-named Tamil Mannvalam source likewise yielded no
verifiable public download, nutrient schema, measurement method, or reuse
terms during this review. This does not establish that the department has no
records; the data owner would need to provide an authorized file and metadata
before installation or use.

The official [NRSC soils applications page](https://www.nrsc.gov.in/nrscnew/Apps_Soils_Apps.php)
describes the Soil Health Card portal/mobile application, geo-registration of
samples, and district-level nutrient-status maps. The reviewed public page does
not offer a downloadable georeferenced point-sample file or state a license,
sample dates/depths, laboratory methods, units, or missing-value encoding for
such a file. Bhuvan map products or district-level nutrient categories are not
treated as field measurements.

The [Soil Health Card portal](https://soilhealth.dac.gov.in/) landing page is a
web application, not a documented open data download. No unrestricted point
dataset, downloadable schema, or reuse license could be verified from the
public landing page. This is not a claim that the government holds no such
records; access and reuse terms would need confirmation from the data owner.

The FAO [GSNmap project page](https://www.fao.org/global-soil-partnership/soil-data/global-soil-nutrient-map-gsnmap/en/)
describes map development and later nutrient-budget analysis, but the reviewed
page does not expose a downloadable data file or data license, or specify an
Indian layer's resolution, depth, date, analyte form, or units. The [technical
manual](https://fao-sid.github.io/GSNmap-TM/) is CC BY-NC-SA 3.0 IGO, which is
not evidence of the underlying map data's license. No FAO layer is installed
or used for autofill.

The [Bhuvan terms](https://bhuvan.nrsc.gov.in/terms.php) say map/image content
is for viewing and restrict copying, redistribution, or bulk downloads absent
prior written authorization. The reviewed [NRSC soils applications
page](https://www.nrsc.gov.in/nrscnew/Apps_Soils_Apps.php) describes
Soil-Health-Card-derived district nutrient maps and geo-registered sample
workflows, but does not publish an authorized point-data download or its
measurement metadata. We do not scrape or bulk-download Bhuvan content.

The installed 2,200-row training CSV has MD5
`5e743dd4cf9f84d23a904cd51c9b5b8`, matching the file attached to the public
[ICFA Crop Recommendation dataset v2 on Figshare](https://figshare.com/articles/dataset/Crop_Recommendation_dataset/26308696)
(DOI `10.6084/m9.figshare.26308696.v2`, CC BY 4.0). Its source metadata defines
N as “ratio of Nitrogen content in soil,” P as “ratio of Phosphorous content
in soil,” and K as “ratio of Potassium content in soil.” The source says the
dataset was assembled from Indian rainfall, climate, and fertilizer data. It
does not define the ratio's units, available-versus-total chemical/extraction
form, depth, sampling methods, or geospatial provenance; the CSV itself has no
coordinates. The training code sends these fields directly to the classifier
without unit or nutrient-form conversion.

The explicit `NUTRIENT_COMPATIBILITY` configuration in
`backend/services/local_soil_lookup.py` records these source definitions and
DOI, but leaves units unknown and source eligibility false. It therefore
rejects all soil source values for model N/P/K. Changing that gate requires
authoritative source documentation and local data with matching field
definitions; a numeric range or matching column label is not sufficient.

Run the installed-data coverage report with:

```powershell
python -m scripts.report_npk_coverage --output backend/data/soil/npk_coverage_report.json
```

The report counts installed soil raster cells and records compatible
model-input coverage as zero for N, P, and K. It also reports installed NASA
POWER climate-grid bounds, resolution, reference period, and per-variable
valid-cell counts. These grid counts are not a count or percentage of all map
locations or farms; points beyond the documented nearest-cell match distance
have no climate lookup. There are no independent georeferenced soil-test
locations installed, so geographic error metrics and sample-date coverage
cannot be measured. No synthetic data are used in this report.

Automated tests use temporary synthetic rasters and CSVs only. They are not
production measurements.
