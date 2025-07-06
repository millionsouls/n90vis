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
  maxZoom: 18,
  bounds: [
    [20, -140],
    [50, -60]
  ],
}
const baseLayers = {
  "Standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }),
  "Hot": L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
  }),
  "Dark": L.esri.tiledMapLayer({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer'
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

L.control.scale({ position: 'bottomright' }).addTo(map);
L.control.layers(baseLayers, null, { position: 'topright', collapsed: false }).addTo(map);
L.control.zoom({ position: 'topright' }).addTo(map);

// Delay DOM restructuring to ensure controls exist
setTimeout(() => {
  const mapContainer = document.querySelector('.leaflet-top.leaflet-right');

  if (mapContainer) {
    // Create a wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'leaflet-custom-topright';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.gap = '6px'; // spacing between controls

    // Move all children into wrapper
    while (mapContainer.firstChild) {
      wrapper.appendChild(mapContainer.firstChild);
    }

    mapContainer.appendChild(wrapper);
  }
}, 0);

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
      Object.entries(subCategoryObj).forEach(([name, layerOrDict]) => {
        const mainId = `toggle-${airport}${category}${name}`;
        const mainCheckbox = document.getElementById(mainId);

        // Remove the rightbar container for this file
        const fileContainer = document.getElementById(`rightbar-file-${airport}-${name}`);
        if (fileContainer) fileContainer.remove();

        // Handle standard Layer or LayerGroup
        if (layerOrDict instanceof L.Layer || layerOrDict instanceof L.LayerGroup) {
          if (map.hasLayer(layerOrDict)) {
            map.removeLayer(layerOrDict);
          }
        }
        // Handle sector with positions
        else if (typeof layerOrDict === 'object') {
          Object.entries(layerOrDict).forEach(([positionName, layer]) => {
            if (map.hasLayer(layer)) {
              map.removeLayer(layer);
            }

            // Reset individual position checkbox
            const posId = `toggle-${airport}${category}${name}${positionName}`;
            const posCheckbox = document.getElementById(posId);
            if (posCheckbox) posCheckbox.checked = false;
          });
        }

        // Reset main file checkbox
        if (mainCheckbox) {
          mainCheckbox.checked = false;
        }
      });
    });
  });

  // Clean up empty airport containers in rightbar
  const rightbar = document.getElementById("rightbar");
  rightbar.querySelectorAll(".rightbar-airport-group").forEach(group => group.remove());

  updateURLFromMapState();
});

export { map }