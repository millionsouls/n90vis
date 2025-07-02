/**
 * UI and interaction logic for the map application
 * 
 * only the devil knows what's going on here
 */

const featureInfoBox = document.getElementById('feature-info-box');
const notesHoverBox = document.getElementById("notes-hover-box");

import { map } from '../map.js';

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

function isColorBright(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Relative luminance formula
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
  return brightness > 210;
}

function hexToRGBA(hex, alpha = 0.8) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Construct and format the data for a layer/combine all layers of same position
 * Position | Low | High
 * 
 * @param {Array.<string>} features 
 * @returns 
 */
function buildFeatureInfoHTML(features) {
  const grouped = {};

  features.forEach(f => {
    const pos = f.properties.Position || '';
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(f);
  });

  const groupBlocks = Object.entries(grouped).map(([pos, feats]) => {
    const altSet = new Set();
    const altRows = [];

    feats.forEach(f => {
      const lowRaw = f.properties.Low ?? '';
      const highRaw = f.properties.High ?? '';
      const lowFmt = formatAlt(lowRaw);
      const highFmt = (lowRaw === highRaw) ? '' : formatAlt(highRaw);

      const key = `${lowFmt}|${highFmt}`;
      if (!altSet.has(key)) {
        altSet.add(key);
        altRows.push({ low: lowFmt, high: highFmt });
      }
    });

    altRows.sort((a, b) => {
      const parse = v => v === 'SFC' ? 0 : parseInt(v, 10) || 0;
      return parse(a.low) - parse(b.low);
    });

    const minLow = Math.min(...altRows.map(r => r.low === 'SFC' ? 0 : parseInt(r.low, 10) || 0));
    const color = feats[0].properties.Fill || "#222";
    const isBright = isColorBright(color);
    const textColor = isBright ? '#000' : '#fff';

    const html = `
      <div class="feature-info-row" style="background:${color}; color:${textColor}; padding: 4px; border-radius: 4px;">
        <div class="feature-info-pos">${pos}</div>
        <div>
          ${altRows.map(row => `
            <div style="display:flex;">
              <div class="feature-info-low" style="flex:1;">${row.low}</div>
              <div class="feature-info-high" style="flex:1;">${row.high}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    return { html, minLow };
  });

  groupBlocks.sort((a, b) => a.minLow - b.minLow);

  return groupBlocks.map(g => g.html).join('');
}

/**
 * Show the info box when over a layer
 * 
 * @param {*} features 
 * @param {*} event 
 * @returns 
 */
function showfeatureInfoBox(features, event) {
  if (!features.length) {
    featureInfoBox.style.display = 'none';
    return;
  }

  featureInfoBox.innerHTML = buildFeatureInfoHTML(features);
  featureInfoBox.style.display = 'block';

  // Position box Southwest of cursor
  let x = event.originalEvent.clientX + 5;
  let y = event.originalEvent.clientY + 5;
  let boxRect = featureInfoBox.getBoundingClientRect();
  let winW = window.innerWidth, winH = window.innerHeight;

  if (x + boxRect.width > winW) x = winW - boxRect.width ;
  if (y + boxRect.height > winH) y = winH - boxRect.height ;

  featureInfoBox.style.left = x + 'px';
  featureInfoBox.style.top = y + 'px';
}

/**
 * Remove hover info box on leaving a layer
 */
function hidefeatureInfoBox() {
  featureInfoBox.style.display = 'none';
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
function handleFeatureHover(feature, layer) {
  const mapContainer = map.getContainer();
  if (!mapContainer) return;

  const isMarker = layer instanceof L.Marker
  const isPolygon = layer instanceof L.Polygon

  layer.on('mouseover', function (e) {
    mapContainer.classList.add('hovering-feature');

    if (isMarker && feature?.properties?.notes) {
      notesHoverBox.innerHTML = feature.properties.notes;
      notesHoverBox.style.display = 'block';
    }
  });

  layer.on('mouseout', function () {
    mapContainer.classList.remove('hovering-feature');
    hidefeatureInfoBox();
    notesHoverBox.style.display = 'none';
  });

  layer.on('mousemove', function (e) {
    let featuresAtPoint = [];

    if (isMarker) {
      featuresAtPoint.push(feature);

      if (feature?.properties?.notes) {
        // Position notes box top-left of cursor
        let x = e.originalEvent.clientX + 5;
        let y = e.originalEvent.clientY - notesHoverBox.offsetHeight - 5;

        // Clamp so it doesn't go off screen
        if (x < 0) x = 5;
        if (y < 0) y = 5;

        notesHoverBox.style.left = x + 'px';
        notesHoverBox.style.top = y + 'px';
      } else {
        notesHoverBox.style.display = 'none';
      }
      // Don't show feature info box for markers
      hidefeatureInfoBox();
      return;
    }

    if (isPolygon) {
      // Only collect polygon features to show in the feature info box
      let featuresAtPoint = [];
      map.eachLayer(l => {
        if (l.feature && l.getBounds && l.getBounds().contains(e.latlng)) {
          if (l instanceof L.Polygon || l instanceof L.MultiPolygon) {
            if (!isLatLngInPolygon(e.latlng, l)) return;
            featuresAtPoint.push(l.feature);
          }
        }
      });
      showfeatureInfoBox(featuresAtPoint, e);
    } else {
      // For non-polygon, hide feature info box
      hidefeatureInfoBox();
    }
  });
}



export { handleFeatureHover }