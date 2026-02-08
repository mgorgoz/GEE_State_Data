/**
 * Sentinel-2 Cloud-Free Composite by Province - Turkey
 *
 * This script creates a cloud-free median composite from Sentinel-2
 * imagery for a selected Turkish province and time period.
 * Supports true color, false color, and NDVI visualization.
 *
 * Data Source: Copernicus Sentinel-2 Surface Reflectance (L2A)
 * Author: Murat Görgöz
 * Repository: https://github.com/mgorgoz/GEE_State_Data
 */

// ==================== CONFIGURATION ====================
var PROVINCE_NAME = 'Antalya';
var START_DATE = '2024-06-01';
var END_DATE = '2024-09-30';
var CLOUD_THRESHOLD = 20; // Max cloud cover percentage per scene
var EXPORT_SCALE = 10;
var EXPORT_FOLDER = 'GEE_Sentinel2_Exports';
// =======================================================

// Load boundaries
var gaul2 = ee.FeatureCollection('FAO/GAUL/2015/level2');
var province = gaul2
  .filter(ee.Filter.eq('ADM0_NAME', 'Turkey'))
  .filter(ee.Filter.eq('ADM2_NAME', PROVINCE_NAME));

// ---- Cloud Masking Function ----
function maskS2Clouds(image) {
  var scl = image.select('SCL');
  // Keep: vegetation(4), bare soil(5), water(6), unclassified(7)
  var mask = scl.gte(4).and(scl.lte(7));
  return image.updateMask(mask)
    .divide(10000) // Scale to reflectance
    .copyProperties(image, ['system:time_start']);
}

// ---- Load and Process Sentinel-2 ----
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(province.geometry())
  .filterDate(START_DATE, END_DATE)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_THRESHOLD))
  .map(maskS2Clouds);

print('Number of scenes:', s2.size());

// Create median composite
var composite = s2.median().clip(province);

// ---- Visualization Parameters ----
// True Color (RGB)
var trueColorVis = {
  bands: ['B4', 'B3', 'B2'],
  min: 0, max: 0.3
};

// False Color (NIR-R-G) - vegetation appears red
var falseColorVis = {
  bands: ['B8', 'B4', 'B3'],
  min: 0, max: 0.4
};

// ---- NDVI Calculation ----
var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');

var ndviVis = {
  min: -0.1, max: 0.8,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163',
    '99B718', '74A901', '66A000', '529400', '3E8601',
    '207401', '056201', '004C00', '023B01', '012E01',
    '011D01', '011301'
  ]
};

// ---- NDWI (Water Index) ----
var ndwi = composite.normalizedDifference(['B3', 'B8']).rename('NDWI');

var ndwiVis = {
  min: -0.5, max: 0.5,
  palette: ['brown', 'white', 'cyan', 'blue']
};

// Center map
Map.centerObject(province, 9);

// Add layers
Map.addLayer(composite, trueColorVis, 'True Color');
Map.addLayer(composite, falseColorVis, 'False Color (NIR)', false);
Map.addLayer(ndvi, ndviVis, 'NDVI', false);
Map.addLayer(ndwi, ndwiVis, 'NDWI', false);
Map.addLayer(province.style({
  color: 'white', fillColor: '00000000', width: 2
}), {}, 'Province Boundary');

// ---- NDVI Statistics ----
var ndviStats = ndvi.reduceRegion({
  reducer: ee.Reducer.mean()
    .combine(ee.Reducer.stdDev(), '', true)
    .combine(ee.Reducer.minMax(), '', true),
  geometry: province.geometry(),
  scale: 30,
  maxPixels: 1e10
});

print('--- NDVI Statistics for ' + PROVINCE_NAME + ' ---');
print(ndviStats);

// ---- NDVI Histogram ----
var ndviHistogram = ui.Chart.image.histogram({
  image: ndvi,
  region: province.geometry(),
  scale: 100,
  maxPixels: 1e10
}).setOptions({
  title: 'NDVI Distribution - ' + PROVINCE_NAME,
  hAxis: {title: 'NDVI'},
  vAxis: {title: 'Pixel Count'}
});
print(ndviHistogram);

// ---- Export ----
// Export True Color composite
Export.image.toDrive({
  image: composite.select(['B4', 'B3', 'B2']).toFloat(),
  description: 'Sentinel2_TrueColor_' + PROVINCE_NAME,
  folder: EXPORT_FOLDER,
  region: province.geometry(),
  scale: EXPORT_SCALE,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

// Export NDVI
Export.image.toDrive({
  image: ndvi.toFloat(),
  description: 'NDVI_' + PROVINCE_NAME,
  folder: EXPORT_FOLDER,
  region: province.geometry(),
  scale: EXPORT_SCALE,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

print('Export tasks created. Go to Tasks tab to start exports.');
