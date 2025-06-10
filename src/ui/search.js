/**
 * Handles search mechanics for looking something up
 */

/**
 * Setup search input event, filtering, rendering results and toggling layers
 * 
 * @param {Object} GEODATA 
 * @param {Object} GEOLAYERS 
 * @param {L.Map} map 
 * @param {Function} updateURLFromMapState 
 */
function setupSearch(GEODATA, GEOLAYERS, map, updateURLFromMapState) {
  const searchInput = document.getElementById("search-input");
  const resultsContainer = document.getElementById("search-results");

  // Position results container next to search input
  const rect = searchInput.getBoundingClientRect();
  resultsContainer.style.top = `${rect.top - searchInput.offsetHeight}px`;
  resultsContainer.style.left = `${rect.left + searchInput.offsetWidth - 2}px`;

  // Hide results on outside click
  document.body.addEventListener("click", (e) => {
    if (!e.target.closest("#search-results") && e.target !== searchInput) {
      resultsContainer.style.display = "none";
    }
  });

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    resultsContainer.innerHTML = "";

    if (!query) {
      resultsContainer.style.display = "none";
      return;
    }

    const keywords = query.split(/\s+/).filter(k => k.trim() !== "").map(k => k.toLowerCase());

    const matches = [];

    Object.entries(GEODATA).forEach(([airport, categories]) => {
      Object.entries(categories).forEach(([category, names]) => {
        names.forEach(name => {
          const combinedString = `[${airport}] ${name}`.toLowerCase();
          const allMatch = keywords.every(kw => combinedString.includes(kw));
          if (allMatch) {
            matches.push({ airport, category, name });
          }
        });
      });
    });

    if (matches.length === 0) {
      resultsContainer.style.display = "none";
      return;
    }

    matches.forEach(({ airport, category, name }) => {
      const id = `toggle-${airport}${category}${name}`;
      const layer = GEOLAYERS[airport]?.[category]?.[name];
      const originalCheckbox = document.getElementById(id);

      const wrapper = document.createElement("div");
      wrapper.className = "search-result";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = originalCheckbox?.checked || false;
      cb.id = `search-${id}`;

      cb.addEventListener("change", () => {
        if (!layer || !originalCheckbox) return;
        originalCheckbox.checked = cb.checked;

        if (cb.checked) {
          map.addLayer(layer);
        } else {
          map.removeLayer(layer);
        }

        updateURLFromMapState();
      });

      const label = document.createElement("label");
      label.htmlFor = cb.id;
      label.textContent = `[${airport.toUpperCase()}] [${category.toUpperCase()}] ${name.toUpperCase()}`;

      wrapper.appendChild(cb);
      wrapper.appendChild(label);
      resultsContainer.appendChild(wrapper);
    });

    resultsContainer.style.display = "flex";
  });
}

export { setupSearch };
