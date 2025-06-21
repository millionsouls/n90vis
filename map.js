// Map creation and manipulation
const CONFIG = {
  center: [40.703376, -74.015415],
  zoom: 7.5,
  minZoom: 4,
  maxZoom: 15,
  bounds: [
    [20, -140],
    [50, -60]
  ],
}
const baseLayers = {
  "OSM Standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }),
  "OSM Topo": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: '© OpenTopoMap contributors'
  }),
  "OSM Hot": L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
  })
};
let currentLayer = baseLayers["OSM Standard"];
const map = L.map('map', {
  center: CONFIG.center,
  zoom: CONFIG.zoom,
  minZoom: CONFIG.minZoom,
  maxZoom: CONFIG.maxZoom,
  maxBounds: CONFIG.bounds,
  layers: [currentLayer]
});
const showMapCheckbox = document.getElementById('toggle-basemap');

L.control.layers(baseLayers, null, { position: 'topright', collapsed: false }).addTo(map);

map.on('baselayerchange', function(e) {
  currentLayer = baseLayers[e.name];
  showMapCheckbox.checked = true;
});

showMapCheckbox.addEventListener('change', function() {
  if (this.checked) {
    map.addLayer(currentLayer);
  } else {
    Object.values(baseLayers).forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
  }
});