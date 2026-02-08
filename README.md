# GEE State Data - Turkey Province-Level Geospatial Analysis

Google Earth Engine (GEE) scripts for downloading and analyzing geospatial data by province in Turkey. Each script is ready to use in the [GEE Code Editor](https://code.earthengine.google.com/) — just change the province name and run.

> **TR:** Türkiye il bazında DEM, arazi örtüsü, uydu görüntüsü ve yangın riski analizi için Google Earth Engine scriptleri. Her script GEE Code Editor'da doğrudan çalıştırılabilir.

---

## Scripts

| # | Script | Description | Data Source |
|---|--------|-------------|-------------|
| 01 | [DEM Export](scripts/01_dem_export_by_province.js) | Export 30m DEM for any Turkish province with elevation stats | SRTM 30m |
| 02 | [Slope & Aspect](scripts/02_slope_aspect_analysis.js) | Terrain analysis with slope classification for land use planning | SRTM 30m |
| 03 | [Land Cover](scripts/03_land_cover_analysis.js) | Land cover mapping with area statistics per class | ESA WorldCover 10m |
| 04 | [Sentinel-2 Composite](scripts/04_sentinel2_composite.js) | Cloud-free composites with NDVI and NDWI | Sentinel-2 L2A |
| 05 | [NDVI Time Series](scripts/05_ndvi_time_series.js) | Monthly NDVI charts and seasonal vegetation analysis | Sentinel-2 L2A |
| 06 | [Forest Fire Risk](scripts/06_forest_fire_risk.js) | Multi-factor fire risk assessment (NDVI + LST + Slope + Land Cover) | Multi-source |

---

## Quick Start

1. Open [Google Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Copy any script from the `scripts/` folder
3. Change `PROVINCE_NAME` to your target province (e.g., `'Istanbul'`, `'Izmir'`, `'Trabzon'`)
4. Click **Run**
5. Check the **Tasks** tab to start exports to Google Drive

```javascript
// Example: Change this line in any script
var PROVINCE_NAME = 'Ankara';  // ← Replace with your province
```

---

## Script Details

### 01 - DEM Export
Exports SRTM 30m elevation data clipped to a province boundary. Prints min/max/mean elevation statistics.

### 02 - Slope & Aspect Analysis
Calculates slope, aspect, and hillshade from DEM. Classifies slope into 5 categories (Flat → Very Steep) and reports area per class. Useful for forestry road planning and erosion assessment.

### 03 - Land Cover Analysis
Uses ESA WorldCover 10m (2021) to map land cover classes. Calculates area (hectares) per class and forest cover percentage. Supports CSV export of statistics.

### 04 - Sentinel-2 Cloud-Free Composite
Creates median composites from Sentinel-2 imagery with SCL-based cloud masking. Generates true color, false color, NDVI, and NDWI layers. Includes NDVI histogram.

### 05 - NDVI Time Series
Generates monthly NDVI time series charts for monitoring vegetation phenology. Creates seasonal composites (Spring, Summer, Autumn, Winter) and calculates seasonal change maps.

### 06 - Forest Fire Risk Assessment
Combines four risk factors with weighted scoring:
- **NDVI** (30%) — vegetation dryness
- **Land Surface Temperature** (25%) — MODIS LST
- **Slope** (20%) — terrain steepness
- **Land Cover** (25%) — fuel type classification

Outputs a continuous risk index (0–1) and classified risk map (5 levels).

---

## Data Sources

| Dataset | Resolution | Provider |
|---------|-----------|----------|
| [SRTM DEM](https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003) | 30m | NASA / USGS |
| [ESA WorldCover](https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v200) | 10m | ESA |
| [Sentinel-2 SR](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED) | 10m | Copernicus |
| [MODIS LST](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD11A2) | 1km | NASA |
| [FAO GAUL](https://developers.google.com/earth-engine/datasets/catalog/FAO_GAUL_2015_level2) | — | FAO |

---

## Requirements

- [Google Earth Engine account](https://earthengine.google.com/) (free for research & education)
- Web browser with access to [GEE Code Editor](https://code.earthengine.google.com/)

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Author

**Murat Görgöz** — Forest Engineer
[GitHub](https://github.com/mgorgoz) · [Website](https://muratgorgoz.com)
