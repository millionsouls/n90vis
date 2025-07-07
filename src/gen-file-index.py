# Just run the file

import os
import json
from pathlib import Path

base_path = Path(__file__).resolve().parent / "../data"
base_path = base_path.resolve()

result = {}

def walk(dir_path, airport_key):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(".json") or file.endswith(".geojson"):
                full_path = Path(root) / file
                relative = full_path.relative_to(base_path / airport_key).as_posix()
                result.setdefault(airport_key, []).append(relative)

# Go through each airport directory
for airport in os.listdir(base_path):
    airport_dir = base_path / airport
    if airport_dir.is_dir():
        walk(airport_dir, airport)

# Write the result to file-index.json
with open(base_path / "file-index.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
