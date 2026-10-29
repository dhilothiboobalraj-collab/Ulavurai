import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  getMapClickCoordinates,
  MAP_LAYERS,
} from "../services/interactiveMap.js";

function MapClickHandler({ onLocationSelect, onLocationError }) {
  useMapEvents({
    click(event) {
      try {
        const coordinates = getMapClickCoordinates(event);
        onLocationError("");
        onLocationSelect(coordinates);
      } catch {
        onLocationError("The selected map point returned invalid coordinates.");
      }
    },
  });
  return null;
}

function RecenterOnLocation({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    map.flyTo(
      [location.latitude, location.longitude],
      Math.max(map.getZoom(), 12),
      { duration: 0.4 },
    );
  }, [location?.latitude, location?.longitude, map]);

  return null;
}

export default function InteractiveLocationMap({
  location,
  onLocationSelect,
  onLocationError = () => {},
  label = "Interactive field location map",
  className = "",
}) {
  const [layerName, setLayerName] = useState("satellite");
  const [tileError, setTileError] = useState("");
  const [tileLoaded, setTileLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const layer = MAP_LAYERS[layerName];

  function chooseLayer(name) {
    if (name === layerName) return;
    setLayerName(name);
    setTileError("");
    setTileLoaded(false);
  }

  function retryTiles() {
    setTileError("");
    setTileLoaded(false);
    setRetryCount((count) => count + 1);
  }

  return (
    <div className={`interactive-map ${className}`.trim()}>
      <div className="interactive-map-toolbar">
        <div className="interactive-map-switch" role="group" aria-label="Map view">
          {Object.entries(MAP_LAYERS).map(([name, option]) => (
            <button
              key={name}
              className="button button-quiet"
              type="button"
              aria-pressed={layerName === name}
              onClick={() => chooseLayer(name)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="interactive-map-current-layer">{layer.label}</span>
      </div>
      <div className="interactive-map-canvas-wrap">
        <MapContainer
          className="interactive-map-canvas"
          center={location
            ? [location.latitude, location.longitude]
            : DEFAULT_MAP_CENTER}
          zoom={location ? 12 : DEFAULT_MAP_ZOOM}
          minZoom={2}
          maxZoom={layer.maxZoom}
          scrollWheelZoom
          zoomControl={false}
          aria-label={label}
        >
          <ZoomControl position="topright" />
          <TileLayer
            key={`${layerName}-${retryCount}`}
            url={layer.url}
            attribution={layer.attribution}
            maxZoom={layer.maxZoom}
            eventHandlers={{
              tileload: () => setTileLoaded(true),
              tileerror: () => setTileError(
                "Some map tiles could not be loaded. Check your internet connection or try the other map view.",
              ),
            }}
          />
          <MapClickHandler
            onLocationSelect={onLocationSelect}
            onLocationError={onLocationError}
          />
          <RecenterOnLocation location={location} />
          {location && (
            <CircleMarker
              center={[location.latitude, location.longitude]}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "#e5a82f",
                fillOpacity: 1,
              }}
            />
          )}
        </MapContainer>
        {!tileLoaded && !tileError && (
          <p className="interactive-map-status" role="status">Loading map tiles…</p>
        )}
        {tileError && (
          <div className="interactive-map-error" role="alert">
            <span>{tileError}</span>
            <button className="button button-quiet" type="button" onClick={retryTiles}>
              Retry tiles
            </button>
          </div>
        )}
      </div>
      <p className="interactive-map-coordinates" role="status" aria-live="polite">
        {location
          ? `Selected coordinates: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
          : "Click the map to select a field location."}
      </p>
    </div>
  );
}
