/**
 * constraints.js
 * 
 * Creates markers and labels on STAR/SID with corresponding constraints if any
 */

const iconPath = "../assets/icons/";

/**
 * Transform altitude/speed constraints into structured data
 * 
 * @param {Array<string>} constraints - Array of constraint strings
 * @returns {Array<[string, string]>} - Array of [prefix, value] pairs
 */
function fmtConstraint(constraints) {
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
 * Help function to construct crossing restruction html
 * 
 * @param {*} item 
 * @returns 
 */
function buildTextHTML(item) {
  if (item.length === 2) {
    return `
    <div class="flex-center">
      <span class="res-label ${item[0][0]}">${item[0][1]}</span>
      <span class="res-label ${item[1][0]}">${item[1][1]}</span>
    </div>
    `;
  } else if (item.length === 1) {
    return `
      <div class="flex-center">
        <span class="res-label ${item[0][0]}">${item[0][1]}</span>
      </div>
    `;
  } else {
    return ``;
  }
}

/**
 * SVG image editing
 * 
 * @param {*} svg 
 * @param {*} color 
 * @returns 
 */
async function parseSVG(props, type, svg) {
  if (!svg) {
    svg = ICONS[type.toLowerCase()];
    if (!svg) return null;
  }
  const fullPath = `${iconPath}${svg}`;

  try {
    const response = await fetch(fullPath);
    if (!response.ok) throw new Error("SVG not found");

    const svgText = await response.text()
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElem = svgDoc.querySelector("svg");

    svgElem.removeAttribute("width");
    svgElem.removeAttribute("height");
    svgElem.setAttribute("width", "40");
    svgElem.setAttribute("height", "40");

    svgElem.querySelectorAll("[style]").forEach(el => {
      let style = el.getAttribute("style");

      if (style.includes("stroke-width")) {
        style = style.replace(/stroke-width:[^;]+;/, `stroke-width:1.5;`);
      }
      if (style.includes("fill-opacity")) {
        style = style.replace(/fill-opacity:[^;]+;/, `fill-opacity:0.8;`);
      }
      if (props.notes != null) {
        style = style.replace(/stroke:[^;]+;/, `stroke:${props.color};`);
      }

      el.setAttribute("style", style);
    });

    return `<div style="width:14px; height:14px; display: flex; align-items: center; justify-content: center; padding-bottom: 5px;">${svgElem.outerHTML}</div>`;
  } catch (err) {
    console.warn(`SVG load failed: ${fullPath}`, err);
    return null;
  }
}

/**
 * Construct HTML for a marker
 * 
 */
async function buildMarker(props, type="req_int") {
  const altitude = fmtConstraint(props.altitudes)
  const speed = fmtConstraint(props.speeds)

  let altHtml = buildTextHTML(altitude)
  let speedHtml = buildTextHTML(speed)
  let shapeHtml = ''

  if (type == "dot" && !props.icon) {
    shapeHtml = `
      <div style="
        width:14px; 
        height:14px; 
        border-radius:50%; 
        background:${color}; 
        border:0px solid #000;
        margin-bottom: 2px;">
      </div>
    `;
  } else if (props.icon || type) {
    shapeHtml = await parseSVG(props, type, props.icon, props.color);
  }

  return `
    <div style="display: flex; flex-direction: column; align-items: center;">
      ${shapeHtml}
      <div class="procedure-label" style="border-color:${props.color}; ">
        <div style="font-size:12px; text-align:center; white-space: nowrap;">
          ${props.id}
        </div>
        <div class="procedure-text" style="">
          ${altHtml}
          ${speedHtml}
        </div>
      </div>
    </div>
  `;
}

export { buildMarker };
