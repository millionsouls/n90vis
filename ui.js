let selectedFeature = null;
let labelMarker = null;
const labelMarkers = []; // Track all labels

function showLabel(feature) {
  const coords = feature.geometry.coordinates[0];
  const centroid = coords.reduce((acc, coord) => {
    acc[0] += coord[0];
    acc[1] += coord[1];
    return acc;
  }, [0, 0]).map(val => val / coords.length);

  if (labelMarker) map.removeLayer(labelMarker);
  labelMarker = L.marker([centroid[1], centroid[0]], {
    icon: L.divIcon({
      className: '',
      html: `<div class="feature-label">
              <b>${feature.properties.name}</b>
              ${feature.properties.countA}
              ${feature.properties.countB}
            </div>`
    }),
    interactive: false
  }).addTo(map);
}

function handleFeatureClick(feature, layer, geoLayer) {
  layer.on('click', () => {
    if (selectedFeature === feature) {
      selectedFeature = null;
      if (labelMarker) map.removeLayer(labelMarker);
    } else {
      selectedFeature = feature;
      showLabel(feature);
    }
    resetStyles(geoLayer);
  });
}

function styleFeature(feature) {
  return {
    color: "#3388ff",
    weight: (selectedFeature === feature) ? 3 : 1,
    fillOpacity: (selectedFeature === feature) ? 0.3 : 0
  };
}

function resetStyles(geoLayer) {
  if (geoLayer && geoLayer.eachLayer) {
    geoLayer.eachLayer(layer => {
      if (layer.feature) {
        layer.setStyle(styleFeature(layer.feature));
      }
    });
  }
}