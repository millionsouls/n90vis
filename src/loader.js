/**
 * Load and constust geojson files to map layers
 * Create toggle buttons for each file
 * 
 * oh my god why did i agree to do this
 */

let geoLayers = {};

function onEachFeature(feature, layer) {
  handleFeatureHover(feature, layer);
}

/**
 * Create HTML toggle for a layer
 * 
 * @param {*} file 
 * @param {*} name 
 * @param {*} section 
 * @param {*} failed 
 */
function addLayerToggle(file, name, section = "zones", failed = false) {
  const sectionMap = {
    zones: "toggle-section-zones",
    star: "toggle-section-star",
    sid: "toggle-section-sid",
    video: "toggle-section-video"
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

/**
 * Transform altitude/speed constraints into structured data
 * 
 * @param {Array<string>} constraints - Array of constraint strings
 * @returns {Array<Array[int, string]>} - Array of [prefix, value] pairs
 */
function handleConstraints(constraints) {
  if (!Array.isArray(constraints)) return [];

  const parsed = constraints.map(raw => {
    if (!raw || typeof raw !== "string") return ["", ""];

    const [prefix, ...rest] = raw.trim().split(/\s+/);
    const value = rest.join(" ");

    return [prefix.toLowerCase(), value];
  });

  // Sort to move all "blw" entries to the front
  parsed.sort((a, b) => {
    if (a[0] !== "blw" && b[0] === "blw") return 1;
    return 0;
  });

  return parsed;
}

/**
 * Construct HTML for a marker
 * 
 * @param {string} id 
 * @param {Array<Array[int, string]>} altitudes 
 * @param {Array<Array[int, string]>} speeds 
 * @returns 
 */
function buildMarkerHTML(id, altitudes, speeds) {
  // Altitude HTML
  let altHtml = "";
  if (altitudes.length === 2) {
    altHtml = `
      <div class="flex-center">
        <span class="res-label ${altitudes[0][0]}">${altitudes[0][1]}</span>
        <span class="res-label ${altitudes[1][0]}">${altitudes[1][1]}</span>
      </div>
    `;
  } else if (altitudes.length === 1) {
    altHtml = `
      <div class="flex-center">
        <span class="res-label ${altitudes[0][0]}">${altitudes[0][1]}</span>
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
        <span class="res-label ${speeds[0][0]}">${speeds[0][0]}</span>
        <span class="res-label ${speeds[1][0]}">${speeds[1][1]}</span>
      </div>
    `;
  } else if (speeds.length === 1) {
    speedHtml = `
      <div class="flex-center">
        <span class="res-label ${speeds[0][0]}">${speeds[0][1]}</span>
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

/**
 * Construct sector layers
 */
GEOFILES.sector.forEach(file => {
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
          // Use color property if present, else fallback
          const color = feature.properties.Color || "#3388ff";
          return {
            color: color,
            weight: 2,
            opacity: 1,
            fillColor: color,
            fillOpacity: 0.6
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

/*
TODO

GEOFILES.sid.forEach(file => {
  fetch("data/sid/" + file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    
    .then(data => {
      // Implement SID rendering
    })

    .catch(err => {
      console.error(`Failed to load ${file}:`, err);
      addLayerToggle(file, file, "sid", true);
    });
});
*/

/**
 * Constuct SID/STAR layers
 */
GEOFILES.pd.forEach(file => {
  fetch("data/pd/" + file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    
    .then(data => {
      if (!data.features) throw new Error('Invalid GeoJSON: missing features');
      data.features.forEach(f => f.fileName = file);

      // Seperate panes for lines and markers due to z-index issues
      // Markers should be on top of lines
      const linePane = `pane-star-lines-${file.replace(/[^\w]/g, '')}`;
      const markerPane = `pane-star-markers-${file.replace(/[^\w]/g, '')}`;
      if (!map.getPane(linePane)) {
        map.createPane(linePane);
        map.getPane(linePane).style.zIndex = 800;
      }
      if (!map.getPane(markerPane)) {
        map.createPane(markerPane);
        map.getPane(markerPane).style.zIndex = 900;
      }

      // Build lookup for id -> coordinates
      /*
      const idToCoord = {};
      data.features.forEach(f => {
        if (f.properties.id && Array.isArray(f.geometry.coordinates)) {
          idToCoord[f.properties.id] = f.geometry.coordinates;
        }
      });
      */

      const markers = [];
      const lines = [];

      data.features.forEach(f => {
        // Construct Point and LineString geos
        if (f.geometry.type === "Point") {
          const coords = f.geometry.coordinates;

          // Get altitude and speed constraints if any
          let altitudes = handleConstraints(f.properties.altitudes)
          let speeds = handleConstraints(f.properties.speed)

          console.log(speeds)

          const marker = L.marker([coords[1], coords[0]], {
            pane: markerPane,
            icon: L.divIcon({
              className: 'divIcon',
              html: buildMarkerHTML(f.properties.id, altitudes, speeds),
              iconAnchor: [6,6] // Ref CSS and buildMarkerHTML return for styling dimensions; divIcon, res-label
            })
          });
          markers.push(marker);

          // Draw lines point to point
         /*
          if (f.properties.from) {
            const fromIds = Array.isArray(f.properties.from) ? f.properties.from : [f.properties.from];

            fromIds.forEach(fromId => {
              const fromCoord = idToCoord[fromId];
              if (fromCoord) {
                lines.push(L.polyline([
                  [fromCoord[1], fromCoord[0]],
                  [coords[1], coords[0]]
                ], {
                  pane: linePane,
                  color: "#000000",
                  weight: 2,
                  opacity: 1
                }));
              }
            });
          }
         */
        }

        if (f.geometry.type === "Point") {
          // TODO
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

/**
 * Construct video layers
 */
GEOFILES.video.forEach(file => {
  fetch("data/videomap/" + file)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })

    .then(data => {
      if (!data.features) throw new Error('Invalid GeoJSON: missing features');
      data.features.forEach(f => f.fileName = file);

      // LineString and Polygon styling
      function videoStyle(feature) {
        if (feature.geometry.type === "LineString") {
          return { color: "#000000", weight: 2 };
        }
        if (feature.geometry.type === "Polygon") {
          return { color: "#000000", weight: 2, fillOpacity: 0.1 };
        }
        return {};
      }

      // Point styling
      // Return null; DO NOT RENDER
      function videoPointToLayer(feature, latlng) {
        return null;
      }

      // Create GeoJSON layer with custom styles
      const geoJsonLayer = L.geoJSON(data, {
        style: videoStyle,
        pointToLayer: videoPointToLayer
      });

      // Create a layer group for this file
      const group = L.layerGroup([geoJsonLayer]).addTo(map);
      geoLayers[file] = group;
      addLayerToggle(file, data.name || file, "video");
    })

    .catch(err => {
      console.error(`Failed to load ${file}:`, err);
      addLayerToggle(file, file, "video", true);
    });
});