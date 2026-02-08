/**
 * NDVI Time Series Analysis by Province - Turkey
 *
 * This script generates monthly NDVI time series charts
 * for a selected Turkish province using Sentinel-2 data.
 * Useful for monitoring vegetation phenology and seasonal changes.
 *
 * Data Source: Copernicus Sentinel-2 Surface Reflectance (L2A)
 * Author: Murat Görgöz
 * Repository: https://github.com/mgorgoz/GEE_State_Data
 */

// ==================== CONFIGURATION ====================
var PROVINCE_NAME = 'Bolu';
var YEAR = 2024;
var CLOUD_THRESHOLD = 30;
// =======================================================

// Load boundaries
var gaul2 = ee.FeatureCollection('FAO/GAUL/2015/level2');
var province = gaul2
  .filter(ee.Filter.eq('ADM0_NAME', 'Turkey'))
  .filter(ee.Filter.eq('ADM2_NAME', PROVINCE_NAME));

// Cloud masking function
function maskS2Clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.gte(4).and(scl.lte(7));
  return image.updateMask(mask)
    .divide(10000)
    .copyProperties(image, ['system:time_start']);
}

// Add NDVI band
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// Load Sentinel-2 for the entire year
var startDate = YEAR + '-01-01';
var endDate = YEAR + '-12-31';

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(province.geometry())
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_THRESHOLD))
  .map(maskS2Clouds)
  .map(addNDVI);

print('Total scenes for ' + YEAR + ':', s2.size());

// ---- Monthly NDVI Composites ----
var months = ee.List.sequence(1, 12);

var monthlyNDVI = ee.ImageCollection.fromImages(
  months.map(function(month) {
    var filtered = s2.filter(ee.Filter.calendarRange(month, month, 'month'));
    var composite = filtered.select('NDVI').median()
      .set('month', month)
      .set('system:time_start',
        ee.Date.fromYMD(YEAR, month, 15).millis());
    return composite;
  })
);

// ---- Time Series Chart ----
var tsChart = ui.Chart.image.series({
  imageCollection: monthlyNDVI,
  region: province.geometry(),
  reducer: ee.Reducer.mean(),
  scale: 100,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'Monthly Mean NDVI - ' + PROVINCE_NAME + ' (' + YEAR + ')',
  vAxis: {title: 'NDVI', viewWindow: {min: 0, max: 0.8}},
  hAxis: {title: 'Month', format: 'MMM'},
  lineWidth: 2,
  pointSize: 5,
  colors: ['228B22']
});

print(tsChart);

// ---- Season Composites ----
var winterNDVI = s2.filter(ee.Filter.calendarRange(12, 2, 'month'))
  .select('NDVI').median().clip(province);
var springNDVI = s2.filter(ee.Filter.calendarRange(3, 5, 'month'))
  .select('NDVI').median().clip(province);
var summerNDVI = s2.filter(ee.Filter.calendarRange(6, 8, 'month'))
  .select('NDVI').median().clip(province);
var autumnNDVI = s2.filter(ee.Filter.calendarRange(9, 11, 'month'))
  .select('NDVI').median().clip(province);

var ndviVis = {
  min: 0, max: 0.8,
  palette: ['FFFFFF', 'CE7E45', 'FCD163', '99B718',
            '74A901', '529400', '207401', '004C00']
};

// Center map
Map.centerObject(province, 9);

// Add seasonal layers
Map.addLayer(springNDVI, ndviVis, 'NDVI - Spring (Mar-May)');
Map.addLayer(summerNDVI, ndviVis, 'NDVI - Summer (Jun-Aug)', false);
Map.addLayer(autumnNDVI, ndviVis, 'NDVI - Autumn (Sep-Nov)', false);
Map.addLayer(winterNDVI, ndviVis, 'NDVI - Winter (Dec-Feb)', false);
Map.addLayer(province.style({
  color: 'white', fillColor: '00000000', width: 2
}), {}, 'Province Boundary');

// ---- NDVI Change (Summer vs Winter) ----
var ndviChange = summerNDVI.subtract(winterNDVI).rename('NDVI_Change');

var changeVis = {
  min: -0.3, max: 0.5,
  palette: ['red', 'orange', 'yellow', 'lightgreen', 'green', 'darkgreen']
};

Map.addLayer(ndviChange, changeVis, 'NDVI Change (Summer - Winter)', false);

// ---- Seasonal Stats ----
var seasonStats = function(image, name) {
  var stats = image.reduceRegion({
    reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', true),
    geometry: province.geometry(),
    scale: 100,
    maxPixels: 1e10
  });
  print(name + ' NDVI:', stats);
};

print('--- Seasonal NDVI Statistics ---');
seasonStats(springNDVI, 'Spring');
seasonStats(summerNDVI, 'Summer');
seasonStats(autumnNDVI, 'Autumn');
seasonStats(winterNDVI, 'Winter');
