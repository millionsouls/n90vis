/**
 * Dynamically creates a sidebar and autofills with options based on loaded .geojson files
 */

const categoryMap = {
  sectors: "Sectors",
  stars: "STARs",
  sids: "SIDs",
  videomap: "Videomap"
};

function buildCheckbox(id, label, checked = false) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<input type="checkbox" id="${id}" ${checked ? 'checked' : ''}> <label for="${id}">${label}</label>`;
  return wrapper;
}

function buildToggle(map, positionLayers, parentId, airport, categoryLabel, name, updateURLFromMapState) {
  const container = document.createElement("div");
  container.className = "rightbar-file";
  container.id = parentId;

  const header = document.createElement("div");
  header.innerText = name;
  header.style.fontWeight = "600";
  container.appendChild(header);

  Object.entries(positionLayers).forEach(([positionName, layer]) => {
    const posId = `toggle-${airport}${categoryLabel}${name}${positionName}`;
    const checkboxDiv = buildCheckbox(posId, positionName, true);
    checkboxDiv.className = "position-id-toggle";

    checkboxDiv.querySelector("input").addEventListener("change", function () {
      if (layer instanceof L.Layer || layer instanceof L.LayerGroup) {
        this.checked ? map.addLayer(layer) : map.removeLayer(layer);
        updateURLFromMapState();
      }
    });

    container.appendChild(checkboxDiv);
  });

  return container;
}

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
  sidebar.innerHTML = "";

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
      if (categoryLabel === 'sectors' && typeof namesOrObject === 'object' && !Array.isArray(namesOrObject)) {
        names = Object.keys(namesOrObject);
      } else if (Array.isArray(namesOrObject)) {
        names = namesOrObject;
      } else {
        return;
      }

      if (!names.length) return;

      // sidemenu enabled via changing the length condition
      const displayName = categoryMap[categoryLabel] || categoryLabel;
      const targetContainer = names.length < 99 ? container : document.createElement("div");

      if (names.length >= 99) {
        targetContainer.className = "popup-sidemenu";
        targetContainer.style.display = "none";

        const groupDiv = document.createElement("div");
        groupDiv.className = "sidemenu-toggle";
        groupDiv.innerHTML = `<span>${displayName}</span><i class="fa fa-caret-right"></i>`;

        groupDiv.addEventListener("click", e => {
          sidebar.querySelectorAll(".popup-sidemenu").forEach(p => {
            if (p !== targetContainer) p.style.display = "none";
          });

          targetContainer.style.display = targetContainer.style.display === "none" ? "flex" : "none";
          targetContainer.style.top = `${groupDiv.getBoundingClientRect().top}px`;
          e.stopPropagation();
        });

        container.appendChild(groupDiv);
        container.appendChild(targetContainer);
      } else {
        const label = document.createElement("div");
        label.style.fontWeight = "600";
        label.style.marginTop = "6px";
        label.innerHTML = displayName
        container.appendChild(label);
      }

      names.forEach(name => {
        const checkboxId = `toggle-${airport}${categoryLabel}${name}`;
        const checkboxDiv = buildCheckbox(checkboxId, name);
        targetContainer.appendChild(checkboxDiv);

        const checkbox = checkboxDiv.querySelector("input");

        checkbox.addEventListener("change", function () {
          const entry = GEOLAYERS[airport]?.[categoryLabel]?.[name];
          if (!entry) return;

          if (entry instanceof L.Layer || entry instanceof L.LayerGroup) {
            this.checked ? map.addLayer(entry) : map.removeLayer(entry);
          } else if (typeof entry === 'object') {
            Object.values(entry).forEach(layer => {
              if (layer instanceof L.Layer || layer instanceof L.LayerGroup) {
                this.checked ? map.addLayer(layer) : map.removeLayer(layer);
              }
            });
          }

          updateURLFromMapState();
        });

        // For sectors, manage the right bar expansion
        if (categoryLabel === 'sectors') {
          const positionLayers = GEOLAYERS[airport]?.[categoryLabel]?.[name];
          if (typeof positionLayers !== 'object') return;

          checkbox.addEventListener("change", function () {
            const rightbar = document.getElementById("rightbar");
            const groupId = `rightbar-airport-${airport}`;
            const fileId = `rightbar-file-${airport}-${name}`;

            if (!this.checked) {
              const fileContainer = document.getElementById(fileId);
              if (fileContainer) fileContainer.remove();

              const groupContainer = document.getElementById(groupId);
              if (groupContainer && groupContainer.querySelectorAll('.rightbar-file').length === 0) {
                groupContainer.remove();
              }
              return;
            }

            let groupContainer = document.getElementById(groupId);
            if (!groupContainer) {
              groupContainer = document.createElement("div");
              groupContainer.id = groupId;
              groupContainer.className = "rightbar-airport-group";
              groupContainer.style.marginBottom = "16px";

              const header = document.createElement("div");
              header.className = "position-airport-header dropdown-toggle";
              header.innerText = airport;

              groupContainer.appendChild(header);
              rightbar.appendChild(groupContainer);
            }

            const fileContainer = buildToggle(map, positionLayers, fileId, airport, categoryLabel, name, updateURLFromMapState);
            groupContainer.appendChild(fileContainer);
          });
        }
      });
    });

    dropdown.appendChild(toggle);
    dropdown.appendChild(container);
    sidebar.appendChild(dropdown);
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
