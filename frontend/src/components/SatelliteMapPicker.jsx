import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LoaderCircle, MapPin } from "lucide-react";
import { MAP_BASEMAPS, OPENSTREETMAP_TILE_POLICY_URL } from "../services/mapBasemaps.js";

function MapClickHandler({ onLocationSelect }) {
  const onLocationSelectRef = useCallback((event) => {
    onLocationSelect({
      latitude: event.latlng.lat,
      longitude: event.latlng.lng,
    });
  }, [onLocationSelect]);

  useMapEvents({
    click: onLocationSelectRef,
  });
  return null;
}

function InvalidateMapSize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const invalidateSize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (container.isConnected) map.invalidateSize({ pan: false });
      });
    };
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(invalidateSize);
    resizeObserver?.observe(container);
    window.addEventListener("resize", invalidateSize);
    invalidateSize();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", invalidateSize);
    };
  }, [map]);

  return null;
}

function RecenterMap({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude], Math.max(map.getZoom(), 11));
    }
  }, [location?.latitude, location?.longitude, map]);

  return null;
}

export default function SatelliteMapPicker({
  location,
  placeName,
  onPlaceNameChange,
  onLocationSelect,
  loading,
  onLocationError,
}) {
  const [basemap, setBasemap] = useState("satellite");
  const [tileMessage, setTileMessage] = useState("");
  const basemapRef = useRef("satellite");
  const handleSatelliteTileError = useCallback(() => {
    if (basemapRef.current !== "satellite") return;
    basemapRef.current = "standard";
    setBasemap("standard");
    setTileMessage("Satellite imagery could not be loaded. Switched to the standard OpenStreetMap basemap.");
  }, []);
  const handleStandardTileError = useCallback(() => {
    if (basemapRef.current === "standard") {
      setTileMessage("Standard map tiles could not be loaded. Check your internet connection; location selection and local lookup remain available.");
    }
  }, []);
  const tileEventHandlers = useMemo(() => ({
    tileerror: basemap === "satellite" ? handleSatelliteTileError : handleStandardTileError,
  }), [basemap, handleSatelliteTileError, handleStandardTileError]);

  function retrySatellite() {
    basemapRef.current = "satellite";
    setBasemap("satellite");
    setTileMessage("");
  }

  function useCurrentLocation() {
    onLocationError("");
    if (!navigator.geolocation) {
      onLocationError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onLocationSelect({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      (reason) => onLocationError(`Could not get your location: ${reason.message}`),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  return (
    <section className="satellite-picker">
      <div className="satellite-picker-heading">
        <div>
          <p className="eyebrow"><MapPin size={14} /> LOCAL SOIL &amp; CLIMATE LOOKUP</p>
          <p className="muted">
            Mark a plot or allow browser location access. Coordinates are sent
            to the local backend to sample installed soil and climate datasets;
            map imagery still uses online tiles.
          </p>
        </div>
        <button
          className="button button-quiet no-print"
          type="button"
          onClick={useCurrentLocation}
          disabled={loading}
        >
          <MapPin size={17} /> Use My Current Location
        </button>
      </div>
      <MapContainer
        className="satellite-map"
        center={[11.1271, 78.6569]}
        zoom={7}
        scrollWheelZoom={false}
        aria-label="Map. Click to select the field location."
      >
        <InvalidateMapSize />
        <TileLayer
          key={basemap}
          url={MAP_BASEMAPS[basemap].url}
          attribution={MAP_BASEMAPS[basemap].attribution}
          maxZoom={MAP_BASEMAPS[basemap].maxZoom}
          eventHandlers={tileEventHandlers}
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        <RecenterMap location={location} />
        {location && (
          <CircleMarker
            center={[location.latitude, location.longitude]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#e8a928",
              fillOpacity: 1,
            }}
          />
        )}
      </MapContainer>
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
      {location && (
        <div className="muted" role="status" aria-live="polite">
          <p>
            Selected coordinates
            {" · "}{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </p>
        </div>
      )}
      <label className="field">
        <span>Place name (optional; enter manually)</span>
        <input
          name="village"
          type="text"
          value={placeName}
          onChange={(event) => onPlaceNameChange(event.target.value)}
          placeholder="Village, farm, or field name"
        />
      </label>
      {loading && (
        <p className="satellite-picker-loading" role="status">
          <LoaderCircle className="spin" size={18} /> Looking up local soil and climate data…
        </p>
      )}
    </section>
  );
}
