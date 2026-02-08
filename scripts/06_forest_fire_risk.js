/**
 * Forest Fire Risk Assessment by Province - Turkey
 *
 * This script creates a fire risk map by combining multiple factors:
 * - NDVI (vegetation dryness)
 * - Land Surface Temperature (LST)
 * - Slope
 * - Distance to roads
 * - Land cover type
 *
 * Data Sources: Sentinel-2, MODIS LST, SRTM, ESA WorldCover
 * Author: Murat Görgöz
 * Repository: https://github.com/mgorgoz/GEE_State_Data
 */

// ==================== CONFIGURATION ====================
var PROVINCE_NAME = 'Mugla';
var YEAR = 2024;
var SUMMER_START = YEAR + '-06-01';
var SUMMER_END = YEAR + '-09-30';
var EXPORT_FOLDER = 'GEE_FireRisk_Exports';
// =======================================================

// Load boundaries
var gaul2 = ee.FeatureCollection('FAO/GAUL/2015/level2');
var province = gaul2
  .filter(ee.Filter.eq('ADM0_NAME', 'Turkey'))
  .filter(ee.Filter.eq('ADM2_NAME', PROVINCE_NAME));

var geometry = province.geometry();

// ======== FACTOR 1: NDVI (Vegetation) ========
function maskS2Clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.gte(4).and(scl.lte(7));
  return image.updateMask(mask).divide(10000)
    .copyProperties(image, ['system:time_start']);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(geometry)
  .filterDate(SUMMER_START, SUMMER_END)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(maskS2Clouds);

var ndvi = s2.median().normalizedDifference(['B8', 'B4'])
  .rename('NDVI').clip(geometry);

// Low NDVI = dry vegetation = higher risk
// Invert: 1 - normalized NDVI
var ndviNorm = ndvi.unitScale(-0.1, 0.8).clamp(0, 1);
var ndviRisk = ee.Image(1).subtract(ndviNorm).rename('ndvi_risk');

// ======== FACTOR 2: Land Surface Temperature ========
var lst = ee.ImageCollection('MODIS/061/MOD11A2')
  .filterDate(SUMMER_START, SUMMER_END)
  .select('LST_Day_1km');

var lstMean = lst.mean()
  .multiply(0.02).subtract(273.15) // Scale factor and convert to Celsius
  .clip(geometry)
  .rename('LST');

// High temperature = higher risk
var lstRisk = lstMean.unitScale(15, 45).clamp(0, 1).rename('lst_risk');

// ======== FACTOR 3: Slope ========
var dem = ee.Image('USGS/SRTMGL1_003').select('elevation');
var slope = ee.Terrain.slope(dem).clip(geometry);

// Steeper slopes = fire spreads faster = higher risk
var slopeRisk = slope.unitScale(0, 45).clamp(0, 1).rename('slope_risk');

// ======== FACTOR 4: Land Cover ========
var worldCover = ee.ImageCollection('ESA/WorldCover/v200')
  .first().clip(geometry);

// Assign risk values to land cover classes
var lcRisk = ee.Image(0)
  .where(worldCover.eq(10), 0.9)  // Tree cover - high fuel load
  .where(worldCover.eq(20), 0.8)  // Shrubland - very flammable
  .where(worldCover.eq(30), 0.6)  // Grassland
  .where(worldCover.eq(40), 0.4)  // Cropland
  .where(worldCover.eq(50), 0.1)  // Built-up
  .where(worldCover.eq(60), 0.2)  // Bare
  .where(worldCover.eq(80), 0.0)  // Water
  .clip(geometry)
  .rename('lc_risk');

// ======== COMPOSITE FIRE RISK INDEX ========
// Weighted combination
var weights = {
  ndvi: 0.30,   // Vegetation dryness
  lst: 0.25,    // Temperature
  slope: 0.20,  // Terrain
  lc: 0.25      // Fuel type
};

var fireRisk = ndviRisk.multiply(weights.ndvi)
  .add(lstRisk.multiply(weights.lst))
  .add(slopeRisk.multiply(weights.slope))
  .add(lcRisk.multiply(weights.lc))
  .rename('FireRiskIndex');

// Classify into risk categories
var fireRiskClass = ee.Image(0)
  .where(fireRisk.gte(0.0).and(fireRisk.lt(0.2)), 1)  // Very Low
  .where(fireRisk.gte(0.2).and(fireRisk.lt(0.4)), 2)  // Low
  .where(fireRisk.gte(0.4).and(fireRisk.lt(0.6)), 3)  // Moderate
  .where(fireRisk.gte(0.6).and(fireRisk.lt(0.8)), 4)  // High
  .where(fireRisk.gte(0.8), 5)                          // Very High
  .clip(geometry)
  .rename('RiskClass');

// ======== VISUALIZATION ========
Map.centerObject(province, 9);

var riskVis = {
  min: 0, max: 1,
  palette: ['green', 'yellow', 'orange', 'red', 'darkred']
};

var classVis = {
  min: 1, max: 5,
  palette: ['1a9850', 'a6d96a', 'fee08b', 'f46d43', 'd73027']
};

Map.addLayer(fireRisk, riskVis, 'Fire Risk Index (continuous)');
Map.addLayer(fireRiskClass, classVis, 'Fire Risk Classification', false);
Map.addLayer(ndvi, {min: 0, max: 0.8, palette: ['white', 'green']}, 'NDVI', false);
Map.addLayer(lstMean, {min: 20, max: 45, palette: ['blue', 'yellow', 'red']}, 'LST (°C)', false);
Map.addLayer(slope, {min: 0, max: 45, palette: ['green', 'yellow', 'red']}, 'Slope', false);
Map.addLayer(province.style({
  color: 'white', fillColor: '00000000', width: 2
}), {}, 'Province Boundary');

// ======== STATISTICS ========
// Area by risk class
var areaByRisk = ee.Image.pixelArea().addBands(fireRiskClass).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1}),
  geometry: geometry,
  scale: 100,
  maxPixels: 1e10
});

print('--- Fire Risk Area Statistics for ' + PROVINCE_NAME + ' ---');
print('1=Very Low, 2=Low, 3=Moderate, 4=High, 5=Very High');
print(areaByRisk);

// Mean risk value
var meanRisk = fireRisk.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: geometry,
  scale: 100,
  maxPixels: 1e10
});
print('Mean Fire Risk Index:', meanRisk);

// ======== LEGEND ========
var legend = ui.Panel({style: {position: 'bottom-left'}});
legend.add(ui.Label('Fire Risk', {fontWeight: 'bold'}));
var labels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
var colors = ['1a9850', 'a6d96a', 'fee08b', 'f46d43', 'd73027'];

for (var i = 0; i < labels.length; i++) {
  legend.add(ui.Panel([
    ui.Label('', {backgroundColor: '#' + colors[i],
      padding: '8px', margin: '0 8px 0 0'}),
    ui.Label(labels[i])
  ], ui.Panel.Layout.Flow('horizontal')));
}
Map.add(legend);

// ======== EXPORT ========
Export.image.toDrive({
  image: fireRisk.toFloat(),
  description: 'FireRiskIndex_' + PROVINCE_NAME + '_' + YEAR,
  folder: EXPORT_FOLDER,
  region: geometry,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

Export.image.toDrive({
  image: fireRiskClass.toByte(),
  description: 'FireRiskClass_' + PROVINCE_NAME + '_' + YEAR,
  folder: EXPORT_FOLDER,
  region: geometry,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e10
});

print('Export tasks created. Go to Tasks tab to start exports.');
