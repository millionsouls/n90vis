/**
 * constraints.js
 * 
 * Creates markers and labels on STAR/SID with corresponding constraints if any
 */

/**
 * Transform altitude/speed constraints into structured data
 * 
 * @param {Array<string>} constraints - Array of constraint strings
 * @returns {Array<[string, string]>} - Array of [prefix, value] pairs
 */
function handleConstraints(constraints) {
  if (!Array.isArray(constraints)) return [];

  const parsed = constraints.map(raw => {
    if (!raw || typeof raw !== "string") return ["", ""];

    const trimmed = raw.trim();

    let prefix = "";
    let value = "";

    if (trimmed.startsWith("@")) {
      prefix = "at";
      value = trimmed.slice(1);
    } else if (trimmed.startsWith("+")) {
      prefix = "abv";
      value = trimmed.slice(1);
    } else if (trimmed.startsWith("-")) {
      prefix = "blw";
      value = trimmed.slice(1);
    } else {
      // legacy format "abv 130"
      const [p, ...rest] = trimmed.split(/\s+/);
      prefix = p.toLowerCase();
      value = rest.join(" ");
    }

    return [prefix, value];
  });

  // Sort to move all "blw" entries to the front
  parsed.sort((a, b) => {
    if (a[0] !== "blw" && b[0] === "blw") return 1;
    return 0;
  });

  return parsed;
}

/**
 * Construct HTML for a marker
 * 
 * @param {string} id 
 * @param {Array<[string, string]>} altitudes 
 * @param {Array<[string, string]>} speeds 
 * @param {string} color 
 * @returns {string}
 */
function buildMarkerHTML(id, altitudes, speeds, color) {
  // Altitude HTML
  let altHtml = "";
  if (altitudes.length === 2) {
    altHtml = `
      <div class="flex-center">
        <span class="res-label ${altitudes[0][0]}">${altitudes[0][1]}</span>
        <span class="res-label ${altitudes[1][0]}">${altitudes[1][1]}</span>
      </div>
    `;
  } else if (altitudes.length === 1) {
    altHtml = `
      <div class="flex-center">
        <span class="res-label ${altitudes[0][0]}">${altitudes[0][1]}</span>
      </div>
    `;
  }

  // Speed HTML
  let speedHtml = "";
  if (speeds.length === 2) {
    speedHtml = `
      <div class="flex-center">
        <span class="res-label ${speeds[0][0]}">${speeds[0][1]}</span>
        <span class="res-label ${speeds[1][0]}">${speeds[1][1]}</span>
      </div>
    `;
  } else if (speeds.length === 1) {
    speedHtml = `
      <div class="flex-center">
        <span class="res-label ${speeds[0][0]}">${speeds[0][1]}</span>
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div style="width:12px; height:12px; border-radius:50%; background:${color}; border:2px solid #000;"></div>
      <div class="procedure-label">
        <div style="font-size:12px; text-align:center;">${id || ""}</div>
        <div class="procedure-text">
          ${altHtml}
          ${speedHtml}
        </div>
      </div>
    </div>
  `;
}

export { handleConstraints, buildMarkerHTML };
