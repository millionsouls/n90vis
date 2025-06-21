/**
 * Generates and loads custom URL links to defined layer/feature settings
 * 
 */

const categoryAbbr = { 
    sectors: 's', 
    stars: 'sr', 
    sids: 'ss', 
    videomap: 'v' 
};
const categoryAbbrReverse = { 
    s: 'sectors', 
    sr: 'stars', 
    ss: 'sids', 
    v: 'videomap' 
};


function base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}

/**
 * Transforms dictionary into custom encoded dictionary
 * 
 * @param {*} layersNested 
 * @returns 
 */
function encodeLayers(layersNested) {
    // Build airport dict
    const airports = Object.keys(layersNested).sort();

    // Unique layer names
    const layerSet = new Set();
    for (const airport of airports) {
        const cats = layersNested[airport];
        for (const cat in cats) {
            cats[cat].forEach(name => layerSet.add(name));
        }
    }
    const layers = Array.from(layerSet).sort();

    // Compose data entries: airport index, category abbr, layer index
    // format: airportIdx:catAbbr:layerIdx
    const entries = [];
    airports.forEach((airport, aIdx) => {
        const cats = layersNested[airport];
        for (const cat in cats) {
            const catAbbr = categoryAbbr[cat] || cat;
            cats[cat].forEach(name => {
                const lIdx = layers.indexOf(name);
                if (lIdx >= 0) {
                    entries.push(`${aIdx}:${catAbbr}:${lIdx}`);
                }
            });
        }
    });

    // Compose final string: "A:airports|L:layers|D:entries"
    const airportsStr = airports.join(',');
    const layersStr = layers.join(',');
    const entriesStr = entries.join(';');

    const compactStr = `A:${airportsStr}|L:${layersStr}|D:${entriesStr}`;
    return base64UrlEncode(compactStr);
}

/**
 * Decoding custom encode into readable dictionary
 * 
 * @param {*} param 
 * @returns 
 */
function decodeLayers(param) {
    if (!param) return {};

    try {
        const decoded = base64UrlDecode(param);
        // decoded looks like "A:jfk,lax|L:4s,31s,parch3|D:0:s:0;0:st:2"
        const parts = decoded.split('|');
        if (parts.length !== 3) return {};

        const airportsPart = parts[0];
        const layersPart = parts[1];
        const dataPart = parts[2];

        if (!airportsPart.startsWith('A:') || !layersPart.startsWith('L:') || !dataPart.startsWith('D:')) {
            return {};
        }

        const airports = airportsPart.slice(2).split(',');
        const layers = layersPart.slice(2).split(',');
        const entries = dataPart.slice(2).split(';');

        const result = {};

        entries.forEach(entry => {
            if (!entry) return;
            const [aIdxStr, catAbbr, lIdxStr] = entry.split(':');
            const aIdx = parseInt(aIdxStr, 10);
            const lIdx = parseInt(lIdxStr, 10);

            if (aIdx >= airports.length || lIdx >= layers.length) return;

            const airport = airports[aIdx];
            const cat = categoryAbbrReverse[catAbbr] || catAbbr;
            const layerName = layers[lIdx];

            if (!result[airport]) result[airport] = {};
            if (!result[airport][cat]) result[airport][cat] = [];
            result[airport][cat].push(layerName);
        });

        return result;
    } catch {
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
  const enabled = window.LayerControl.getActiveLayerKeys();
  const url = new URL(window.location);

  if (Object.keys(enabled).length > 0) {
    url.searchParams.set("l", encodeLayers(enabled));
  } else {
    url.searchParams.delete("l");
  }
  history.replaceState(null, "", url);
}
export { getEnabledLayersFromURL, updateURLFromMapState };