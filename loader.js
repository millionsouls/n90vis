let geoLayers = {};

function onEachFeature(feature, layer) {
  handleFeatureClick(feature, layer);
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
    document.getElementById(id).addEventListener('change', function () {
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

function buildStarMarkerHTML(id, altitudes, speeds) {
  // Altitude HTML
  let altHtml = "";
  if (altitudes.length === 2) {
    altHtml = `
      <div class="flex-center">
        <span class="res-label ${altitudes[0].cls}">${altitudes[0].value}</span>
        <span class="res-label ${altitudes[1].cls}">${altitudes[1].value}</span>
      </div>
    `;
  } else if (altitudes.length === 1) {
    altHtml = `
      <div class="flex-center">
        <span class="res-label ${altitudes[0].cls}">${altitudes[0].value}</span>
      </div>
    `;
  } else {
    altHtml = ``;
  }

  // Speed HTML
  let speedHtml = "";
  if (speeds.length === 2) {
    speedHtml = `
      <div class="flex-center">
        <span class="res-label ${speeds[0].cls}">${speeds[0].value}</span>
        <span class="res-label ${speeds[1].cls}">${speeds[1].value}</span>
      </div>
    `;
  } else if (speeds.length === 1) {
    speedHtml = `
      <div class="flex-center">
        <span class="res-label ${speeds[0].cls}">${speeds[0].value}</span>
      </div>
    `;
  } else {
    speedHtml = ``;
  }

  return `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div style="width:12px; height:12px; border-radius:50%; background:#f00; border:2px solid #000;"></div>
      <div class="procedure-label">
        <div style="font-size:12px; text-align:center;">${id || ""}</div>
        <div class="procedure-text">
          ${altHtml}
          ${speedHtml}
        </div>
      </div>
    </div>
  `;
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
      if (!map.getPane(paneName)) {
        map.createPane(paneName);
        map.getPane(paneName).style.zIndex = 200 + zIndex;
      }

      const geoJsonLayer = L.geoJSON(data, {
        pane: paneName,
        style: function (feature) {
          return {
            color: feature.properties.style?.stroke || "#3388ff",
            weight: feature.properties.style?.["stroke-width"] || 2,
            opacity: feature.properties.style?.["stroke-opacity"] || 1,
            fillColor: feature.properties.style?.fill || "#3388ff",
            fillOpacity: feature.properties.style?.["fill-opacity"] || 0.2
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
      addLayerToggle(file, file, "zones", true);
    });
});

MAP_CONFIG.geoSID.forEach(file => {
  fetch("data/sid/" + file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then(data => {
      // Implement SID rendering here if needed
    })
    .catch(err => {
      console.error(`Failed to load ${file}:`, err);
      addLayerToggle(file, file, "sid", true);
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

      // Two panes for lines and markers
      const paneLineName = `pane-star-lines-${file.replace(/[^\w]/g, '')}`;
      const paneMarkerName = `pane-star-markers-${file.replace(/[^\w]/g, '')}`;
      if (!map.getPane(paneLineName)) {
        map.createPane(paneLineName);
        map.getPane(paneLineName).style.zIndex = 998;
      }
      if (!map.getPane(paneMarkerName)) {
        map.createPane(paneMarkerName);
        map.getPane(paneMarkerName).style.zIndex = 999;
      }

      // Build lookup for id -> coordinates
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

          // --- Altitude logic ---
          let altitudes = [];
          if (Array.isArray(f.properties.altitudes) && f.properties.altitudes.length > 0) {
            altitudes = f.properties.altitudes.slice(0, 2).map(altRaw => {
              if (!altRaw) return { value: "", cls: "" };
              const prefix = altRaw[0];
              const value = altRaw.slice(1);
              let cls = "";
              if (prefix === "+") cls = "plus";
              else if (prefix === "-") cls = "min";
              else if (prefix === "@") cls = "at";
              return { value, cls };
            });
          }

          // --- Speed logic ---
          let speeds = [];
          if (Array.isArray(f.properties.speed) && f.properties.speed.length > 0) {
            speeds = f.properties.speed.slice(0, 2).map(speedRaw => {
              if (!speedRaw) return { value: "", cls: "" };
              const prefix = speedRaw[0];
              const value = speedRaw.slice(1);
              let cls = "";
              if (prefix === "+") cls = "plus";
              else if (prefix === "-") cls = "min";
              else if (prefix === "@") cls = "at";
             return { value, cls};
            });
          }

          const marker = L.marker([coords[1], coords[0]], {
            pane: paneMarkerName,
            icon: L.divIcon({
              className: 'divIcon',
              html: buildStarMarkerHTML(f.properties.id, altitudes, speeds),
              iconAnchor: [7,7]
            })
          });
          markers.push(marker);

          // Draw lines point to point
          if (f.properties.from) {
            const fromIds = Array.isArray(f.properties.from) ? f.properties.from : [f.properties.from];
            fromIds.forEach(fromId => {
              const fromCoord = idToCoord[fromId];
              if (fromCoord) {
                lines.push(L.polyline([
                  [fromCoord[1], fromCoord[0]],
                  [coords[1], coords[0]]
                ], {
                  pane: paneLineName,
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
      addLayerToggle(file, file, "star", true);
    });
});