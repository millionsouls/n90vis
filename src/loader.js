/**
 * loader.js
 * 
 * Loads geojson files
 */

import { buildMarker } from './constraints.js';
import { handleFeatureHover } from './ui/mouse-hover.js';

const categoryMap = {
  sectors: "Sectors",
  stars: "STARs",
  sids: "SIDs",
  videomap: "Videomap"
};

const GEODATA = {};
const GEOLAYERS = {};
const fetchPromises = [];

function ensurePane(map, paneName, zIndex) {
  if (!map.getPane(paneName)) {
    map.createPane(paneName);
    map.getPane(paneName).style.zIndex = zIndex;
  }
}

function inferCategory(data) {
  if (!data || !data.features || !Array.isArray(data.features)) return null;

  const props = data.features[0]?.properties || {};

  if ('Position' in props) return 'sectors';
  if ('type' in props && ['STAR', 'SID'].includes(props.type.toUpperCase())) {
    return props.type.toLowerCase();
  }

  if (data.name?.toLowerCase().includes('video')) return 'videomap';

  return null;
}

function loadPD(map, data, fmtName) {
  const linePane = `pane-lines-${fmtName}`;
  const markerPane = `pane-markers-${fmtName}`;

  ensurePane(map, linePane, 800);
  ensurePane(map, markerPane, 900);

  const markers = [];
  const lines = [];

  data.features.forEach(f => {
    const props = f.properties || {};
    const color = props.color || "#0000ff";

    if (f.geometry.type === "Point") {
      const coords = f.geometry.coordinates;

      const markerDiv = document.createElement("div");
      markerDiv.style = 'display: flex; flex-direction: column; align-items: center;';
      markerDiv.innerHTML = 'Loading';

      const marker = L.marker([coords[1], coords[0]], {
        pane: markerPane,
        icon: L.divIcon({
          className: 'procedure-icon',
          html: markerDiv,
          iconAnchor: [6, 6]
        })
      });

      const feature = { properties: props };
      handleFeatureHover(feature, marker);

      buildMarker(props, props.type, props.icon).then(html => {
        markerDiv.innerHTML = html;
      });

      markers.push(marker);
    } else if (f.geometry.type === "LineString") {
      const line = L.polyline(f.geometry.coordinates.map(([lng, lat]) => [lat, lng]), {
        color: color,
        weight: 3,
        opacity: 1,
        pane: linePane
      });
      lines.push(line);
    }
  });

  const linesGroup = L.layerGroup(lines);
  const markersGroup = L.layerGroup(markers);
  return L.layerGroup([linesGroup, markersGroup]);
}

function loadVM(map, data, fmtName) {
  const videoStyle = feature => {
    if (feature.geometry.type === "LineString") {
      return { color: "#000000", weight: 1 };
    }
    return {};
  };

  const videoPoint = () => null;
  const geoJsonLayer = L.geoJSON(data, {
    style: videoStyle,
    pointToLayer: videoPoint
  });

  return L.layerGroup([geoJsonLayer]);
}

function loadSector(map, data, upperKey, category, name) {
  const zIndex = data.features[0]?.properties?.style?.zIndex || 0;
  const featureGroups = {};

  for (const feature of data.features) {
    const props = feature.properties || {};
    const position = props.Position || "UNKNOWN";
    const color = props.Fill || "#3388ff";

    const paneName = `pane-${[upperKey, category, name, position].join('_').replace(/[^\w]/g, '')}`;
    ensurePane(map, paneName, 200 + zIndex);

    const geoJsonLayer = L.geoJSON(feature, {
      pane: paneName,
      style: {
        color, weight: 3, opacity: 1,
        fillColor: color,
        fillOpacity: 0.4
      },
      onEachFeature: handleFeatureHover
    });

    if (!featureGroups[position]) featureGroups[position] = [];
    featureGroups[position].push(geoJsonLayer);
  }

  const positionGroups = {};
  for (const [position, layers] of Object.entries(featureGroups)) {
    positionGroups[position] = L.layerGroup(layers);
  }

  return positionGroups;
}

function storeMetadata(upperKey, category, name, group, isArray = false) {
  GEOLAYERS[upperKey] ??= {};
  GEOLAYERS[upperKey][category] ??= {};
  GEOLAYERS[upperKey][category][name] = group;

  GEODATA[upperKey] ??= {};
  GEODATA[upperKey][category] ??= isArray ? [] : {};
  if (isArray) {
    GEODATA[upperKey][category].push(name);
  } else {
    GEODATA[upperKey][category][name] = Object.keys(group);
  }
}

/**
 * Loads GEOJSON files, creates Leaflet layers and populates GEODATA, GEOLAYERS
 * 
 * @param {Object} GEOFILES - Files config
 * @param {L.Map} map - Leaflet map instance
 * @returns {Promise<{GEODATA:Object, GEOLAYERS:Object}>}
 */
function loadGeoFiles(GEOFILES, map) {
  Object.entries(GEOFILES).forEach(([key, fileArray]) => {
    const upperKey = key.toUpperCase();
    GEODATA[upperKey] = { sectors: {}, stars: [], sids: [], videomap: [] };

    fileArray.forEach(file => {
      const fetchPromise = fetch(`data/${key}/${file}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status} on ${file}`);
          return res.json();
        })
        .then(data => {
          if (!data.features) throw new Error('Invalid GeoJSON: missing features');

          const name = data.name || file.split("/").pop().split('.')[0];
          const fmtName = `${upperKey}_${name}`.replace(/[^\w]/g, '');
          const fileParts = file.split("/");
          let categoryHint = fileParts.length > 1 ? fileParts[0].toLowerCase() : null;

          let category;
          if (["sectors", "stars", "sids", "videomap"].includes(categoryHint)) {
            category = categoryHint;
          } else {
            category = inferCategory(data);
          }

          if (!category) {
            console.warn(`Could not determine category for file: ${file}`);
            return;
          }

          let group;
          if (category === "stars" || category === "sids") {
            group = loadPD(map, data, fmtName);
            storeMetadata(upperKey, category, name, group, true);
          } else if (category === "videomap") {
            group = loadVM(map, data, fmtName);
            storeMetadata(upperKey, category, name, group, true);
          } else {
            group = loadSector(map, data, upperKey, category, name);
            storeMetadata(upperKey, category, name, group, false);
          }
        })
        .catch(err => {
          console.error(`Failed to load ${file}:`, err);
        });

      fetchPromises.push(fetchPromise);
    });
  });

  return Promise.all(fetchPromises).then(() => {
    return { GEODATA, GEOLAYERS };
  });
}

export { loadGeoFiles, GEODATA, GEOLAYERS };
