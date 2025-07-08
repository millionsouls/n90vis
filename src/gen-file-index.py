import os
import json
from pathlib import Path

base_path = Path(__file__).resolve().parent / "../data"
base_path = base_path.resolve()

result = {
    "tracon": {},
    "enroute": {}
}

def walk(dir_path, airport_key, domain):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(".json") or file.endswith(".geojson"):
                full_path = Path(root) / file
                relative = full_path.relative_to(base_path).as_posix()  # 'tracon/airport/file.geojson'
                result[domain].setdefault(airport_key, []).append(relative.split(f"{domain}/{airport_key}/")[1])

# Go through 'tracon' and 'enroute'
for domain in ["tracon", "enroute"]:
    domain_path = base_path / domain
    if not domain_path.exists():
        continue
    for airport in os.listdir(domain_path):
        airport_dir = domain_path / airport
        if airport_dir.is_dir():
            walk(airport_dir, airport, domain)

# Write the result to file-index.json
with open(base_path / "file-index.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
