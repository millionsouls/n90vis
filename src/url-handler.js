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
 * Transforms dictionary into custom encoded dictionary
 * 
 * @param {*} layersNested 
 * @returns 
 */
function encodeLayers(data) {
    // Build array of airport strings
    const airportStrings = [];

    Object.entries(data).forEach(([airport, categories]) => {
        const catStrings = [];
        for (const cat in categories) {
            const abbr = categoryAbbr[cat];
            if (!abbr) continue;
            const layers = categories[cat];
            if (!layers.length) continue;
            catStrings.push(`${abbr}:${layers.map(l => l.toLowerCase()).join(',')}`);
        }
        if (catStrings.length === 0) return;
        airportStrings.push(`${airport.toLowerCase()};${catStrings.join(';')}`);
    });

    const compactStr = airportStrings.join('|');
    console.log(compactStr)
    return encBase64(compactStr);
}

/**
 * Decoding custom encode into readable dictionary
 * 
 * @param {*} param 
 * @returns 
 */
function decodeLayers(encoded) {
  if (!encoded) return {};

  try {
    const decoded = decBase64(encoded);
    // Example decoded: "jfk;s:n2a,n2m;ss:sid1,sid2|lga;s:n1a;sr:star1"

    const airportsArr = decoded.split('|');
    const result = {};

    airportsArr.forEach(airportStr => {
      const parts = airportStr.split(';');
      const airport = parts[0];
      if (!airport) return;

      result[airport] = {};

      parts.slice(1).forEach(catPart => {
        const [catAbbr, layerStr] = catPart.split(':');
        if (!catAbbr || !layerStr) return;
        const cat = categoryAbbrReverse[catAbbr];
        if (!cat) return;

        const layers = layerStr.split(',').filter(Boolean);
        if (layers.length) {
          result[airport][cat] = layers;
        }
      });
    });

    return result;
  } catch (err) {
    console.error('decodeLayers error:', err);
    return {};
  }
}
/**
 * Extract URL and decode it
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
    const enabled = window.LayerControl.getActiveLayerKeys()
    const url = new URL(window.location);

    if (Object.keys(enabled).length > 0) {
        url.searchParams.set("l", encodeLayers(enabled));
    } else {
        url.searchParams.delete("l");
    }
    history.replaceState(null, "", url);
}
export { getEnabledLayersFromURL, updateURLFromMapState };