"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User } from "firebase/auth";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { db, collection,addDoc, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function CreateGeofence() {
  // const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [violationType, setViolationType] = useState("");
  const [coordinates, setCoordinates] = useState(["", "", "", ""]);
  const [speed, setSpeed] = useState(""); // Speed input for Over Speeding
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // useEffect(() => {
  //   setHydrated(true);
  // }, []);

  // if (!hydrated) return null;
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/intro");
      } else {
        setUser(user);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleNext = () => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1 && (!name || !violationType)) {
      newErrors.general = "All fields are required.";
    } else if (step === 2 && coordinates.some((coord) => !coord || coord.trim() === "")) {
      newErrors.general = "All coordinates are required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (violationType === "Over Speeding") {
        setStep(3);
      } else {
        handleCreate(); // Skip to final submission if not Over Speeding
      }
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };
  const handleCreate = async () => {
    const newErrors: { [key: string]: string } = {};
  
    if (violationType === "Over Speeding" && (!speed || isNaN(Number(speed)) || Number(speed) <= 0)) {
      newErrors.general = "Please enter a valid speed limit.";
    }
  
    if (!name || name.trim() === "") {
      newErrors.name = "Please enter a name.";
    }
  
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
  
    setIsCreating(true); // Start loading
  
    // Ensure exactly 4 coordinates, filling empty ones with ""
    const formattedCoordinates = coordinates.map((coord) =>
      coord ? coord.trim() : ""
    );
  
    while (formattedCoordinates.length < 4) {
      formattedCoordinates.push(""); // Fill with empty strings if less than 4
    }
  
    interface GeofenceData {
      name: string;
      c1: string;
      c2: string;
      c3: string;
      c4: string;
      speed_limit?: number;
    }
    
    const geofenceData: GeofenceData = {
      name: name.trim(),
      c1: formattedCoordinates[0] || "",
      c2: formattedCoordinates[1] || "",
      c3: formattedCoordinates[2] || "",
      c4: formattedCoordinates[3] || "",
    };
    
  
    if (violationType === "Over Speeding") {
      geofenceData.speed_limit = Number(speed);
    }
  
    const collectionName = violationType === "Over Speeding" ? "over_speeding" : "no_parking";
  
    try {
      await addDoc(collection(db, collectionName), geofenceData);
      setTimeout(() => {
        router.replace("/");
      }, 500);
    } catch (error) {
      console.error("Error saving geofence:", error);
    }
  };
  
  
    // Show a loading indicator before rendering the dashboard
    if (loading || (!user && typeof window !== "undefined")) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>

          </div>
        </div>
      );
    }
    if (isCreating) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
            <p className="text-white text-lg">Creating geofence...</p>
          </div>
        </div>
      );
    }
  

  return (
    <div className="min-h-screen flex bg-gray-900 text-white">
      {/* Map Section */}
      <motion.div className="w-2/3 h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-800">
        <motion.div className="text-5xl font-bold text-white opacity-50">
          Geofencing Simplified
        </motion.div>
      </motion.div>

      {/* Form Section */}
      <div className="w-1/3 p-6 flex flex-col justify-center bg-gray-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-10 left-11 text-gray-400">
          <p className="text-xl mb-0.5">Step {step}</p>
          <h2 className="text-2xl font-bold text-white">
            {step === 1 ? "Enter Geofence Details" : step === 2 ? "Enter Coordinates" : "Set Speed Limit"}
          </h2>
        </div>

        {step > 1 && (
          <button onClick={handleBack} className="absolute top-5 right-5 p-2">
            <ArrowLeft className="text-white" />
          </button>
        )}

        <div className="mt-2.5 relative w-full h-full overflow-hidden">
          <motion.div
            className="flex w-full"
            initial={{ x: 0 }}
            animate={{ x: step === 1 ? "0%" : step === 2 ? "-100%" : "-200%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {/* Step 1: Name & Violation Type */}
            <div className="w-full flex-shrink-0 px-5 mt-24">
              <label className="block ml-0 mb-2">Geofence Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded-lg mb-2"
              />
              <label className="block mt-2.5 mb-2">Violation Type</label>
              <select
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded-lg mb-2 h-10"
              >
                <option value="">Select</option>
                <option value="No Parking">No Parking</option>
                <option value="Over Speeding">Over Speeding</option>
              </select>
              {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
              <button onClick={handleNext} className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition mt-8">
                Next
              </button>
            </div>

            {/* Step 2: Coordinates */}
            <div className="w-full flex-shrink-0 px-5 mt-24">
              {coordinates.map((coord, index) => (
                <div key={index} className="mb-2">
                  <label className="block ml-0.5 mb-2">Coordinate {index + 1}</label>
                  <input
                    type="text"
                    placeholder="12.345678,34.567123"
                    value={coord}
                    onChange={(e) => {
                      const newCoords = [...coordinates];
                      newCoords[index] = e.target.value;
                      setCoordinates(newCoords);
                    }}
                    className="w-full p-2 bg-gray-700 text-white rounded-lg"
                  />
                </div>
              ))}
              {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
              <button
  onClick={handleNext}
  className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition mt-8"
>
  {violationType === "Over Speeding" ? "Next" : violationType === "No Parking" ? "Submit" : "Proceed"}
</button>
            </div>

            {/* Step 3: Speed Limit (Only for Over Speeding) */}
            <div className="w-full flex-shrink-0 px-5 mt-24">
              <label className="block ml-0 mb-2">Speed Limit (km/h)</label>
              <input
                type="number"
                placeholder="Enter speed limit"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded-lg mb-2"
              />
              {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
              <button onClick={handleCreate} className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition mt-8">
                Submit
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
