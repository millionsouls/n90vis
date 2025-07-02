const fs = require("fs");
const path = require("path");

const basePath = path.join(__dirname, "../data"); // Adjust based on your folder

const result = {};

function walk(dir, airportKey) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, airportKey);
    } else if (entry.name.endsWith(".json") || entry.name.endsWith(".geojson")) {
      const relative = path.relative(path.join(basePath, airportKey), fullPath).replace(/\\/g, "/");
      if (!result[airportKey]) result[airportKey] = [];
      result[airportKey].push(relative);
    }
  });
}

const airports = fs.readdirSync(basePath);
airports.forEach(airport => {
  const airportDir = path.join(basePath, airport);
  if (fs.lstatSync(airportDir).isDirectory()) {
    walk(airportDir, airport);
  }
});

fs.writeFileSync(path.join(basePath, "file-index.json"), JSON.stringify(result, null, 2));
