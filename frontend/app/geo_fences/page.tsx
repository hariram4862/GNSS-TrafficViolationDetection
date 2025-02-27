"use client";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, collection, getDocs, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { deleteDoc, doc } from "firebase/firestore";

interface Geofence {
    id: string;
    name: string;
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    speed_limit?: number;
    type: string;
}

export default function GeofenceDashboard() {
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

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

        const fetchGeofences = async () => {
            try {
                // Fetch data from both collections
                const [overSpeedingSnapshot, noParkingSnapshot] = await Promise.all([
                    getDocs(collection(db, "over_speeding")),
                    getDocs(collection(db, "no_parking"))
                ]);

                // Map over-speeding data (red rectangle)
                const overSpeedingData: Geofence[] = overSpeedingSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name || "-",
                    c1: doc.data().c1 || "-",
                    c2: doc.data().c2 || "-",
                    c3: doc.data().c3 || "-",
                    c4: doc.data().c4 || "-",
                    speed_limit: doc.data().speed_limit || 0,
                    type: "over_speeding" // Adding a type field to differentiate
                }));

                // Map no-parking data (yellow rectangle)
                const noParkingData: Geofence[] = noParkingSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name || "-",
                    c1: doc.data().c1 || "-",
                    c2: doc.data().c2 || "-",
                    c3: doc.data().c3 || "-",
                    c4: doc.data().c4 || "-",
                    type: "no_parking" // Adding a type field to differentiate
                }));
                // Merge and shuffle data randomly
                const mergedData = [...overSpeedingData, ...noParkingData].sort(() => Math.random() - 0.5);
                setGeofences(mergedData);
            } catch (error) {
                console.error("Error fetching geofences:", error);
            }
        };
        fetchGeofences();
    }, [user]);

    const handleDelete = async (id: string, type: string) => {
        const isConfirmed = window.confirm("Are you sure you want to delete this geofence?");
        if (!isConfirmed) return;
    
        try {
            await deleteDoc(doc(db, type, id));
            setGeofences(geofences.filter((geo) => geo.id !== id));
            toast.success("Geofence deleted successfully!", { autoClose: 1500 }); // Closes after 1.5 seconds
                    } catch (error) {
            console.error("Error deleting geofence:", error);
            toast.error("Failed to delete geofence.", { autoClose: 1500 }); // Closes after 1.5 seconds

        }
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
            <motion.table initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="w-full border border-gray-700 mt-4 text-center">
                <thead className="bg-gray-800">
                    <tr>
                        <th className="p-3">Geofence Name</th>
                        <th className="p-3">Coordinates <br></br> (Latitude, Longitude)</th>
                        <th className="p-3">Speed Limit <br></br> (in km/hr)</th>
                        <th className="p-3">Modify</th>
                    </tr>
                </thead>
                <tbody>
                    {geofences.map((geofence) => (
                        <tr key={geofence.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
                            <td className="p-3">{geofence.name}</td>
                            <td className="p-3">
                                <div className="flex justify-center items-center">
                                    <div className="relative flex justify-center items-center w-40 h-44 border border-transparent text-xs text-white font-bold">

                                        {/* Top-left (C1) */}
                                        <span className="absolute top-[-30px] left-[-65px] px-0 py-2 rounded text-center">
                                            <br /> ({geofence.c1.split(",")[0]},
                                            <br /> {geofence.c1.split(",")[1]})
                                        </span>

                                        {/* Top-right (C2) */}
                                        <span className="absolute top-[-30px] right-[-65px] px-0 py-2 rounded text-center">
                                            <br /> ({geofence.c2.split(",")[0]},
                                            <br /> {geofence.c2.split(",")[1]})
                                        </span>

                                        {/* Bottom-left (C3) */}
                                        <span className="absolute bottom-[-15px] left-[-65px] px-0 py-2 rounded text-center">
                                            <br /> ({geofence.c3.split(",")[0]},
                                            <br /> {geofence.c3.split(",")[1]})
                                        </span>

                                        {/* Bottom-right (C4) */}
                                        <span className="absolute bottom-[-15px] right-[-65px] px-0 py-2 rounded text-center">
                                            <br /> ({geofence.c4.split(",")[0]},
                                            <br /> {geofence.c4.split(",")[1]})
                                        </span>

                                        {/* Centered Geofence Box */}
                                        <div
                                            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[63%] ${geofence.type === "over_speeding" ? "bg-red-500" : "bg-yellow-500"
                                                } opacity-70`}
                                        ></div>
                                    </div>
                                </div>
                            </td>

                            <td className="p-3">{geofence.type === "over_speeding" ? geofence.speed_limit : "NA"}</td>

                            <td className="p-3">
                                <button
                                    onClick={() => handleDelete(geofence.id, geofence.type)}
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                                >
                                    Delete
                                </button>
                            </td>




                        </tr>
                    ))}
                </tbody>
            </motion.table>
        </div>
    );
}