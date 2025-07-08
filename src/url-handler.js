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
const includePositions = true;

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

function encodeLayers(domainData) {
  const domainStrings = [];

  Object.entries(domainData).forEach(([domain, data]) => {
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
            // For enroute, only encode the filename if any positions are active
            if (domain === 'enroute') {
              if (positions && positions.length > 0) {
                sectorStrings.push(filename);
              }
              return;
            }

            if (!positions || positions.length === 0) {
              if (!includePositions) {
                sectorStrings.push(filename);
              }
              return;
            }

            if (includePositions) {
              const suffixes = positions.map(p => p.slice(-1)).join(',');
              sectorStrings.push(`${filename}-${suffixes}`);
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

    if (airportStrings.length === 0) return;
    domainStrings.push(`${domain}::${airportStrings.join('|')}`);
  });

  const compactStr = domainStrings.join('||');
  return encBase64(compactStr);
}


/**
 * Decode string into readable dictionary
 * 
 * @param {*} param 
 * @returns 
 */
function decodeLayers(encoded, GEOLAYERS) {
  if (!encoded) return {};

  try {
    const decoded = decBase64(encoded);
    const domainParts = decoded.split('||');
    const result = {};

    domainParts.forEach(domainPart => {
      const [domain, airportsRaw] = domainPart.split('::');
      if (!domain || !airportsRaw) return;

      result[domain] = {};

      const airportsArr = airportsRaw.split('|');
      airportsArr.forEach(airportStr => {
        const parts = airportStr.split(';');
        const airport = parts[0];
        if (!airport) return;

        result[domain][airport] = {};

        parts.slice(1).forEach(catPart => {
          const [catAbbr, ...layerParts] = catPart.split(':');
          const layerStr = layerParts.join(':');
          if (!catAbbr || !layerStr) return;

          const cat = categoryAbbrReverse[catAbbr];
          if (!cat) return;

          if (cat === 'sectors') {
            if (domain === 'enroute') {
              // ENROUTE: just an array of filenames
              const filenames = layerStr.split('|').filter(Boolean);
              if (filenames.length > 0) {
                result[domain][airport][cat] = filenames;
              }
              return;
            }
            const sectorObj = {};
            const entries = layerStr.split('|');

            entries.forEach(entry => {
              // For enroute, entry is just the filename
              if (domain === 'enroute') {
                const filename = entry;
                if (!filename) return;
                const allPositions = Object.keys(
                  GEOLAYERS?.[domain]?.[airport]?.[cat]?.[filename] || {}
                );
                sectorObj[filename] = allPositions;
                return;
              }

              // tracon: filename-suffixes
              const [filename, suffixStr] = entry.split('-');
              if (!filename) return;

              const allPositions = Object.keys(
                GEOLAYERS?.[domain]?.[airport]?.[cat]?.[filename] || {}
              );

              if (!suffixStr) {
                // If no suffix provided, assume activate all positions
                sectorObj[filename] = allPositions;
              } else {
                const suffixes = suffixStr.split(',').filter(Boolean);
                const matched = allPositions.filter(pos =>
                  suffixes.includes(pos.slice(-1))
                );

                sectorObj[filename] = matched;
              }
            });

            if (Object.keys(sectorObj).length > 0) {
              result[domain][airport][cat] = sectorObj;
            }
          }
        });
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
function getEnabledLayersFromURL(GEOLAYERS) {
  const params = new URLSearchParams(window.location.search);
  const layerParam = params.get("l");

  if (!layerParam) return {};

  return decodeLayers(layerParam, GEOLAYERS);
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