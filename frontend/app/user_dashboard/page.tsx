"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db, collection, getDocs, doc, getDoc } from "@/lib/firebase";
import { motion } from "framer-motion";
import { query, where } from "@firebase/firestore";

// const Map = dynamic(() => import("@/components/MapComponent"), { ssr: false });

interface User {
  phone: string;
  vehicle_no: string;
}

interface Violation {
  id: string;
  vehicleRegNo: string;
  violationType: string;
  name: string;
  exceeded_limit: string;
  duration: string;
}

export default function Dashboard() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.replace("/user_auth");
    } else {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Failed to parse user data:", error);
        localStorage.removeItem("user");
        router.replace("/user_auth");
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!user || !user.vehicle_no) return;

    const fetchViolations = async () => {
      try {
        const violationsRef = collection(db, "violation_details");
        const q = query(violationsRef, where("vehicle_no", "==", user.vehicle_no));
        const querySnapshot = await getDocs(q);
        const violationsData: Violation[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            vehicleRegNo: data.vehicle_no || "-",
            violationType: data.type || "-",
            name: data.name || "-",
            exceeded_limit: data.speed && data.speed_limit ? `${data.speed}/${data.speed_limit}` : "-",
            duration: data.duration || "-",
          };
        });
        setViolations(violationsData);
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };
    fetchViolations();
  }, [user]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const userDocRef = doc(db, "user_details", "ud_1");
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setLatitude(data.lat?.toString() || "-");
          setLongitude(data.long?.toString() || "-");
          
        } else {
          console.log("No location data found.");
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    };
    fetchLocation();
  }, []);

  const handleLogout = () => {
    toast.success("Logout successful! Redirecting...", {
      position: "top-right",
      autoClose: 1500,
    });
    setTimeout(() => {
      localStorage.removeItem("user");
      router.replace("/user_auth");
    }, 2000);
  };

  if (loading || (!user && typeof window !== "undefined")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 to-black text-white p-6">
      <ToastContainer />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 transition text-white rounded-lg">Logout</button>
      </div>
      {user && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <p className="text-lg"><strong>Phone:</strong> {user.phone}</p>
          <p className="text-lg"><strong>Vehicle No.:</strong> {user.vehicle_no}</p>
          <p className="text-lg"><strong>Latitude:</strong> {latitude}</p>
          <p className="text-lg"><strong>Longitude:</strong> {longitude}</p>
        </div>
      )}
      <motion.table initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="w-full border border-gray-700 mt-4 text-center">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-3">Violation ID</th>
            <th className="p-3">Vehicle No.</th>
            <th className="p-3">Type</th>
            <th className="p-3">Name</th>
            <th className="p-3">Speed (Exceeded/Limit)</th>
            <th className="p-3">Duration</th>
          </tr>
        </thead>
        <tbody>
          {violations.map((violation) => (
            <tr key={violation.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
              <td className="p-3">{violation.id}</td>
              <td className="p-3">{violation.vehicleRegNo}</td>
              <td className="p-3">{violation.violationType}</td>
              <td className="p-3">{violation.name}</td>
              <td className="p-3">{violation.exceeded_limit !== "-" ? `${violation.exceeded_limit} km/hr` : "-"}</td>
              <td className="p-3">{violation.duration !== "-" ? `${violation.duration} min` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </motion.table>
      <div className="mt-6 h-96 w-full">
      {/* {latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude)) ? (
  <Map latitude={parseFloat(latitude)} longitude={parseFloat(longitude)} />
) : (
  <p className="text-center text-gray-400">Loading map or invalid coordinates...</p>
)} */}

</div>

    </div>
  );
}
