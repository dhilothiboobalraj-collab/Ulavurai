import { useState } from "react";
import { LoaderCircle, MapPin } from "lucide-react";
import InteractiveLocationMap from "./InteractiveLocationMap.jsx";
import { requestCurrentLocation } from "../services/interactiveMap.js";

export default function SatelliteMapPicker({
  location,
  onLocationSelect,
  loading,
  onLocationError,
}) {
  const [locating, setLocating] = useState(false);

  async function useCurrentLocation() {
    onLocationError("");
    setLocating(true);
    try {
      onLocationSelect(await requestCurrentLocation());
    } catch (reason) {
      onLocationError(
        reason instanceof Error
          ? reason.message
          : "Could not get your current location. Select your field directly on the map instead.",
      );
    } finally {
      setLocating(false);
    }
  }

  return (
    <section className="satellite-picker">
      <div className="satellite-picker-heading">
        <div>
          <p className="eyebrow"><MapPin size={14} /> FIELD LOCATION</p>
          <p className="muted">
            Choose Satellite or Normal Map, then click your field to select coordinates.
          </p>
        </div>
        <button
          className="button button-quiet no-print"
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
        >
          {locating
            ? <><LoaderCircle className="spin" size={17} /> Finding your location…</>
            : <><MapPin size={17} /> Use My Current Location</>}
        </button>
      </div>
      <InteractiveLocationMap
        location={location}
        onLocationSelect={onLocationSelect}
        onLocationError={onLocationError}
        label="Interactive map. Choose satellite or normal map and click to select field coordinates."
        className="satellite-map"
      />
      {loading && (
        <p className="satellite-picker-loading" role="status">
          <LoaderCircle className="spin" size={18} /> Looking up local soil and historical climate…
        </p>
      )}
      <p className="fine-print">
        Map tiles require an internet connection. Browser location access is requested only when you click the current-location button and may require HTTPS or localhost.
      </p>
    </section>
  );
}
