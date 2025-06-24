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
  getActiveLayers: () => {
    const active = {};
    Object.entries(GEOLAYERS).forEach(([airport, catObj]) => {
      Object.entries(catObj).forEach(([category, namesObj]) => {
        Object.entries(namesObj).forEach(([name, layerOrObj]) => {
          const id = `toggle-${airport}${category}${name}`;
          const checkbox = document.getElementById(id);

          if (checkbox && checkbox.checked) {
            if (!active[airport]) active[airport] = {};
            if (!active[airport][category]) active[airport][category] = category === 'sectors' ? {} : [];

            if (category === 'sectors') {
              // layerOrObj is an object: positions => layers
              active[airport][category][name] = Object.keys(layerOrObj);
            } else {
              active[airport][category].push(name);
            }
          }
        });
      });
    });
    return active;
  },


  setActiveLayers: (active) => {
    Object.entries(GEOLAYERS).forEach(([airport, catObj]) => {
      Object.entries(catObj).forEach(([category, namesObj]) => {
        Object.entries(namesObj).forEach(([name, layerOrObj]) => {
          const id = `toggle-${airport}${category}${name}`;
          const checkbox = document.getElementById(id);
          if (!checkbox) return;

          const activeCategory = active[airport]?.[category];
          let shouldEnable = false;

          if (Array.isArray(activeCategory)) {
            shouldEnable = activeCategory.includes(name);
          } else if (typeof activeCategory === 'object' && activeCategory !== null) {
            shouldEnable = name in activeCategory;
          }

          checkbox.checked = !!shouldEnable;

          if (shouldEnable) {
            if (layerOrObj instanceof L.LayerGroup) {
              map.addLayer(layerOrObj);
            } else if (typeof layerOrObj === 'object' && layerOrObj !== null) {
              // add all position layers for this sector
              Object.values(layerOrObj).forEach(layer => {
                if (layer instanceof L.Layer) {
                  map.addLayer(layer);
                }
              });
            }
          } else {
            if (layerOrObj instanceof L.LayerGroup) {
              map.removeLayer(layerOrObj);
            } else if (typeof layerOrObj === 'object' && layerOrObj !== null) {
              // remove all position layers for this sector
              Object.values(layerOrObj).forEach(layer => {
                if (layer instanceof L.Layer) {
                  map.removeLayer(layer);
                }
              });
            }
          }
        });
      });
    });
  }
};

loadGeoFiles(GEOFILES, map).then(({ GEODATA, GEOLAYERS }) => {
  buildSidebar(GEODATA, GEOLAYERS, map, updateURLFromMapState)
  attachSidebarListeners(document.getElementById("sidebar"))
  setupSearch(GEODATA, GEOLAYERS, map, updateURLFromMapState)

  console.log(GEODATA)
  console.log(GEOLAYERS)

  // Load layers from url if any
  const enabledLayers = getEnabledLayersFromURL();
  if (enabledLayers && window.LayerControl) {
    window.LayerControl.setActiveLayers(enabledLayers);
  }
});