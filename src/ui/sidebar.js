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

    Object.entries(categories).forEach(([categoryLabel, names]) => {
      if (!names.length) return;

      const groupDiv = document.createElement("div");
      groupDiv.className = "sidemenu-toggle";
      const displayName = categoryMap[categoryLabel.toLowerCase()] || categoryLabel;
      groupDiv.innerHTML = `<span>${displayName}</span><i class="fa fa-caret-right"></i>`;

      const popup = document.createElement("div");
      popup.className = "popup-sidemenu";
      popup.style.display = "none";

      names.forEach(name => {
        const id = `toggle-${airport}${categoryLabel}${name}`;

        const div = document.createElement("div");
        div.innerHTML = `<input type="checkbox" id="${id}"> <label for="${id}">${name.toUpperCase()}</label>`;
        popup.appendChild(div);

        div.querySelector("input").addEventListener("change", function () {
          const layer = GEOLAYERS[airport]?.[categoryLabel]?.[name];
          if (!layer) return;

          if (this.checked) {
            map.addLayer(layer);
          } else {
            map.removeLayer(layer);
          }
          
          updateURLFromMapState();
        });
      });

      groupDiv.addEventListener("click", e => {
        // Close other popups
        sidebar.querySelectorAll(".popup-sidemenu").forEach(p => {
          if (p !== popup) p.style.display = "none";
        });

        popup.style.display = popup.style.display === "none" ? "flex" : "none";
        popup.style.top = `${groupDiv.offsetTop}px`;

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
