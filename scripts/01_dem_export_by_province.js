/**
 * DEM Export by Province - Turkey
 *
 * This script exports SRTM 30m DEM data for a selected Turkish province.
 * Users can change the province name to download DEM for any province in Turkey.
 *
 * Data Source: USGS SRTM 30m (NASA/USGS)
 * Boundary Source: FAO GAUL Level 2 (Admin boundaries)
 *
 * Author: Murat Görgöz
 * Repository: https://github.com/mgorgoz/GEE_State_Data
 */

// ==================== CONFIGURATION ====================
// Change the province name below to export DEM for a different province
var PROVINCE_NAME = 'Ankara';
var EXPORT_SCALE = 30; // meters (SRTM native resolution)
var EXPORT_FOLDER = 'GEE_DEM_Exports'; // Google Drive folder name
// =======================================================

// Load Turkey admin boundaries (FAO GAUL Level 2 = provinces)
var gaul2 = ee.FeatureCollection('FAO/GAUL/2015/level2');

// Filter for Turkey
var turkey = gaul2.filter(ee.Filter.eq('ADM0_NAME', 'Turkey'));

// Get the selected province
var province = turkey.filter(ee.Filter.eq('ADM2_NAME', PROVINCE_NAME));

// Check if the province exists
var provinceSize = province.size().getInfo();
if (provinceSize === 0) {
  print('ERROR: Province "' + PROVINCE_NAME + '" not found.');
  print('Available provinces in Turkey:');
  var provinceNames = turkey.aggregate_array('ADM2_NAME').sort();
  print(provinceNames);
} else {
  print('Selected Province: ' + PROVINCE_NAME);

  // Load SRTM DEM
  var dem = ee.Image('USGS/SRTMGL1_003').select('elevation');

  // Clip DEM to province boundary
  var demClipped = dem.clip(province);

  // Visualization parameters
  var demVis = {
    min: 0,
    max: 3000,
    palette: [
      '006633', 'E5FFCC', '662A00', 'D8D8D8', 'F5F5F5'
    ]
  };

  // Center the map on the selected province
  Map.centerObject(province, 8);

  // Add layers to the map
  Map.addLayer(demClipped, demVis, 'DEM - ' + PROVINCE_NAME);
  Map.addLayer(province.style({
    color: 'red',
    fillColor: '00000000',
    width: 2
  }), {}, 'Province Boundary');

  // Calculate elevation statistics
  var stats = demClipped.reduceRegion({
    reducer: ee.Reducer.minMax().combine({
      reducer2: ee.Reducer.mean(),
      sharedInputs: true
    }),
    geometry: province.geometry(),
    scale: 90,
    maxPixels: 1e10
  });

  print('--- Elevation Statistics ---');
  print('Min Elevation (m):', stats.get('elevation_min'));
  print('Max Elevation (m):', stats.get('elevation_max'));
  print('Mean Elevation (m):', stats.get('elevation_mean'));

  // Export to Google Drive
  Export.image.toDrive({
    image: demClipped,
    description: 'DEM_' + PROVINCE_NAME + '_SRTM30m',
    folder: EXPORT_FOLDER,
    region: province.geometry(),
    scale: EXPORT_SCALE,
    crs: 'EPSG:4326',
    maxPixels: 1e10,
    fileFormat: 'GeoTIFF'
  });

  print('Export task created. Go to Tasks tab to start the export.');
}
