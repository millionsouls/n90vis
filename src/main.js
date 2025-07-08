/**
 * Starting points, activates everything
 * 
 */

import { loadGeoFiles, GEODATA, GEOLAYERS } from './loader.js';
import { map } from './map.js';
import { buildSidebar, attachSidebarListeners } from './ui/sidebar.js';
import { setupSearch } from './ui/search.js';
import { getEnabledLayersFromURL, updateURLFromMapState } from './url-handler.js';

let ACTIVE_DOMAIN = 'tracon'

window.LayerControl = {
  getActiveLayers: function () {
    const result = {};

    Object.entries(GEOLAYERS).forEach(([domain, airports]) => {
      result[domain] = {};

      Object.entries(airports).forEach(([airport, categories]) => {
        result[domain][airport] = {};

        Object.entries(categories).forEach(([category, files]) => {
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
              result[domain][airport][category] = sectorData;
            }
          } else {
            const activeLayers = Object.entries(files)
              .filter(([_, layer]) => map.hasLayer(layer))
              .map(([name]) => name);

            if (activeLayers.length > 0) {
              result[domain][airport][category] = activeLayers;
            }
          }
        });
      });
    });

    return result;
  },

  setActiveLayers: function (decoded) {
    console.log(decoded)
    Object.entries(decoded).forEach(([domain, airports]) => {
      Object.entries(airports).forEach(([airport, categories]) => {
        Object.entries(categories).forEach(([category, value]) => {
          if (category === 'sectors') {
            Object.entries(value).forEach(([filename, activePositions]) => {
              const posLayers = GEOLAYERS[domain]?.[airport]?.[category]?.[filename];
              if (!posLayers) return;

              const positionsToActivate = (activePositions && activePositions.length > 0)
                ? activePositions
                : Object.keys(posLayers);

              Object.entries(posLayers).forEach(([posName, layer]) => {
                const shouldBeActive = positionsToActivate.includes(posName);

                if (shouldBeActive && !map.hasLayer(layer)) {
                  map.addLayer(layer);
                } else if (!shouldBeActive && map.hasLayer(layer)) {
                  map.removeLayer(layer);
                }

                const checkboxId = `toggle-${airport}sectors${filename}${posName}`;
                const checkbox = document.getElementById(checkboxId);
                if (checkbox) {
                  checkbox.checked = shouldBeActive;
                }
              });

              const sectorCheckboxId = `toggle-${airport}sectors${filename}`;
              const sectorCheckbox = document.getElementById(sectorCheckboxId);
              if (sectorCheckbox) {
                sectorCheckbox.checked = positionsToActivate.length > 0;
                sectorCheckbox.dispatchEvent(new Event('change'));
              }
            });
          } else {
            value.forEach(name => {
              const layer = GEOLAYERS[domain]?.[airport]?.[category]?.[name];
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
    });

    updateURLFromMapState();
  }
};

function switchDomain(newDomain) {
  ACTIVE_DOMAIN = newDomain;

  const domainData = GEODATA[ACTIVE_DOMAIN];
  const domainLayers = GEOLAYERS[ACTIVE_DOMAIN];

  const sidebarEl = document.getElementById("sidebar");
  sidebarEl.innerHTML = ''; // Clear previous content

  buildSidebar(domainData, domainLayers, map, updateURLFromMapState);
  setupSearch(domainData, domainLayers, map, updateURLFromMapState);

  updateURLFromMapState();
}

fetch('data/file-index.json')
  .then(res => {
    if (!res.ok) throw new Error(`Failed to load file-index.json`);
    return res.json();
  })
  .then(geoFiles => loadGeoFiles(geoFiles, map))
  .then(() => {
    const domainData = GEODATA[ACTIVE_DOMAIN];
    const domainLayers = GEOLAYERS[ACTIVE_DOMAIN];

    buildSidebar(domainData, domainLayers, map, updateURLFromMapState);
    attachSidebarListeners(document.getElementById("sidebar"));
    setupSearch(domainData, domainLayers, map, updateURLFromMapState);

    const enabled = getEnabledLayersFromURL();
    if (enabled && window.LayerControl) {
      window.LayerControl.setActiveLayers(enabled);
    }

    document.getElementById("btn-tracon").addEventListener("click", () => switchDomain("tracon"));
    document.getElementById("btn-enroute").addEventListener("click", () => switchDomain("enroute"));

  })
  .catch(err => {
    console.error("Failed to load map layers:", err);
  });