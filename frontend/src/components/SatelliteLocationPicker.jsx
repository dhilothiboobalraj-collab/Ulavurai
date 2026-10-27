import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MAP_BASEMAPS, OPENSTREETMAP_TILE_POLICY_URL } from "../services/mapBasemaps.js";

export default function SatelliteLocationPicker({
  selectedLocation,
  onSelectLocation,
  label,
}) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const marker = useRef(null);
  const onSelectLocationRef = useRef(onSelectLocation);
  const activeLayerRef = useRef(null);
  const retrySatelliteRef = useRef(null);
  const basemapRef = useRef("satellite");
  const [basemap, setBasemap] = useState("satellite");
  const [tileMessage, setTileMessage] = useState("");

  const retrySatellite = useCallback(() => {
    if (basemapRef.current === "satellite") return;
    activeLayerRef.current?.remove();
    retrySatelliteRef.current?.();
  }, []);

  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    if (!mapElement.current) return undefined;

    const map = L.map(mapElement.current, {
      center: [11, 78],
      zoom: 6,
      scrollWheelZoom: false,
    });
    mapInstance.current = map;
    let resizeFrame = 0;
    const invalidateMapSize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (mapElement.current?.isConnected) map.invalidateSize({ pan: false });
      });
    };
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(invalidateMapSize);
    resizeObserver?.observe(mapElement.current);
    window.addEventListener("resize", invalidateMapSize);
    invalidateMapSize();
    const addStandardLayer = () => {
      const standardLayer = L.tileLayer(MAP_BASEMAPS.standard.url, {
        attribution: MAP_BASEMAPS.standard.attribution,
        maxZoom: MAP_BASEMAPS.standard.maxZoom,
      });
      standardLayer.on("tileerror", () => {
        if (basemapRef.current === "standard") {
          setTileMessage("Standard map tiles could not be loaded. Check your internet connection; location selection and local lookup remain available.");
        }
      });
      activeLayerRef.current = standardLayer.addTo(map);
    };
    const addSatelliteLayer = () => {
      basemapRef.current = "satellite";
      setBasemap("satellite");
      setTileMessage("");
      retrySatelliteRef.current = addSatelliteLayer;
      const satelliteLayer = L.tileLayer(MAP_BASEMAPS.satellite.url, {
        attribution: MAP_BASEMAPS.satellite.attribution,
        maxZoom: MAP_BASEMAPS.satellite.maxZoom,
      });
      satelliteLayer.on("tileerror", () => {
        if (basemapRef.current !== "satellite") return;
        basemapRef.current = "standard";
        setBasemap("standard");
        setTileMessage("Satellite imagery could not be loaded. Switched to the standard OpenStreetMap basemap.");
        satelliteLayer.remove();
        addStandardLayer();
      });
      activeLayerRef.current = satelliteLayer.addTo(map);
    };
    addSatelliteLayer();
    map.on("click", ({ latlng }) => {
      onSelectLocationRef.current({
        latitude: latlng.lat,
        longitude: latlng.lng,
      });
    });

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", invalidateMapSize);
      map.remove();
      mapInstance.current = null;
      marker.current = null;
      activeLayerRef.current = null;
      retrySatelliteRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !selectedLocation) return;

    const { latitude, longitude } = selectedLocation;
    const point = [latitude, longitude];
    if (marker.current) {
      marker.current.setLatLng(point);
    } else {
      marker.current = L.circleMarker(point, {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#e8a928",
        fillOpacity: 1,
      }).addTo(map);
    }
    map.setView(point, Math.max(map.getZoom(), 10));
  }, [selectedLocation?.latitude, selectedLocation?.longitude]);

  return (
    <div className="satellite-location-picker no-print">
      <div
        className="toolkit-weather-map farmer-location-map"
        ref={mapElement}
        aria-label={label}
        role="application"
        tabIndex={0}
      />
      <div className="satellite-map-basemap">
        <span>
          Basemap: {basemap === "satellite" ? "Satellite imagery (Esri)" : "Standard map (OpenStreetMap)"}
        </span>
        {basemap === "standard" && (
          <>
            <a href={OPENSTREETMAP_TILE_POLICY_URL} target="_blank" rel="noreferrer">
              OpenStreetMap tile usage policy
            </a>
            <button className="button button-quiet" type="button" onClick={retrySatellite}>
              Retry satellite imagery
            </button>
          </>
        )}
      </div>
      {tileMessage && <p className="satellite-map-error" role="status">{tileMessage}</p>}
    </div>
  );
}
