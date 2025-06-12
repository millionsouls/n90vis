let geoLayers = {};

function onEachFeature(feature, layer) {
  handleFeatureClick(feature, layer, geoLayers[feature.fileName]);
}

function addLayerToggle(file, name, section = "zones", failed = false) {
  const sectionMap = {
    zones: "toggle-section-zones",
    star: "toggle-section-star",
    sid: "toggle-section-sid"
  };
  const container = document.getElementById(sectionMap[section] || sectionMap.zones);
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

MAP_CONFIG.geoSector.forEach(file => {
  fetch("data/sector/" + file)
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

      addLayerToggle(file, data.name, "zones");
    })
    .catch(err => {
      console.error(`Failed to load ${file}:`, err);
      addLayerToggle(file, true);
    });
});

MAP_CONFIG.geoSID.forEach(file => {
  fetch("data/sid/" + file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then(data => {
      
    })
    .catch(err => {
      console.error(`Failed to load ${file}:`, err);
      addLayerToggle(file, true);
    });
});

MAP_CONFIG.geoSTAR.forEach(file => {
  fetch("data/star/" + file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!data.features) throw new Error('Invalid GeoJSON: missing features');
      data.features.forEach(f => f.fileName = file);

      const paneName = `pane-star-${file.replace(/[^\w]/g, '')}`;
      if (!map.getPane(paneName)) {
        map.createPane(paneName);
        map.getPane(paneName).style.zIndex = 999;
      }

      // Build a lookup for id -> coordinates
      const idToCoord = {};
      data.features.forEach(f => {
        if (f.properties.id && Array.isArray(f.geometry.coordinates)) {
          idToCoord[f.properties.id] = f.geometry.coordinates;
        }
      });

      const markers = [];
      const lines = [];

      data.features.forEach(f => {
        if (f.geometry.type === "Point") {
          const coords = f.geometry.coordinates;
          // Marker with label below
          const marker = L.marker([coords[1], coords[0]], {
            pane: paneName,
            icon: L.divIcon({
              className: 'star-point-label',
              html: `<div style="display: flex; flex-direction: column; align-items: center;">
                       <div style="width:10px; height:10px; border-radius:50%; background:#f00; border:2px solid #000;"></div>
                       <div style="font-size:16px; font-weight:regular; color:#000; margin-top:2px; ">${f.properties.id || ""}</div>
                     </div>`,
              iconAnchor: [7,7] // anchor so label is below the point
            })
          });
          markers.push(marker);

          // Draw lines from 'from' to this point
          if (f.properties.from) {
            const fromIds = Array.isArray(f.properties.from) ? f.properties.from : [f.properties.from];
            fromIds.forEach(fromId => {
              const fromCoord = idToCoord[fromId];
              if (fromCoord) {
                lines.push(L.polyline([
                  [fromCoord[1], fromCoord[0]],
                  [coords[1], coords[0]]
                ], {
                  pane: paneName,
                  color: "#000000",
                  weight: 2,
                  opacity: 1
                }));
              }
            });
          }
        }
      });

      const linesGroup = L.layerGroup(lines);
      const markersGroup = L.layerGroup(markers);

      const group = L.layerGroup([linesGroup, markersGroup]).addTo(map);
      geoLayers[file] = group;

      addLayerToggle(file, data.name, "star");
    })
    .catch(err => {
      console.error(`Failed to load ${file}:`, err);
      addLayerToggle(file, true);
    });
});