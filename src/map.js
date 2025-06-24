/**
 * map.js
 * 
 * Leaflet map configuration and base layers setup
 */

import { GEOLAYERS } from './loader.js'
import { updateURLFromMapState } from './url-handler.js';

const CONFIG = {
  center: [40.703376, -74.015415],
  zoom: 7.5,
  minZoom: 5,
  maxZoom: 15,
  bounds: [
    [20, -140],
    [50, -60]
  ],
}
const baseLayers = {
  "Standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }),
  "Topo": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: '© OpenTopoMap contributors'
  }),
  "Hot": L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
  })
};
let currentLayer = baseLayers["Standard"]
let basemapVisible = true
const map = L.map('map', {
  center: CONFIG.center,
  zoom: CONFIG.zoom,
  minZoom: CONFIG.minZoom,
  maxZoom: CONFIG.maxZoom,
  maxBounds: CONFIG.bounds,
  layers: [currentLayer],

  zoomControl: false, // create our own and move to the right
  scrollWheelZoom: false, // disable original zoom function
  smoothWheelZoom: true,  // enable smooth zoom 
  smoothSensitivity: 5,   // zoom speed. default is 1
});

L.control.layers(baseLayers, null, { position: 'topright', collapsed: false }).addTo(map);
L.control.zoom({ position: 'topright' }).addTo(map);
L.control.scale({ position: 'bottomright' }).addTo(map);

map.on('baselayerchange', function(e) {
  currentLayer = baseLayers[e.name];
  basemapVisible = true;
});

// Toggles visibility of OSM map
document.getElementById('toggle-basemap').addEventListener('click', function () {
  basemapVisible = !basemapVisible;

  if (basemapVisible) {
    map.addLayer(currentLayer);
  } else {
    Object.values(baseLayers).forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
  }
});
// Resets all toggled map layers/features to off
document.getElementById('reset-layers').addEventListener('click', function () {
  Object.entries(GEOLAYERS).forEach(([airport, categoryObj]) => {
    Object.entries(categoryObj).forEach(([category, subCategoryObj]) => {
      Object.entries(subCategoryObj).forEach(([name, layerGroup]) => {
        const id = `toggle-${airport}${category}${name}`;
        const originalCheckbox = document.getElementById(id);

        if (map.hasLayer(layerGroup)) {
          map.removeLayer(layerGroup);
        }

        if (originalCheckbox) {
          originalCheckbox.checked = false;
        }
      });
    });
  });

  updateURLFromMapState();
});

export { map }