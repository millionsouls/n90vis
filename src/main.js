/**
 * main.js
 * 
 * Init
 */
import { loadGeoFiles, GEOLAYERS } from './loader.js';
import { map } from './map.js';
import { buildSidebar, attachSidebarListeners } from './ui/sidebar.js';
import { setupSearch } from './ui/search.js';
import { getEnabledLayersFromURL, updateURLFromMapState } from './url-handler.js';

window.LayerControl = {
  getActiveLayers: function () {
    const result = {};

    Object.entries(GEOLAYERS).forEach(([airport, categories]) => {
      Object.entries(categories).forEach(([category, files]) => {
        if (!result[airport]) result[airport] = {};

        if (category === 'sectors') {
          const sectorData = {};

          Object.entries(files).forEach(([filename, positions]) => {
            const activePositions = Object.entries(positions)
              .filter(([_, layer]) => map.hasLayer(layer))
              .map(([posName]) => posName);

            if (activePositions.length > 0) {
              sectorData[filename] = activePositions;
            }
          });

          if (Object.keys(sectorData).length > 0) {
            result[airport][category] = sectorData;
          }
        } else {
          const activeLayers = Object.entries(files)
            .filter(([_, layer]) => map.hasLayer(layer))
            .map(([name]) => name);

          if (activeLayers.length > 0) {
            result[airport][category] = activeLayers;
          }
        }
      });
    });

    return result;
  },


  setActiveLayers: function (decoded) {
    Object.entries(decoded).forEach(([airport, categories]) => {
      Object.entries(categories).forEach(([category, value]) => {
        if (category === 'sectors') {
          Object.entries(value).forEach(([filename, activePositions]) => {
            const posLayers = GEOLAYERS[airport]?.[category]?.[filename];
            if (!posLayers) return;

            // If no positions specified, activate all positions
            const positionsToActivate = (activePositions && activePositions.length > 0)
              ? activePositions
              : Object.keys(posLayers);

            // For each position in this sector file
            Object.entries(posLayers).forEach(([posName, layer]) => {
              const shouldBeActive = positionsToActivate.includes(posName);

              if (shouldBeActive && !map.hasLayer(layer)) {
                map.addLayer(layer);
              } else if (!shouldBeActive && map.hasLayer(layer)) {
                map.removeLayer(layer);
              }

              const checkboxId = `toggle-${airport}${category}${filename}${posName}`;
              const checkbox = document.getElementById(checkboxId);
              if (checkbox) {
                checkbox.checked = shouldBeActive;
              }
            });

            // Update sector checkbox (checked if any position active)
            const sectorCheckboxId = `toggle-${airport}${category}${filename}`;
            const sectorCheckbox = document.getElementById(sectorCheckboxId);
            if (sectorCheckbox) {
              sectorCheckbox.checked = positionsToActivate.length > 0;
              sectorCheckbox.dispatchEvent(new Event('change'));
            }
          });
        } else {
          value.forEach(name => {
            const layer = GEOLAYERS[airport]?.[category]?.[name];
            if (!layer) return;

            if (!map.hasLayer(layer)) {
              map.addLayer(layer);
            }

            const checkboxId = `toggle-${airport}${category}${name}`;
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) checkbox.checked = true;
          });
        }
      });
    });

    updateURLFromMapState()
  }
};

fetch('data/file-index.json')
  .then(response => {
    if (!response.ok) throw new Error(`Failed to load file-index.json`);
    return response.json();
  })
  .then(GEOFILES => {
    return loadGeoFiles(GEOFILES, map);
  })
  .then(({ GEODATA, GEOLAYERS }) => {
    buildSidebar(GEODATA, GEOLAYERS, map, updateURLFromMapState);
    attachSidebarListeners(document.getElementById("sidebar"));
    setupSearch(GEODATA, GEOLAYERS, map, updateURLFromMapState);

    const enabledLayers = getEnabledLayersFromURL();
    if (enabledLayers && window.LayerControl) {
      window.LayerControl.setActiveLayers(enabledLayers);
    }
  })
  .catch(err => {
    console.error("Failed to load map layers:", err);
  });
