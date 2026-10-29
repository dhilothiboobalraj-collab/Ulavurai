export const DEFAULT_MAP_CENTER = [20.5937, 78.9629];
export const DEFAULT_MAP_ZOOM = 5;

export const MAP_LAYERS = {
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri — Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
  normal: {
    label: "Normal Map",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

export function validateMapCoordinates(latitude, longitude) {
  if (
    typeof latitude !== "number"
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || typeof longitude !== "number"
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    throw new RangeError("Map coordinates must be finite latitude/longitude values in range.");
  }
  return { latitude, longitude };
}

export function getMapClickCoordinates(event) {
  return validateMapCoordinates(event?.latlng?.lat, event?.latlng?.lng);
}

export function getGeolocationErrorMessage(error) {
  if (error?.code === 1) {
    return "Location permission was denied. Select your field directly on the map instead.";
  }
  if (error?.code === 2) {
    return "Your current location is unavailable. Select your field directly on the map instead.";
  }
  if (error?.code === 3) {
    return "The current-location request timed out. Select your field directly on the map instead.";
  }
  return "Could not get your current location. Select your field directly on the map instead.";
}

export function requestCurrentLocation(geolocation = globalThis.navigator?.geolocation) {
  if (!geolocation?.getCurrentPosition) {
    return Promise.reject(
      new Error("Geolocation is unavailable. Select your field directly on the map instead."),
    );
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        try {
          resolve(validateMapCoordinates(coords.latitude, coords.longitude));
        } catch (error) {
          reject(error);
        }
      },
      (error) => reject(new Error(getGeolocationErrorMessage(error))),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  });
}
