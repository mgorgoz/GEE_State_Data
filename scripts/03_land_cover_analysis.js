/**
 * Land Cover Analysis by Province - Turkey
 *
 * This script extracts and analyzes land cover data using
 * ESA WorldCover 10m and MODIS Land Cover for a selected Turkish province.
 * Calculates area statistics for each land cover class.
 *
 * Data Source: ESA WorldCover 10m (2021)
 * Author: Murat Görgöz
 * Repository: https://github.com/mgorgoz/GEE_State_Data
 */

// ==================== CONFIGURATION ====================
var PROVINCE_NAME = 'Kastamonu';
var EXPORT_SCALE = 10;
var EXPORT_FOLDER = 'GEE_LandCover_Exports';
// =======================================================

// Load boundaries
var gaul2 = ee.FeatureCollection('FAO/GAUL/2015/level2');
var province = gaul2
  .filter(ee.Filter.eq('ADM0_NAME', 'Turkey'))
  .filter(ee.Filter.eq('ADM2_NAME', PROVINCE_NAME));

// ---- ESA WorldCover 10m ----
var worldCover = ee.ImageCollection('ESA/WorldCover/v200')
  .first()
  .clip(province);

// WorldCover class names
var classNames = {
  10: 'Tree cover',
  20: 'Shrubland',
  30: 'Grassland',
  40: 'Cropland',
  50: 'Built-up',
  60: 'Bare / sparse vegetation',
  70: 'Snow and ice',
  80: 'Permanent water bodies',
  90: 'Herbaceous wetland',
  95: 'Mangroves',
  100: 'Moss and lichen'
};

// ESA WorldCover palette
var wcVis = {
  bands: ['Map'],
  min: 10,
  max: 100,
  palette: [
    '006400', // Tree cover
    'ffbb22', // Shrubland
    'ffff4c', // Grassland
    'f096ff', // Cropland
    'fa0000', // Built-up
    'b4b4b4', // Bare
    'f0f0f0', // Snow/ice
    '0064c8', // Water
    '0096a0', // Wetland
    '00cf75', // Mangroves
    'fae6a0'  // Moss/lichen
  ]
};

// Center map
Map.centerObject(province, 9);
Map.addLayer(worldCover, wcVis, 'ESA WorldCover 2021');
Map.addLayer(province.style({
  color: 'white', fillColor: '00000000', width: 2
}), {}, 'Province Boundary');

// ---- Calculate Area per Land Cover Class ----
var areaImage = ee.Image.pixelArea().addBands(worldCover);

var areaByClass = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().group({
    groupField: 1,
    groupName: 'class'
  }),
  geometry: province.geometry(),
  scale: 10,
  maxPixels: 1e12
});

// Process results
var groups = ee.List(areaByClass.get('groups'));

var classAreas = groups.map(function(item) {
  var areaDict = ee.Dictionary(item);
  var classValue = ee.Number(areaDict.get('class')).format('%d');
  var areaHa = ee.Number(areaDict.get('sum')).divide(10000).round();
  return ee.Feature(null, {
    'class': classValue,
    'area_ha': areaHa
  });
});

var statsTable = ee.FeatureCollection(classAreas);

print('--- Land Cover Statistics for ' + PROVINCE_NAME + ' ---');
print('Class codes: 10=Trees, 20=Shrub, 30=Grass, 40=Crop, 50=Built, 60=Bare, 80=Water');
print(statsTable);

// ---- Total Province Area ----
var totalArea = province.geometry().area().divide(1e6); // km²
print('Total Province Area (km²):', totalArea);

// ---- Forest Cover Percentage ----
var forestArea = worldCover.eq(10);
var forestPixels = forestArea.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: province.geometry(),
  scale: 10,
  maxPixels: 1e12
});
print('Forest Cover Ratio:', forestPixels.get('Map'));

// ---- Export ----
Export.image.toDrive({
  image: worldCover,
  description: 'LandCover_' + PROVINCE_NAME + '_ESA_10m',
  folder: EXPORT_FOLDER,
  region: province.geometry(),
  scale: EXPORT_SCALE,
  crs: 'EPSG:4326',
  maxPixels: 1e12
});

// Export statistics as CSV
Export.table.toDrive({
  collection: statsTable,
  description: 'LandCover_Stats_' + PROVINCE_NAME,
  folder: EXPORT_FOLDER,
  fileFormat: 'CSV'
});

print('Export tasks created. Go to Tasks tab to start exports.');
