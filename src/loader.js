/**
 * dataloader.js
 * 
 * Loads geojson files
 */
import { handleConstraints, buildMarkerHTML } from './constraints.js';
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
    GEODATA[upperKey] = { sectors: [], stars: [], sids: [], videomap: [] };

    fileArray.forEach(file => {
      const prefix = file.split("/")[0].toLowerCase();
      const category = categoryMap[prefix];
      if (!category) return;

      const fetchPromise = fetch(`data/${key}/${file}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status} on ${file}`);
          return res.json();
        })
        .then(data => {
          if (!data.features) throw new Error('Invalid GeoJSON: missing features');

          const rawFileName = file.split("/").pop().split('.')[0];
          const name = data.name || rawFileName;
          const normalizedName = name.toLowerCase().replace(/[^\w\-]/g, '');
          const normalizedCategory = category.toLowerCase();

          let group;
          if (category === "STARs" || category === "SIDs") {
            const fileSafe = `${upperKey}_${category}_${normalizedName}`.replace(/[^\w]/g, '');
            const linePane = `pane-${normalizedCategory}-lines-${fileSafe}`;
            const markerPane = `pane-${normalizedCategory}-markers-${fileSafe}`;
            if (!map.getPane(linePane)) {
              map.createPane(linePane);
              map.getPane(linePane).style.zIndex = 800;
            }
            if (!map.getPane(markerPane)) {
              map.createPane(markerPane);
              map.getPane(markerPane).style.zIndex = 900;
            }

            const markers = [];
            const lines = [];

            data.features.forEach(f => {
              const props = f.properties || {};
              const color = props.color || "#0000ff";

              if (f.geometry.type === "Point") {
                const coords = f.geometry.coordinates;
                const altitudes = handleConstraints(props.altitudes);
                const speeds = handleConstraints(props.speed);

                const marker = L.marker([coords[1], coords[0]], {
                  pane: markerPane,
                  icon: L.divIcon({
                    className: 'divIcon',
                    html: buildMarkerHTML(props.id, altitudes, speeds, color),
                    iconAnchor: [6, 6]
                  })
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
            group = L.layerGroup([linesGroup, markersGroup]);

          } else if (category === "Videomap") {
            const videoStyle = feature => {
              if (feature.geometry.type === "LineString") {
                return { color: "#000000", weight: 2 };
              }
              if (feature.geometry.type === "Polygon") {
                return { color: "#000000", weight: 2, fillOpacity: 0.1 };
              }
              return {};
            };

            const videoPointToLayer = () => null;

            const geoJsonLayer = L.geoJSON(data, {
              style: videoStyle,
              pointToLayer: videoPointToLayer
            });

            group = L.layerGroup([geoJsonLayer]);

          } else {
            const zIndex = data.features[0]?.properties?.style?.zIndex || 0;
            const fileSafe = `${upperKey}_${category}_${normalizedName}`.replace(/[^\w]/g, '');
            const paneName = `pane-${fileSafe}`;
            if (!map.getPane(paneName)) {
              map.createPane(paneName);
            }
            map.getPane(paneName).style.zIndex = 200 + zIndex;

            const geoJsonLayer = L.geoJSON(data, {
              pane: paneName,
              style: feature => {
                const color = feature.properties.Fill || "#3388ff";
                return {
                  color: color,
                  weight: 2,
                  opacity: 1,
                  fillColor: color,
                  fillOpacity: 0.6
                };
              },
              onEachFeature: (feature, layer) => {
                if (typeof handleFeatureHover === "function") {
                  handleFeatureHover(feature, layer);
                }
              }
            });

            group = L.layerGroup([geoJsonLayer]);
          }

          if (!GEOLAYERS[upperKey]) GEOLAYERS[upperKey] = {};
          if (!GEOLAYERS[upperKey][normalizedCategory]) GEOLAYERS[upperKey][normalizedCategory] = {};
          GEOLAYERS[upperKey][normalizedCategory][normalizedName] = group;

          if (!GEODATA[upperKey]) GEODATA[upperKey] = {};
          if (!GEODATA[upperKey][normalizedCategory]) GEODATA[upperKey][normalizedCategory] = [];
          GEODATA[upperKey][normalizedCategory].push(normalizedName);
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
