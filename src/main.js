/**
 * Startup script: Initializes map, UI, layers, and URL state.
 */

import { loadGeoFiles, GEODATA, GEOLAYERS } from './loader.js';
import { map } from './map.js';
import { buildSidebar, attachSidebarListeners } from './ui/sidebar.js';
import { setupSearch } from './ui/search.js';
import { getEnabledLayersFromURL, updateURLFromMapState } from './url-handler.js';

let ACTIVE_STATION = 'tracon';

// Helper functions
function toggleCheckbox(id, checked = true) {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    if (checkbox.checked !== checked) {
      checkbox.checked = checked;
      checkbox.dispatchEvent(new Event('change'));
    }
  }
}
function getLayer(station, airport, category, name, position = null) {
  const base = GEOLAYERS[station]?.[airport]?.[category]?.[name];
  if (!base) return null;
  return position ? base[position] : base;
}
function activateLayer(layer) {
  if (layer && !map.hasLayer(layer)) map.addLayer(layer);
}
function deactivateLayer(layer) {
  if (layer && map.hasLayer(layer)) map.removeLayer(layer);
}

/**
 * Captures all the changes made by the user from toggling layers. Mainly used to update and load the URL string.
 */
window.LayerControl = {
  getActiveLayers() {
    const result = {};

    for (const [station, airports] of Object.entries(GEOLAYERS)) {
      result[station] = {};

      for (const [airport, categories] of Object.entries(airports)) {
        result[station][airport] = {};

        for (const [category, files] of Object.entries(categories)) {
          if (category === 'sectors') {
            const activeSectors = {};

            for (const [filename, positions] of Object.entries(files)) {
              const activePos = Object.entries(positions)
                .filter(([_, layer]) => map.hasLayer(layer))
                .map(([pos]) => pos);

              if (activePos.length > 0) {
                activeSectors[filename] = activePos;
              }
            }

            if (Object.keys(activeSectors).length > 0) {
              result[station][airport][category] = activeSectors;
            }

          } else {
            const activeLayers = Object.entries(files)
              .filter(([_, layer]) => map.hasLayer(layer))
              .map(([name]) => name);

            if (activeLayers.length > 0) {
              result[station][airport][category] = activeLayers;
            }
          }
        }
      }
    }

    return result;
  },

  setActiveLayers(decoded) {
    for (const [station, airports] of Object.entries(decoded)) {
      for (const [airport, categories] of Object.entries(airports)) {
        for (const [category, value] of Object.entries(categories)) {
          if (category === 'sectors') {
            if (station === 'enroute' && Array.isArray(value)) {
              // Enroute sectors - list of filenames
              value.forEach(filename => {
                const posLayers = getLayer(station, airport, category, filename);
                if (!posLayers) return;

                for (const [posName, layer] of Object.entries(posLayers)) {
                  activateLayer(layer);
                  toggleCheckbox(`toggle-${airport}sectors${filename}${posName}`);
                }

                toggleCheckbox(`toggle-${airport}sectors${filename}`);
              });

            } else {
              // Tracon sectors - object of filename -> positions
              for (const [filename, activePositions] of Object.entries(value)) {
                const posLayers = getLayer(station, airport, category, filename);
                if (!posLayers) continue;

                const allPositions = Object.keys(posLayers);

                let toActivate = [];
                if (Array.isArray(activePositions) && activePositions.length > 0) {
                  const isFullNames = activePositions.every(pos => allPositions.includes(pos));
                  if (isFullNames) {
                    toActivate = activePositions;
                  } else {
                    // If activePositions are suffixes, match them
                    toActivate = allPositions.filter(posName =>
                      activePositions.some(suffix => posName.endsWith(suffix))
                    );
                  }
                } else {
                  toActivate = [];
                }

                // 1. Ensure the main sector file checkbox is checked if any positions are to be activated
                const mainCheckboxId = `toggle-${airport}sectors${filename}`;
                const mainCheckbox = document.getElementById(mainCheckboxId);
                if (mainCheckbox && !mainCheckbox.checked && toActivate.length > 0) {
                  mainCheckbox.checked = true;
                  mainCheckbox.dispatchEvent(new Event('change'));
                }

                // 2. Activate/deactivate only the intended positions
                for (const [posName, layer] of Object.entries(posLayers)) {
                  if (toActivate.includes(posName)) {
                    activateLayer(layer);
                  } else {
                    deactivateLayer(layer);
                  }
                  toggleCheckbox(`toggle-${airport}sectors${filename}${posName}`, toActivate.includes(posName));
                }

                // 3. If no positions are to be activated, uncheck the main sector file checkbox
                if (mainCheckbox && toActivate.length === 0) {
                  mainCheckbox.checked = false;
                  mainCheckbox.dispatchEvent(new Event('change'));
                }
              }
            }
          } else {
            // Regular layers (like boundaries, fixes, etc.)
            value.forEach(name => {
              const layer = getLayer(station, airport, category, name);
              if (layer) {
                activateLayer(layer);
                toggleCheckbox(`toggle-${airport}${category}${name}`);
              }
            });
          }
        }
      }
    }

    console.log("set: ", decoded)
    updateURLFromMapState();
  }
};

// Switching between terminal and enroute selections
function switchDomain(newDomain) {
  ACTIVE_STATION = newDomain;

  document.querySelectorAll('[id^="sidebar-station-"]').forEach(div => {
    div.style.display = (div.id === `sidebar-station-${ACTIVE_STATION}`) ? "block" : "none";
  });
  
  updateURLFromMapState();
}

// Initialize
fetch('data/file-index.json')
  .then(res => {
    if (!res.ok) throw new Error('Failed to load file-index.json');
    return res.json();
  })
  .then(geoFiles => loadGeoFiles(geoFiles, map))
  .then(() => {
    buildSidebar(GEODATA, GEOLAYERS, map, updateURLFromMapState, ACTIVE_STATION);
    attachSidebarListeners(document.getElementById("sidebar"));
    setupSearch(GEODATA, GEOLAYERS, map, updateURLFromMapState);

    const enabled = getEnabledLayersFromURL();
    if (enabled) {
      window.LayerControl.setActiveLayers(enabled);
    }

    document.getElementById("btn-tracon").addEventListener("click", () => switchDomain("tracon"));
    document.getElementById("btn-enroute").addEventListener("click", () => switchDomain("enroute"));
  })
  .catch(err => {
    console.error("Failed to initialize app:", err);
  });
