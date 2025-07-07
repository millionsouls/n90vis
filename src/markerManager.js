export class MarkerManager {
  constructor(map, minZoom = 14, thresholdPx = 12) {
    this.map = map;
    this.minZoom = minZoom;
    this.thresholdPx = thresholdPx;
    this.markers = [];

    map.on("zoomend moveend", () => this.updateVisibility());
  }

  addMarker(marker, latlng) {
    this.markers.push({ marker, latlng });
  }

  updateVisibility() {
  const zoom = this.map.getZoom();

  if (zoom >= this.minZoom) {
    this.markers.forEach(({ marker }) => {
      const label = marker.getElement()?.querySelector(".procedure-label");
      if (label) label.style.display = "";
    });
    return;
  }

  const shownRects = [];

  for (let i = 0; i < this.markers.length; i++) {
    const { marker } = this.markers[i];
    const el = marker.getElement()?.querySelector(".procedure-label");
    if (!el) continue;

    el.style.display = ""; // temporarily show it to get bounding box

    const rect = el.getBoundingClientRect();

    let overlap = shownRects.some(r =>
      !(rect.right < r.left || rect.left > r.right || rect.bottom < r.top || rect.top > r.bottom)
    );

    if (overlap) {
      el.style.display = "none";
    } else {
      shownRects.push(rect);
    }
  }
}

}
