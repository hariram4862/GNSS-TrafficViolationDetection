"use client"; // Ensure Next.js treats this component as client-only
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { db, doc, onSnapshot } from "../lib/firebase";

// Dynamically import React Leaflet components (client-side only)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const Map = () => {
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    // Import leaflet dynamically inside useEffect (client-side only)
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });

    const locationRef = doc(db, "user_details", "ud_1");
    const unsubscribe = onSnapshot(locationRef, (doc) => {
      if (doc.exists()) {
        setLocation({ lat: doc.data().lat, lng: doc.data().long });
      }
    });

    return () => unsubscribe();
  }, []);

  if (!L) return <p>Loading Map...</p>; // Ensure leaflet is loaded before rendering

  const markerIcon = new L.Icon({
    iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={13}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[location.lat, location.lng]} icon={markerIcon}>
        <Popup>Live Location</Popup>
      </Marker>
    </MapContainer>
  );
};

export default Map;
