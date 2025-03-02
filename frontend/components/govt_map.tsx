"use client";
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { db, collection, getDocs } from "@/lib/firebase";

// Dynamically import React Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((mod) => mod.Polygon), { ssr: false });

const Map = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [noParkingZones, setNoParkingZones] = useState<{ name: string; coords: [number, number][] }[]>([]);
  const [overSpeedingZones, setOverSpeedingZones] = useState<{ name: string; coords: [number, number][] }[]>([]);
  const [selectedZone, setSelectedZone] = useState<{ lat: number; lng: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredZones, setFilteredZones] = useState<{ name: string; type: string; coords: [number, number][] }[]>([]);

  useEffect(() => {
    import("leaflet").then((leaflet) => setL(leaflet.default));

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );

    const fetchGeofences = async () => {
      try {
        const noParkingSnap = await getDocs(collection(db, "no_parking"));
        const overSpeedingSnap = await getDocs(collection(db, "over_speeding"));

        const parseCoordinates = (doc: any, type: string) => ({
          name: doc.id,
          type,
          coords: ["c1", "c2", "c3", "c4"].map((c) => doc.data()[c].split(",").map(Number)) as [number, number][],
        });

        setNoParkingZones(noParkingSnap.docs.map((doc) => parseCoordinates(doc, "No Parking")));
        setOverSpeedingZones(overSpeedingSnap.docs.map((doc) => parseCoordinates(doc, "Over Speeding")));
      } catch (error) {
        console.error("Error fetching geofences:", error);
      }
    };

    fetchGeofences();
  }, []);

  const allZones = useMemo(() => [...noParkingZones, ...overSpeedingZones], [noParkingZones, overSpeedingZones]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredZones([]);
    } else {
      setFilteredZones(
        allZones
          .filter((zone) => zone.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((zone) => ({
            name: zone.name,
            type: noParkingZones.includes(zone) ? "No Parking" : "Over Speeding",
            coords: zone.coords,
          }))
      );
    }
  }, [searchTerm, allZones, noParkingZones]);

  if (!L || !location) return <p style={{ textAlign: "center", marginTop: "20px" }}>Loading Map...</p>;

  const markerIcon = new L.Icon({
    iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-red.png",
    iconSize: [30, 45],
    iconAnchor: [15, 45],
    popupAnchor: [0, -40],
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px" }}>
      {/* 🔍 Search Bar */}
      <div style={{ width: "100%", maxWidth: "400px", marginBottom: "10px", position: "relative" }}>
        <input
          type="text"
          placeholder="Search zones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            fontSize: "16px",
          }}
        />
        {filteredZones.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "42px",
              left: "0",
              width: "100%",
              backgroundColor: "#fff",
              listStyle: "none",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              maxHeight: "200px",
              overflowY: "auto",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: 10,
            }}
          >
            {filteredZones.map((zone, idx) => (
              <li
                key={idx}
                onClick={() => {
                  setSelectedZone({ lat: zone.coords[0][0], lng: zone.coords[0][1] });
                  setSearchTerm(zone.name);
                  setFilteredZones([]);
                }}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  backgroundColor: "#f9f9f9",
                  borderBottom: "1px solid #ddd",
                }}
              >
                {zone.name} ({zone.type})
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => setSelectedZone(location)}
        style={{
          padding: "10px 15px",
          backgroundColor: "#007bff",
          color: "white",
          borderRadius: "5px",
          border: "none",
          cursor: "pointer",
          marginBottom: "10px",
        }}
      >
        Reset to My Location
      </button>

      {/* 🗺️ Map */}
      <MapContainer
        center={selectedZone || [location.lat, location.lng]}
        zoom={14}
        scrollWheelZoom
        style={{ height: "80vh", width: "100%", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />

        <Marker position={[location.lat, location.lng]} icon={markerIcon}>
          <Popup>Your Location</Popup>
        </Marker>

        {/* No Parking Zones */}
        {noParkingZones.map((zone, idx) => (
          <Polygon
            key={idx}
            positions={zone.coords}
            pathOptions={{ color: "red", weight: 2, fillOpacity: 0.3 }}
            eventHandlers={{ click: () => setSelectedZone({ lat: zone.coords[0][0], lng: zone.coords[0][1] }) }}
          >
            <Popup>No Parking Zone: {zone.name}</Popup>
          </Polygon>
        ))}

        {/* Over Speeding Zones */}
        {overSpeedingZones.map((zone, idx) => (
          <Polygon
            key={idx}
            positions={zone.coords}
            pathOptions={{ color: "blue", weight: 2, fillOpacity: 0.3 }}
            eventHandlers={{ click: () => setSelectedZone({ lat: zone.coords[0][0], lng: zone.coords[0][1] }) }}
          >
            <Popup>Over Speeding Zone: {zone.name}</Popup>
          </Polygon>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
