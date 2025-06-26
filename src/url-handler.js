/**
 * Generates and loads custom URL links to defined layer/feature settings
 * 
 */

const categoryAbbr = {
    sectors: 1,
    stars: 2,
    sids: 3,
    videomap: 4,
};
const categoryAbbrReverse = {
    1: 'sectors',
    2: 'stars',
    3: 'sids',
    4: 'videomap'
};
const includePositions = false;

function encBase64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decBase64(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}
function compress(str) {
    return LZString.compressToEncodedURIComponent(str);
}
function decompress(str) {
    return LZString.decompressFromEncodedURIComponent(str);
}

/**
 * Transforms dictionary into custom encoded string
 * ex: 
 * 
 * @param {*} layersNested 
 * @returns 
 */

function encodeLayers(data) {
  const airportStrings = [];

  Object.entries(data).forEach(([airport, categories]) => {
    const catStrings = [];

    for (const cat in categories) {
      const abbr = categoryAbbr[cat];
      if (!abbr) continue;

      const layers = categories[cat];
      if (!layers) continue;

      if (cat === 'sectors' && typeof layers === 'object' && !Array.isArray(layers)) {
        const sectorStrings = [];

        Object.entries(layers).forEach(([filename, positions]) => {
          if (!positions || positions.length === 0) {
            if (!includePositions) {
              sectorStrings.push(filename);
            }
            return;
          }

          if (includePositions) {
            // Detect shared prefix (1 or 2 characters)
            const prefix = positions[0].slice(0, 2);
            const suffixes = positions.map(p => p.slice(prefix.length)).join(',');
            sectorStrings.push(`${filename}.${prefix}:${suffixes}`);
          } else {
            sectorStrings.push(filename);
          }
        });

        if (sectorStrings.length > 0) {
          catStrings.push(`${abbr}:${sectorStrings.join('|')}`);
        }
      } else if (Array.isArray(layers)) {
        if (layers.length > 0) {
          catStrings.push(`${abbr}:${layers.join(',')}`);
        }
      }
    }

    if (catStrings.length === 0) return;
    airportStrings.push(`${airport};${catStrings.join(';')}`);
  });

  const compactStr = airportStrings.join('|');
  return encBase64(compactStr);
}

/**
 * Decode string into readable dictionary
 * 
 * @param {*} param 
 * @returns 
 */
function decodeLayers(encoded) {
  if (!encoded) return {};

  try {
    const decoded = decBase64(encoded);
    const airportsArr = decoded.split('|');
    const result = {};

    airportsArr.forEach(airportStr => {
      const parts = airportStr.split(';');
      const airport = parts[0];
      if (!airport) return;

      result[airport] = {};

      parts.slice(1).forEach(catPart => {
        const [catAbbr, ...layerParts] = catPart.split(':');
        const layerStr = layerParts.join(':'); // In case there are extra colons
        if (!catAbbr || !layerStr) return;

        const cat = categoryAbbrReverse[catAbbr];
        if (!cat) return;

        if (cat === 'sectors') {
          const sectorObj = {};
          const entries = layerStr.split('|'); // e.g., JFK_4s.N2:M,E,K

          entries.forEach(entry => {
            const [filename, rest] = entry.split('.');
            if (!rest) {
              sectorObj[filename] = [];
              return;
            }

            const colonIndex = rest.indexOf(':');
            if (colonIndex !== -1) {
              const prefix = rest.slice(0, colonIndex);
              const suffixes = rest.slice(colonIndex + 1).split(',').filter(Boolean);
              const positions = suffixes.map(suffix => prefix + suffix);
              sectorObj[filename] = positions;
            } else {
              // No compression used
              sectorObj[filename] = rest.split(',').filter(Boolean);
            }
          });

          if (Object.keys(sectorObj).length > 0) {
            result[airport][cat] = sectorObj;
          }
        } else {
          const layers = layerStr.split(',').filter(Boolean);
          if (layers.length) {
            result[airport][cat] = layers;
          }
        }
      });
    });
    return result;
  } catch (err) {
    console.error('URL Decode error:', err);
    return {};
  }
}

/**
 * Extract URL on page load and decode it
 * 
 * @returns 
 */
function getEnabledLayersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const layerParam = params.get("l");

    if (!layerParam) return {};

    return decodeLayers(layerParam);
}

/**
 * Detects map state changes and reflects them in the URL
 * 
 * @returns 
 */
function updateURLFromMapState() {
    if (!window.LayerControl) return;
    const enabled = window.LayerControl.getActiveLayers()
    const url = new URL(window.location);

    if (Object.keys(enabled).length > 0) {
        url.searchParams.set("l", encodeLayers(enabled));
    } else {
        url.searchParams.delete("l");
    }
    history.replaceState(null, "", url);
}

export { getEnabledLayersFromURL, updateURLFromMapState };