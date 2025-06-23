# ZNY TRACON Airspace Visualization
Display TRACON airspace boundaries and shelves on Leaflet/OSM map layer. Additional options for displaying SIDs, STARs, and video maps. (I'm really bad at writing these)

<b>FOR FLIGHT SIMULATION PURPOSES ONLY</b>

## Installation
```
Copy and run
```

## Structure
```
n90vis/
├── css/
│   ├── layerinfo.css       # Styles for boxes and UI for map layers/features
│   ├── sidebar.css         # Styles for the menu/sidebar
│   └── styles.css          # General body/text styling
├── data/                   # Where geojson files should go
│   ├── jfk/                # Airport or area, this creates an 'option' in the menu
│   │   │                     You do not need to have all folders below, one or more works
│   │   ├── sectors         # Layer polygons, the airspace
│   │   ├── sids
│   │   ├── stars
│   │   └── videomaps
│   └── elm/
│       └── sectors
├── src/
│   ├── ui/
│   │   ├── mouse-hover.js  # Info that appears when a mouse goes over an airspace sector
│   │   ├── search.js       # Searching items
│   │   ├── sidebar.js      # Magic for the menu dropdowns
│   │   └── smoothscroll.js # Makes zooming on trackpads better
│   ├── config.js           # Link all data files here
│   ├── constraints.js      # Handles and creates SID/STAR constraints
│   ├── loader.js           # Creates and connects the airspace layers
│   ├── main.js             # Main point
│   ├── map.js              # Creates and handles Leaflet maps
│   └── url-handler.js      # Does URL linkage magic
└── README.md  
```

### Data Files and Structure
Takes the <a href="https://geojson.org/">GEOJSON</a> <b>FeatureCollection</b> format, however the extension does not matter. A JSON or TXT file with the same format will work.
```
{
    "type": "FeatureCollection",        # FQM3 STAR under EWR
    "name": "FQM3",                     # This will appear in the as an option
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "SLT",
                "altitudes": [],
                "speed": [],
                "notes": null,
                "color": "#ff0000"      # Lines and markers will be this color
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    -77.97010972,
                    41.51275944
                ]
            }
        }
    ]
}

{
    "type": "FeatureCollection",        # EWR_SW.geojson (airspace layer)
    "name": "Southwest",
    "features": [
        {
            "type": "Feature",
            "id": 1,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [...]
                ]
            },
            "properties": {
                "OBJECTID": 1,
                "Position": "N4N",
                "Low": 7000,
                "High": 7000,
                "Notes": null,
                "Fill": "#BED2FF",      # Area/Stroke will be this color with differing opacity
                "Stroke": "#BED2FF"     # Unused at the moment
            }
        },
    ]
}
```
#### Option Names
When displaying options in the `popup-sidemenu`, the name will either be taken from the GEOJSON file if present, or the file name itself. `Sector/SID/STAR/Videomap` all follow this logic
```
{
    "type": "FeatureCollection",
    "name": "This will appear in the options when selecting something",
    "features": [..]
}
```
#### Coloring
`Sector/SID/STAR` geometries can be colored if the option is present under `properties`. For SID/STARS they use `color` and for Sectors they `Fill`. Sector colors also affect the colors for the info box when a cursor hovers over a layer.

#### Restrictions/Constraints
`SID/STAR` will display route restrictions for both altitude and speed. `@120 = at 120` `+120 = at or above 120` `-120 = at or below 120`. Format is the same for speed restrictions.
```
"altitudes": ['@120'],
"speed": ['+180K', '-220'],
```

`Sector` will display the airspace ownership. Numbers will be formated into three digits, zero(s) will be converted to SFC. Single altitudes are also handled, does not matter which one it is in.
```
"Low": 7000,
"High": 7000,
```
## Acknowledgments
`https://github.com/vzoa/NctVisualizer` Original idea

`https://github.com/mutsuyuki/Leaflet.SmoothWheelZoom` For, well, smooth scroll

## TODO