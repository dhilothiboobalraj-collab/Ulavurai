import InteractiveLocationMap from "./InteractiveLocationMap.jsx";

export default function SatelliteLocationPicker({
  selectedLocation,
  onSelectLocation,
  label,
}) {
  return (
    <InteractiveLocationMap
      location={selectedLocation}
      onLocationSelect={onSelectLocation}
      label={label}
      className="satellite-location-picker"
    />
  );
}
