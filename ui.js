let selectedFeature = null;
let labelMarker = null;

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
      className: 'divIcon',
      html: `
      <div class="feature-label">
        <div style="font-size:12px; text-align:center;"><b>${feature.properties.name}</b></div>
        <div class="flex-center">
          <span class="text-center">${feature.properties.countA}</span>
          <span class="text-center">${feature.properties.countB}</span>
        </div>
      </div>
     `}),
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