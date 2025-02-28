"use client";
import Map from "../components/govt_map";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, collection, getDocs, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { User } from "firebase/auth";
import { motion } from "framer-motion";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    if (!user) return;

    const fetchViolations = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "violation_details"));
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

  const handleLogout = async () => {
    try {
      toast.success("Logout successful! Redirecting...", {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      setTimeout(async () => {
        await signOut(auth);
        router.replace("/intro");
      }, 2000);

    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const exportAsExcel = () => {
    const worksheetData = [
      ["Violation ID", "Vehicle No.", "Type", "Name", "Speed (Exceeded/Limit) (km/hr)", "Duration (min)"],
      ...violations.map((violation) => [
        violation.id,
        violation.vehicleRegNo,
        violation.violationType,
        violation.name,
        violation.exceeded_limit !== "-" ? violation.exceeded_limit : "-",
        violation.duration !== "-" ? violation.duration : "-",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Violations");
    XLSX.writeFile(workbook, "violations_data.xlsx");
  };

  const exportAsPDF = () => {
    const doc = new jsPDF();
    doc.text("Violations Report", 14, 10);

    autoTable(doc, {
      head: [["Violation ID", "Vehicle No.", "Type", "Name", "Speed (Exceeded/Limit)", "Duration"]],
      body: violations.map((violation) => [
        violation.id,
        violation.vehicleRegNo,
        violation.violationType,
        violation.name,
        violation.exceeded_limit !== "-" ? `${violation.exceeded_limit} km/hr` : "-",
        violation.duration !== "-" ? `${violation.duration} min` : "-",
      ]),
      startY: 20,
    });

    doc.save("violations_report.pdf");
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


  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 to-black text-white p-6">
      <ToastContainer />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-400">Violations Dashboard</h1>
          <button onClick={handleLogout} className="px-5 py-2 bg-red-600 rounded-lg hover:bg-red-800 transition">
            Logout
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-6 bg-gray-700 rounded w-full"></div>
          <div className="h-6 bg-gray-700 rounded w-full"></div>
          <div className="h-6 bg-gray-700 rounded w-full"></div>
        </div>
      ) : (
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
                <td className="p3">
                  {violation.exceeded_limit !== "-" ? `${violation.exceeded_limit} km/hr` : "-"}
                </td>
                <td className="p3">
                  {violation.duration !== "-" ? `${violation.duration} min` : "-"}
                </td></tr>

            ))}
          </tbody>
        </motion.table>
      )}
      <button onClick={() => router.push("/create_geofence")} className="px-4 py-2 bg-green-600 rounded-lg mr-4 hover:bg-green-700">
        Create Geofence
      </button>
      <button onClick={() => router.push("/geo_fences")} className="px-4 py-2 bg-green-600 rounded-lg mr-4 hover:bg-green-700">
        View Geofences
      </button>


      <div className="flex justify-end mt-8">
        <div
          className="relative inline-block text-left"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          {/* Button */}
          <button className="px-9 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring">
            Export
          </button>


          {/* Dropdown */}
          {dropdownOpen && (
            <div className=" left-0 mt-1  bg-white border rounded-lg shadow-lg">
              <button
                onClick={() => { setDropdownOpen(false); exportAsPDF(); }}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-200 w-full text-left"
              >
                PDF
              </button>
              <button
                onClick={() => { setDropdownOpen(false); exportAsExcel(); }}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-200 w-full text-left"
              >
                Excel
              </button>
            </div>
          )}
        </div>
      </div>

      <Map />
    </div>
  );
}
