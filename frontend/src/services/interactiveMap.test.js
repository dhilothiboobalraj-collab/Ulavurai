import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MAP_CENTER,
  MAP_LAYERS,
  getGeolocationErrorMessage,
  getMapClickCoordinates,
  requestCurrentLocation,
  validateMapCoordinates,
} from "./interactiveMap.js";

test("provides real satellite and road tile layers with attribution", () => {
  assert.match(MAP_LAYERS.satellite.url, /arcgisonline\.com\/.*World_Imagery/);
  assert.match(MAP_LAYERS.satellite.attribution, /Esri/);
  assert.match(MAP_LAYERS.normal.url, /tile\.openstreetmap\.org/);
  assert.match(MAP_LAYERS.normal.attribution, /openstreetmap\.org\/copyright/);
  assert.deepEqual(DEFAULT_MAP_CENTER, [20.5937, 78.9629]);
});

test("validates map-click coordinates", () => {
  assert.deepEqual(
    getMapClickCoordinates({ latlng: { lat: 11.2, lng: 78.3 } }),
    { latitude: 11.2, longitude: 78.3 },
  );
  assert.throws(
    () => validateMapCoordinates(91, 78),
    /finite latitude\/longitude values in range/,
  );
  assert.throws(
    () => getMapClickCoordinates({ latlng: { lat: Number.NaN, lng: 78 } }),
    /finite latitude\/longitude values in range/,
  );
});

test("requests browser location only when called and returns validated coordinates", async () => {
  let requestOptions;
  const geolocation = {
    getCurrentPosition(success, _failure, options) {
      requestOptions = options;
      success({ coords: { latitude: 12.5, longitude: 77.2 } });
    },
  };

  assert.deepEqual(await requestCurrentLocation(geolocation), {
    latitude: 12.5,
    longitude: 77.2,
  });
  assert.equal(requestOptions.timeout, 12000);
});

test("geolocation errors remain actionable and unavailable APIs reject", async () => {
  assert.match(getGeolocationErrorMessage({ code: 1 }), /permission was denied/);
  assert.match(getGeolocationErrorMessage({ code: 2 }), /unavailable/);
  assert.match(getGeolocationErrorMessage({ code: 3 }), /timed out/);
  await assert.rejects(requestCurrentLocation(null), /Geolocation is unavailable/);

  await assert.rejects(
    requestCurrentLocation({
      getCurrentPosition(_success, failure) {
        failure({ code: 1 });
      },
    }),
    /permission was denied/,
  );
});
