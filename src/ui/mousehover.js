/**
 * UI and interaction logic for the map application
 * 
 * only the devil knows what's going on here
 */

let selectedFeature = null;
let labelMarker = null;
let videoLayer = null;

let hoverInfoBox = document.getElementById('hover-info-box');
let hoveredFeatures = [];
let hoverLayers = [];
let mouseMoveHandler = null;

/**
 * Format altitudes into 000
 * 
 * @param {int} val 
 * @returns 
 */
function formatAlt(val) {
  // Only format if it's a number and >= 0
  if (typeof val === "number" || /^\d+$/.test(val)) {
    let num = Number(val);
    if (num === 0) return 'SFC'; // Surface level
    if (num >= 1000) {
      let hundreds = Math.round(num / 100);
      return hundreds.toString().padStart(3, '0');
    }
    return num.toString();
  }
  return val; // If not a number, return as is
}

/**
 * Construct and format the data for a layer/combine all layers of same position
 * Position | Low | High
 * 
 * @param {Array.<string>} features 
 * @returns 
 */
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

      // Format numbers
      const lowFmt = formatAlt(low);
      const highFmt = formatAlt(high);
      if (low === high) {
        return { low: lowFmt, high: '' };
      } else {
        return { low: lowFmt, high: highFmt };
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

    // Notes UNUSED
    // ${notes ? `<div class="notes" style="margin-bottom:4px;">${notes}</div>` : ''}
    const notes = feats.map(f => f.properties.Notes).filter(Boolean).join('\n');

    // Color text using layer color
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
    `;
  }).join('');
}

/**
 * Show the info box when over a layer
 * 
 * @param {*} features 
 * @param {*} event 
 * @returns 
 */
function showHoverInfoBox(features, event) {
  if (!features.length) {
    hoverInfoBox.style.display = 'none';
    return;
  }

  hoverInfoBox.innerHTML = buildFeatureInfoHTML(features);
  hoverInfoBox.style.display = 'block';
  
  // Position box Southwest of cursor
  let x = event.originalEvent.clientX + 15;
  let y = event.originalEvent.clientY + 15;
  let boxRect = hoverInfoBox.getBoundingClientRect();
  let winW = window.innerWidth, winH = window.innerHeight;

  if (x + boxRect.width > winW) x = winW - boxRect.width - 10;
  if (y + boxRect.height > winH) y = winH - boxRect.height - 10;

  hoverInfoBox.style.left = x + 'px';
  hoverInfoBox.style.top = y + 'px';
}

/**
 * Remove hover info box on leaving a layer
 */
function hideHoverInfoBox() {
  hoverInfoBox.style.display = 'none';
}

/**
 * Ensure a latlng is within a certain polygon
 * 
 * @param {*} latlng 
 * @param {*} polygon 
 * @returns 
 */
function isLatLngInPolygon(latlng, polygon) {
  if (!polygon.getLatLngs) return false;
  const polyPoints = polygon.getLatLngs()[0];
  let inside = false;
  for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
    const xi = polyPoints[i].lat, yi = polyPoints[i].lng;
    const xj = polyPoints[j].lat, yj = polyPoints[j].lng;
    const intersect = ((yi > latlng.lng) !== (yj > latlng.lng)) &&
      (latlng.lat < (xj - xi) * (latlng.lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Attach hover handles to every layer feature; detect if mouse is over a feature and show/hide info box
 * 
 * @param {*} feature 
 * @param {*} layer 
 * @param {*} geoLayer 
 */
function handleFeatureHover(feature, layer, geoLayer) {
  layer.on('mousemove', function (e) {
    let featuresAtPoint = [];
    map.eachLayer(l => {
      if (l.feature && l.getBounds && l.getBounds().contains(e.latlng)) {
        // For polygons, check actual geometry
        if (l instanceof L.Polygon && !isLatLngInPolygon(e.latlng, l)) return;
        featuresAtPoint.push(l.feature);
      }
    });
    showHoverInfoBox(featuresAtPoint, e);
  });

  layer.on('mouseout', function () {
    hideHoverInfoBox();
  });
}