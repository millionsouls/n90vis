let geoLayers = {};

function onEachFeature(feature, layer) {
  handleFeatureClick(feature, layer, geoLayers[feature.fileName]);
}

function addLayerToggle(file, name, failed = false) {
  const container = document.getElementById('layer-toggles');
  const id = `toggle-${file.replace(/[^\w]/g, '')}`;
  const div = document.createElement('div');
  div.innerHTML = `<input type="checkbox" id="${id}" ${failed ? 'disabled' : 'checked'}> <label for="${id}">${name}${failed ? ' (failed to load)' : ''}</label>`;
  container.appendChild(div);

  if (!failed) {
    document.getElementById(id).addEventListener('change', function() {
      const group = geoLayers[file];
      if (group) {
        if (this.checked) {
          map.addLayer(group);
        } else {
          map.removeLayer(group);
        }
      }
    });
  }
}

MAP_CONFIG.geojsonFiles.forEach(file => {
  fetch(file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!data.features) throw new Error('Invalid GeoJSON: missing features');
      data.features.forEach(f => f.fileName = file);

      const zIndex = data.features[0]?.properties?.style?.zIndex || 0;
      const paneName = `pane-${file.replace(/[^\w]/g, '')}`;

      // 200 base zindex
      if (!map.getPane(paneName)) {
        map.createPane(paneName);
        map.getPane(paneName).style.zIndex = 200 + zIndex;
      }

      const geoJsonLayer = L.geoJSON(data, {
        pane: paneName,
        style: function(feature) {
          return {
            color: feature.properties.style.stroke || "#3388ff",
            weight: feature.properties.style["stroke-width"] || 2,
            opacity: feature.properties.style["stroke-opacity"] || 1,
            fillColor: feature.properties.style.fill || "#3388ff",
            fillOpacity: feature.properties.style["fill-opacity"] || 0.2
          };
        },
        onEachFeature: onEachFeature
      });

      const group = L.layerGroup([geoJsonLayer]).addTo(map);
      geoLayers[file] = group;

      addLayerToggle(file, data.name);
    })
    .catch(err => {
      console.error(`Failed to load ${file}:`, err);
      addLayerToggle(file, true);
    });
});