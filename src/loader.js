/**
 * Load and constust geojson files to map layers
 * Create toggle buttons for each file
 * 
 * oh my god why did i agree to do this
 */

const categoryMap = {
  sectors: "Sectors",
  stars: "STARs",
  sids: "SIDs",
  videomap: "Videomap"
};
const GEODATA = {};
const GEOLAYERS = {};
const fetchPromises = [];

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

// --- Dropdown toggle logic for sidebar ---
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("sidebar").addEventListener("click", function (e) {
    const toggle = e.target.closest(".dropdown-toggle");
    if (toggle) {
      const container = toggle.nextElementSibling;
      if (container && container.classList.contains("dropdown-container")) {
        container.style.display = (container.style.display === "block") ? "none" : "block";
        // Optionally close others:
        this.querySelectorAll(".dropdown-container").forEach(c => {
          if (c !== container) c.style.display = "none";
        });
      }
      e.stopPropagation();
    }
  });
});

Object.entries(GEOFILES).forEach(([key, fileArray]) => {
  const upperKey = key.toUpperCase();
  GEODATA[upperKey] = { Sectors: [], STARs: [], SIDs: [], Videomap: [] };

  fileArray.forEach(file => {
    const prefix = file.split("/")[0].toLowerCase();
    const category = categoryMap[prefix];
    if (!category) return;

    // Create a fetch promise
    const fetchPromise = fetch(`data/${key}/${file}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} on ${file}`);
        return res.json();
      })
      .then(data => {
        if (!data.features) throw new Error('Invalid GeoJSON: missing features');

        const name = data.name || "Unnamed";
        const fileKey = `${upperKey}_${category}_${name}`;
        const fileSafe = fileKey.replace(/[^\w]/g, '');
        let group;

        // --- Category-specific drawing logic ---
        if (category === "STARs" || category === "SIDs") {
          const linePane = `pane-${category.toLowerCase()}-lines-${fileSafe}`;
          const markerPane = `pane-${category.toLowerCase()}-markers-${fileSafe}`;
          if (!map.getPane(linePane)) {
            map.createPane(linePane);
            map.getPane(linePane).style.zIndex = 800;
          }
          if (!map.getPane(markerPane)) {
            map.createPane(markerPane);
            map.getPane(markerPane).style.zIndex = 900;
          }

          const markers = [];
          const lines = [];

          data.features.forEach(f => {
            if (f.geometry.type === "Point") {
              const coords = f.geometry.coordinates;
              const altitudes = handleConstraints(f.properties.altitudes);
              const speeds = handleConstraints(f.properties.speed);

              const marker = L.marker([coords[1], coords[0]], {
                pane: markerPane,
                icon: L.divIcon({
                  className: 'divIcon',
                  html: buildMarkerHTML(f.properties.id, altitudes, speeds),
                  iconAnchor: [6, 6]
                })
              });
              markers.push(marker);
            }
          });

          const linesGroup = L.layerGroup(lines);
          const markersGroup = L.layerGroup(markers);
          group = L.layerGroup([linesGroup, markersGroup]).addTo(map);

        } else if (category === "Videomap") {
          const videoStyle = feature => {
            if (feature.geometry.type === "LineString") {
              return { color: "#000000", weight: 2 };
            }
            if (feature.geometry.type === "Polygon") {
              return { color: "#000000", weight: 2, fillOpacity: 0.1 };
            }
            return {};
          };

          const videoPointToLayer = () => null;

          const geoJsonLayer = L.geoJSON(data, {
            style: videoStyle,
            pointToLayer: videoPointToLayer
          });

          group = L.layerGroup([geoJsonLayer]).addTo(map);

        } else {
          const zIndex = data.features[0]?.properties?.style?.zIndex || 0;
          const paneName = `pane-${fileSafe}`;
          if (!map.getPane(paneName)) {
            map.createPane(paneName);
          }
          map.getPane(paneName).style.zIndex = 200 + zIndex;

          const geoJsonLayer = L.geoJSON(data, {
            pane: paneName,
            style: function (feature) {
              const color = feature.properties.Color || "#3388ff";
              return {
                color: color,
                weight: 2,
                opacity: 1,
                fillColor: color,
                fillOpacity: 0.6
              };
            },
            onEachFeature: function (feature, layer) {
              if (typeof handleFeatureHover === "function") {
                handleFeatureHover(feature, layer);
              }
            }
          });

          group = L.layerGroup([geoJsonLayer]).addTo(map);
        }

        GEOLAYERS[fileKey] = group;
        GEODATA[upperKey][category].push(name);
      })
      .catch(err => {
        console.error(`Failed to load ${file}:`, err);
      });

    // Store the promise
    fetchPromises.push(fetchPromise);
  });
});

