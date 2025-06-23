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
  // Returns nested object {airport: {category: [names]}}
  getActiveLayerKeys: () => {
    const active = {};
    Object.entries(GEOLAYERS).forEach(([airport, catObj]) => {
      Object.entries(catObj).forEach(([category, namesObj]) => {
        Object.keys(namesObj).forEach(name => {
          const id = `toggle-${airport}${category}${name}`;
          const checkbox = document.getElementById(id);

          if (checkbox && checkbox.checked) {
            if (!active[airport]) active[airport] = {};
            if (!active[airport][category]) active[airport][category] = [];
            active[airport][category].push(name);
          }
        });
      });
    });

    return active;
  },

  // Accepts nested object and sets layers
  setActiveLayers: (active) => {
    Object.entries(GEOLAYERS).forEach(([airport, catObj]) => {
      Object.entries(catObj).forEach(([category, namesObj]) => {
        Object.entries(namesObj).forEach(([name, layer]) => {
          const id = `toggle-${airport}${category}${name}`;
          const checkbox = document.getElementById(id);

          if (!checkbox) return;
          const shouldEnable = active[airport]?.[category]?.includes(name);
          checkbox.checked = !!shouldEnable;
          if (shouldEnable) {
            map.addLayer(layer);
          } else {
            map.removeLayer(layer);
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

  const enabledLayers = getEnabledLayersFromURL();
  if (enabledLayers && window.LayerControl) {
    window.LayerControl.setActiveLayers(enabledLayers);
  }
});