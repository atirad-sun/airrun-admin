/**
 * MapPicker — Google-Maps click-to-place-pin location picker for the
 * admin SPA's Add Park dialog.
 *
 * Adapted from the LIFF app's PickLocationOnMap.tsx (kept only the
 * map + marker + GPS-center button; dropped the AQI overlay,
 * navigation, secureApi calls, and SaveSpotSheet).  Uses the same
 * @vis.gl/react-google-maps library so we don't ship two map stacks.
 *
 * Behaviour:
 * - Defaults to Bangkok if no `value` is provided.
 * - Renders blank with a one-line notice when
 *   VITE_GOOGLE_MAPS_API_KEY is missing — the consumer's lat/lng
 *   form fallback (read-only text below the map) lets ops paste
 *   coords by hand if the map is broken.
 * - Click anywhere on the map → onChange(lat, lng).
 * - GPS button → request browser geolocation, pan + drop pin.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const BANGKOK_CENTER = { lat: 13.7563, lng: 100.5018 };
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 16;
// Stable Map ID required for AdvancedMarker.  This is the same id
// the LIFF app uses; safe to reuse since it's not a secret — Google
// uses it for cloud-side map style, not auth.
const MAP_ID = "airrun-admin-park-picker";

interface LatLng {
  lat: number;
  lng: number;
}

/** Imperatively pan the map when the GPS / external value changes. */
function PanTo({
  target,
  zoom = PICKED_ZOOM,
}: {
  target: LatLng | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    map.setZoom(zoom);
  }, [map, target, zoom]);
  return null;
}

export default function MapPicker({
  value,
  onChange,
  height = 280,
}: {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  height?: number;
}) {
  const [panTarget, setPanTarget] = useState<LatLng | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  // Track whether we've already auto-panned to value on mount so a
  // re-render doesn't keep yanking the map back to the original
  // position when the user wants to scroll.
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (initialisedRef.current) return;
    if (value) {
      setPanTarget(value);
      initialisedRef.current = true;
    }
  }, [value]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.detail.latLng) return;
      onChange({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
    },
    [onChange]
  );

  const handleGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported in this browser.");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPanTarget(loc);
        onChange(loc);
        setGpsBusy(false);
      },
      (err) => {
        setGpsError(err.message || "Unable to read your location.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        style={{
          height,
          borderRadius: 8,
          border: "1px dashed #EDF0F3",
          background: "#F7F8FA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#777D86",
          fontSize: 12,
          textAlign: "center",
          padding: "0 16px",
        }}
      >
        Map disabled — VITE_GOOGLE_MAPS_API_KEY not set. Enter
        coordinates manually below.
      </div>
    );
  }

  const center = value ?? BANGKOK_CENTER;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          height,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #EDF0F3",
        }}
      >
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={center}
            defaultZoom={value ? PICKED_ZOOM : DEFAULT_ZOOM}
            mapId={MAP_ID}
            gestureHandling="greedy"
            disableDefaultUI={false}
            clickableIcons={false}
            onClick={handleMapClick}
            style={{ width: "100%", height: "100%" }}
          >
            {value && (
              <AdvancedMarker position={value}>
                <Pin
                  background="#04DC9A"
                  borderColor="#0A2E22"
                  glyphColor="#0A2E22"
                />
              </AdvancedMarker>
            )}
            <PanTo target={panTarget} />
          </Map>
        </APIProvider>
      </div>
      <button
        type="button"
        onClick={handleGps}
        disabled={gpsBusy}
        title="Center on my location"
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "#fff",
          border: "1px solid #EDF0F3",
          cursor: gpsBusy ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          color: "#24262B",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        }}
      >
        {gpsBusy ? "…" : "⌖"}
      </button>
      {gpsError && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 12,
            background: "#FFF1F1",
            color: "#EF4B4B",
            border: "1px solid #F4D7D7",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            maxWidth: 200,
          }}
          role="alert"
        >
          {gpsError}
        </div>
      )}
    </div>
  );
}
