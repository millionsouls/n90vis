let selectedFeature = null;
let labelMarker = null;
let videoLayer = null;

let hoverInfoBox = document.getElementById('hover-info-box');
let hoveredFeatures = [];
let hoverLayers = [];
let mouseMoveHandler = null;

// Helper to build info HTML for a feature
function buildFeatureInfoHTML(features) {
  // Group by Position
  const grouped = {};
  features.forEach(f => {
    const pos = f.properties.Position || '';
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(f);
  });

  return Object.entries(grouped).map(([pos, feats]) => {
    // Collect unique low/high pairs
    const altRows = feats.map(f => {
      const low = f.properties.Low ?? '';
      const high = f.properties.High ?? '';
      if (low === high) {
        return { low: low, high: '' };
      } else {
        return { low, high };
      }
    });
    // Remove duplicates
    const uniqueAltRows = [];
    const seen = new Set();
    altRows.forEach(row => {
      const key = `${row.low}|${row.high}`;
      if (!seen.has(key)) {
        uniqueAltRows.push(row);
        seen.add(key);
      }
    });
    // Notes (combine all notes for this position)
    const notes = feats.map(f => f.properties.Notes).filter(Boolean).join('\n');
    // Color (use first feature's color)
    const color = feats[0].properties.Color || "#222";
    return `
      <div class="feature-info-row" style="color:${color};">
        <div class="feature-info-pos">${pos}</div>
        <div>
          ${uniqueAltRows.map(row => `
            <div style="display:flex;">
              <div class="feature-info-low" style="flex:1;">${row.low}</div>
              <div class="feature-info-high" style="flex:1;">${row.high}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${notes ? `<div class="notes" style="margin-bottom:4px;">${notes}</div>` : ''}
    `;
  }).join('');
}

// Show info box at cursor with all features
function showHoverInfoBox(features, event) {
  if (!features.length) {
    hoverInfoBox.style.display = 'none';
    return;
  }
  hoverInfoBox.innerHTML = buildFeatureInfoHTML(features);
  hoverInfoBox.style.display = 'block';
  // Position box near cursor, but not off screen
  let x = event.originalEvent.clientX + 15;
  let y = event.originalEvent.clientY + 15;
  let boxRect = hoverInfoBox.getBoundingClientRect();
  let winW = window.innerWidth, winH = window.innerHeight;
  if (x + boxRect.width > winW) x = winW - boxRect.width - 10;
  if (y + boxRect.height > winH) y = winH - boxRect.height - 10;
  hoverInfoBox.style.left = x + 'px';
  hoverInfoBox.style.top = y + 'px';
}

// Remove info box
function hideHoverInfoBox() {
  hoverInfoBox.style.display = 'none';
}

// Attach hover events to each polygon layer
function handleFeatureHover(feature, layer, geoLayer) {
  layer.on('mousemove', function (e) {
    let featuresAtPoint = [];
    map.eachLayer(l => {
      if (l.feature && l.getBounds && l.getBounds().contains(e.latlng)) {
        featuresAtPoint.push(l.feature);
      }
    });
    showHoverInfoBox(featuresAtPoint, e);
  });
  layer.on('mouseout', function () {
    hideHoverInfoBox();
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

function loadVideoMap(url) {
  fetch(url)
    .then(res => res.json())
    .then(geojson => {
      if (videoLayer) {
        map.removeLayer(videoLayer);
      }
      videoLayer = L.geoJSON(geojson, {
        style: feature => {
          // Style for LineString, Polygon, etc.
          if (feature.geometry.type === "LineString") {
            return { color: "#ff6600", weight: 2 };
          }
          if (feature.geometry.type === "Polygon") {
            return { color: "#ff6600", weight: 2, fillOpacity: 0.1 };
          }
          return {};
        },
        pointToLayer: (feature, latlng) => {
          // Style for Points
          return L.circleMarker(latlng, { radius: 4, color: "#ff6600" });
        }
      }).addTo(map);
    });
}

function toggleVideoMap(show) {
  if (show) {
    loadVideoMap('data/videomap/JFK.geojson');
  } else if (videoLayer) {
    map.removeLayer(videoLayer);
    videoLayer = null;
  }
}