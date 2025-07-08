import os
import json
from pathlib import Path

base_path = Path(__file__).resolve().parent / "../data"
base_path = base_path.resolve()

result = {
    "tracon": {},
    "enroute": {}
}

def walk(dir_path, airport_key, station):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(".json") or file.endswith(".geojson"):
                full_path = Path(root) / file
                relative = full_path.relative_to(base_path).as_posix()  # 'tracon/airport/file.geojson'
                result[station].setdefault(airport_key, []).append(relative.split(f"{station}/{airport_key}/")[1])

# Go through 'tracon' and 'enroute'
for station in ["tracon", "enroute"]:
    domain_path = base_path / station
    if not domain_path.exists():
        continue
    for airport in os.listdir(domain_path):
        airport_dir = domain_path / airport
        if airport_dir.is_dir():
            walk(airport_dir, airport, station)

# Write the result to file-index.json
with open(base_path / "file-index.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
