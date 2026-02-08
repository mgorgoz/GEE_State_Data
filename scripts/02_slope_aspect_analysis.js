/**
 * Slope & Aspect Analysis by Province - Turkey
 *
 * This script calculates slope and aspect from SRTM DEM
 * for a selected Turkish province.
 * Useful for forestry, agriculture, and terrain analysis.
 *
 * Data Source: USGS SRTM 30m
 * Author: Murat Görgöz
 * Repository: https://github.com/mgorgoz/GEE_State_Data
 */

// ==================== CONFIGURATION ====================
var PROVINCE_NAME = 'Artvin';
var EXPORT_SCALE = 30;
var EXPORT_FOLDER = 'GEE_Terrain_Exports';
// =======================================================

// Load boundaries
var gaul2 = ee.FeatureCollection('FAO/GAUL/2015/level2');
var province = gaul2
  .filter(ee.Filter.eq('ADM0_NAME', 'Turkey'))
  .filter(ee.Filter.eq('ADM2_NAME', PROVINCE_NAME));

// Load DEM and clip
var dem = ee.Image('USGS/SRTMGL1_003').select('elevation').clip(province);

// Calculate terrain products
var slope = ee.Terrain.slope(dem);
var aspect = ee.Terrain.aspect(dem);
var hillshade = ee.Terrain.hillshade(dem);

// Visualization parameters
var slopeVis = {
  min: 0,
  max: 60,
  palette: ['00ff00', 'ffff00', 'ff8800', 'ff0000']
};

var aspectVis = {
  min: 0,
  max: 360,
  palette: [
    'blue', 'cyan', 'green', 'yellow',
    'orange', 'red', 'magenta', 'blue'
  ]
};

var hillshadeVis = {min: 0, max: 255};

// Center map
Map.centerObject(province, 9);

// Add layers
Map.addLayer(hillshade, hillshadeVis, 'Hillshade');
Map.addLayer(slope, slopeVis, 'Slope (degrees)');
Map.addLayer(aspect, aspectVis, 'Aspect', false);
Map.addLayer(province.style({
  color: 'white', fillColor: '00000000', width: 2
}), {}, 'Province Boundary');

// ---- Slope Statistics ----
var slopeStats = slope.reduceRegion({
  reducer: ee.Reducer.mean()
    .combine(ee.Reducer.stdDev(), '', true)
    .combine(ee.Reducer.percentile([25, 50, 75]), '', true),
  geometry: province.geometry(),
  scale: 90,
  maxPixels: 1e10
});

print('--- Slope Statistics for ' + PROVINCE_NAME + ' ---');
print(slopeStats);

// ---- Slope Classification ----
// Classify slope into categories for forestry/land use planning
var slopeClass = ee.Image(0)
  .where(slope.gte(0).and(slope.lt(5)), 1)   // Flat
  .where(slope.gte(5).and(slope.lt(15)), 2)   // Gentle
  .where(slope.gte(15).and(slope.lt(30)), 3)  // Moderate
  .where(slope.gte(30).and(slope.lt(45)), 4)  // Steep
  .where(slope.gte(45), 5)                     // Very Steep
  .clip(province);

var classVis = {
  min: 1,
  max: 5,
  palette: ['1a9850', 'a6d96a', 'fee08b', 'f46d43', 'd73027']
};

Map.addLayer(slopeClass, classVis, 'Slope Classification', false);

// Calculate area per slope class
var areaByClass = ee.Image.pixelArea().addBands(slopeClass).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1}),
  geometry: province.geometry(),
  scale: 30,
  maxPixels: 1e10
});

print('--- Area by Slope Class (m²) ---');
print('1: Flat (0-5°), 2: Gentle (5-15°), 3: Moderate (15-30°), 4: Steep (30-45°), 5: Very Steep (>45°)');
print(areaByClass);

// ---- Export ----
Export.image.toDrive({
  image: slope,
  description: 'Slope_' + PROVINCE_NAME,
  folder: EXPORT_FOLDER,
  region: province.geometry(),
  scale: EXPORT_SCALE,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

Export.image.toDrive({
  image: aspect,
  description: 'Aspect_' + PROVINCE_NAME,
  folder: EXPORT_FOLDER,
  region: province.geometry(),
  scale: EXPORT_SCALE,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

print('Export tasks created. Go to Tasks tab to start exports.');