// Wait for all fetches to complete
Promise.all(fetchPromises).then(() => {
  console.log("All files loaded.");
  console.log(GEODATA);

  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = ""; // Clear existing content

  Object.entries(GEODATA).forEach(([airport, categories]) => {
    /*
      <div class="dropdown">
        <div class="dropdown-toggle">
          <span>Airport</span>
          <i class="fa fa-caret-down"></i>
        </div>
        <div class="dropdown-container">
          <div class="sidemenu-toggle">
            <span>Category</span><i class="fa fa-caret-right"></i>
          </div>
          <div class="popup-sidemenu" style="display:none">
            <!-- checkboxes here -->
          </div>
        </div>
      </div>
    */

    const dropdown = document.createElement("div");
    dropdown.className = "dropdown";

    const toggle = document.createElement("div");
    toggle.className = "dropdown-toggle";
    toggle.innerHTML = `<span>${airport}</span><i class="fa fa-caret-down"></i>`;

    const container = document.createElement("div");
    container.className = "dropdown-container";

    // For each category (Sectors, STARs, SIDs, Videomap)
    Object.entries(categories).forEach(([categoryLabel, names]) => {
      if (!names.length) return;

      // Group header that toggles popup
      const groupDiv = document.createElement("div");
      groupDiv.className = "sidemenu-toggle";
      groupDiv.innerHTML = `<span>${categoryLabel}</span><i class="fa fa-caret-right"></i>`;

      // Popup with checkboxes
      const popup = document.createElement("div");
      popup.className = "popup-sidemenu";
      popup.style.display = "none";

      names.forEach(name => {
        const fileKey = `${airport}_${categoryLabel}_${name}`;
        const id = `toggle-${fileKey.replace(/[^\w]/g, '')}`;

        const div = document.createElement("div");
        div.innerHTML = `<input type="checkbox" id="${id}" checked> <label for="${id}">${name}</label>`;
        popup.appendChild(div);

        div.querySelector("input").addEventListener("change", function () {
          const layer = GEOLAYERS[fileKey];
          if (!layer) return;
          if (this.checked) {
            map.addLayer(layer);
          } else {
            map.removeLayer(layer);
          }
        });
      });

      // Show/hide popup on group header click
      groupDiv.addEventListener("click", e => {
        // Hide all other popups
        sidebar.querySelectorAll(".popup-sidemenu").forEach(p => {
          if (p !== popup) p.style.display = "none";
        });

        // Toggle current popup visibility
        popup.style.display = popup.style.display === "none" ? "flex" : "none";

        // Position popup relative to clicked groupDiv
        popup.style.top = `${groupDiv.offsetTop}px`;

        e.stopPropagation();
      });

      container.appendChild(groupDiv);
      container.appendChild(popup);
    });

    dropdown.appendChild(toggle);
    dropdown.appendChild(container);
    sidebar.appendChild(dropdown);

    // Hide popups when clicking outside
    document.body.addEventListener("click", () => {
      sidebar.querySelectorAll(".popup-sidemenu").forEach(p => p.style.display = "none");
    });
  });
});
