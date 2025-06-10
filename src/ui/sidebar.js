/**
 * Dynamically creates a sidebar and autofills with options based on loaded .geojson files
 */

const categoryMap = {
  sectors: "Sectors",
  stars: "STARs",
  sids: "SIDs",
  videomap: "Videomap"
};

/**
 * Builds the sidebar menu with dropdowns and toggles
 * 
 * @param {Object} GEODATA 
 * @param {Object} GEOLAYERS 
 * @param {L.Map} map
 * @param {Function} updateURLFromMapState
 */
function buildSidebar(GEODATA, GEOLAYERS, map, updateURLFromMapState) {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = ""; // Clear existing content

  Object.entries(GEODATA).forEach(([airport, categories]) => {
    const dropdown = document.createElement("div");
    dropdown.className = "dropdown";

    const toggle = document.createElement("div");
    toggle.className = "dropdown-toggle";
    toggle.innerHTML = `<span>${airport}</span><i class="fa fa-caret-left"></i>`;

    const container = document.createElement("div");
    container.className = "dropdown-container";

    Object.entries(categories).forEach(([categoryLabel, namesOrObject]) => {
      let names;

      // Detect if sectors are stored as nested object (new structure)
      if (categoryLabel === 'sectors' && namesOrObject && typeof namesOrObject === 'object' && !Array.isArray(namesOrObject)) {
        // Get file names (keys)
        names = Object.keys(namesOrObject);
      } else if (Array.isArray(namesOrObject)) {
        // Legacy flat array structure
        names = namesOrObject;
      } else {
        // Unexpected data structure, skip this category
        return;
      }

      if (!names.length) return;

      const groupDiv = document.createElement("div");
      groupDiv.className = "sidemenu-toggle";
      const displayName = categoryMap[categoryLabel] || categoryLabel;
      groupDiv.innerHTML = `<span>${displayName}</span><i class="fa fa-caret-right"></i>`;

      const popup = document.createElement("div");
      popup.className = "popup-sidemenu";
      popup.style.display = "none";

      names.forEach(name => {
        const id = `toggle-${airport}${categoryLabel}${name}`;

        const div = document.createElement("div");
        div.innerHTML = `<input type="checkbox" id="${id}"> <label for="${id}">${name}</label>`;
        popup.appendChild(div);

        if (categoryLabel === 'sectors') {
          const positionLayers = GEOLAYERS[airport]?.[categoryLabel]?.[name];
          if (typeof positionLayers === 'object') {
            const sectorCheckbox = div.querySelector("input");

            sectorCheckbox.addEventListener("change", function () {
              const rightbar = document.getElementById("rightbar");
              const airportGroupId = `rightbar-airport-${airport}`;
              const fileId = `rightbar-file-${airport}-${name}`;

              // Remove if unchecked
              if (!this.checked) {
                const fileContainer = document.getElementById(fileId);
                if (fileContainer) fileContainer.remove();

                const airportContainer = document.getElementById(airportGroupId);
                if (airportContainer && airportContainer.querySelectorAll('.rightbar-file').length === 0) {
                  airportContainer.remove();
                }

                return;
              }

              // Create airport group if it doesn't exist
              let airportContainer = document.getElementById(airportGroupId);
              if (!airportContainer) {
                airportContainer = document.createElement("div");
                airportContainer.id = airportGroupId;
                airportContainer.className = "rightbar-airport-group";
                airportContainer.style.marginBottom = "16px";

                const header = document.createElement("div");
                header.className = "position-airport-header dropdown-toggle";
                header.innerText = airport;
                airportContainer.appendChild(header);

                rightbar.appendChild(airportContainer);
              }

              // Create sector file container
              const fileContainer = document.createElement("div");
              fileContainer.className = "rightbar-file";
              fileContainer.id = fileId;

              const fileLabel = document.createElement("div");
              fileLabel.innerText = name; // sector file name, e.g., east/west
              fileLabel.style.fontWeight = "600";
              fileContainer.appendChild(fileLabel);

              Object.entries(positionLayers).forEach(([positionName, layer]) => {
                const posId = `toggle-${airport}${categoryLabel}${name}${positionName}`;
                const div = document.createElement("div");
                div.className = `position-id-toggle`
                div.innerHTML = `<input type="checkbox" id="${posId}" checked> <label for="${posId}">${positionName}</label>`;
                fileContainer.appendChild(div);

                div.querySelector("input").addEventListener("change", function () {
                  if (layer instanceof L.Layer || layer instanceof L.LayerGroup) {
                    if (!this.checked) {
                      map.removeLayer(layer);
                    } else {
                      map.addLayer(layer);
                    }

                    updateURLFromMapState();
                  }
                });
              });

              airportContainer.appendChild(fileContainer);
            });
          }
        }


        div.querySelector("input").addEventListener("change", function () {
          const entry = GEOLAYERS[airport]?.[categoryLabel]?.[name];
          if (!entry) return;

          // If the entry is a single Leaflet Layer or LayerGroup (legacy or videomap, stars, sids)
          if (entry instanceof L.Layer || entry instanceof L.LayerGroup) {
            if (this.checked) {
              map.addLayer(entry);
            } else {
              map.removeLayer(entry);
            }
          }
          // If entry is an object of position-layer groups (sectors)
          else if (typeof entry === 'object') {
            Object.values(entry).forEach(layer => {
              if (layer instanceof L.Layer || layer instanceof L.LayerGroup) {
                if (this.checked) {
                  map.addLayer(layer);
                } else {
                  map.removeLayer(layer);
                }
              }
            });
          }
          updateURLFromMapState();
        });
      });

      groupDiv.addEventListener("click", e => {
        // Close other popups first
        sidebar.querySelectorAll(".popup-sidemenu").forEach(p => {
          if (p !== popup) p.style.display = "none";
        });

        popup.style.display = popup.style.display === "none" ? "flex" : "none";
        // Calculate the top position relative to the viewport
        const rect = groupDiv.getBoundingClientRect();
        popup.style.top = `${rect.top}px`;

        e.stopPropagation();
      });

      container.appendChild(groupDiv);
      container.appendChild(popup);
    });

    dropdown.appendChild(toggle);
    dropdown.appendChild(container);
    sidebar.appendChild(dropdown);

    // Close popups when clicking outside
    document.body.addEventListener("click", (e) => {
      const clickedInsidePopup = e.target.closest(".popup-sidemenu");
      if (!clickedInsidePopup) {
        sidebar.querySelectorAll(".popup-sidemenu").forEach(p => {
          p.style.display = "none";
        });
      }
    });
  });
}

/**
 * Attach dropdown toggle event handlers (optional if not inline)
 * 
 * @param {HTMLElement} sidebar 
 */
function attachSidebarListeners(sidebar) {
  sidebar.addEventListener("click", function (e) {
    const toggle = e.target.closest(".dropdown-toggle");
    if (toggle) {
      const container = toggle.nextElementSibling;
      if (container && container.classList.contains("dropdown-container")) {
        const isOpen = container.style.display === "block";
        container.style.display = isOpen ? "none" : "block";
        toggle.classList.toggle("open", !isOpen);
      }
      e.stopPropagation();
    }
  });
}

export { buildSidebar, attachSidebarListeners };
