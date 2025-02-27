"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      router.replace("/user_dashboard");
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    try {
      const usersRef = collection(db, "user_details");
      const q = query(
        usersRef,
        where("phone", "==", `+91${phone}`),
        where("vehicle_no", "==", vehicleNo)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Invalid phone number or vehicle registration number.");
        setLoggingIn(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      localStorage.setItem("user", JSON.stringify(userData));

      router.replace("/user_dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setLoggingIn(false);
    }
  };

  if (loading || loggingIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#0052CC] border-dashed rounded-full animate-spin"></div>
          <p className="mt-4 text-[#0052CC] font-medium">
            {loggingIn ? "Logging in..." : "Checking authentication..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#F4F5F7] overflow-hidden">
      {/* Background Vector Shapes */}
      <div className="absolute inset-0 flex justify-center items-center">
        <svg
          className="absolute top-[-10%] left-[-5%] w-[250px] opacity-20"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="100" fill="#0052CC" />
        </svg>
        <svg
          className="absolute bottom-[-10%] right-[-5%] w-[300px] opacity-20"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#172B4D"
            d="M43,-75.4C54.9,-64.5,64,-54.4,72.3,-43.3C80.6,-32.2,88.1,-20.1,87.9,-8C87.6,4,79.5,16,74.2,30.2C68.9,44.5,66.4,61,57.1,70.3C47.8,79.6,31.7,81.8,16.7,82.6C1.7,83.4,-12.1,82.8,-23.9,77.4C-35.6,72,-45.4,61.8,-51.5,50.2C-57.7,38.7,-60.3,25.7,-66,11.6C-71.7,-2.5,-80.5,-17.6,-77.7,-31.5C-74.9,-45.5,-60.6,-58.3,-45.7,-69.4C-30.8,-80.5,-15.4,-89.9,-1.4,-87.8C12.6,-85.7,25.2,-72.3,43,-75.4Z"
          />
        </svg>
      </div>
      <div className="absolute top-6 right-6">
        <img src="/Your paragraph text (3).png"  alt="TechTitans Logo" className="w-15 h-16 object-contain" />

      </div>
      {/* <div className="absolute top-6 right-6">
         <Image
          src="/Your paragraph text (3).png"
          alt="TechTitans Logo"
          width={64}  // Adjust width and height as needed
          height={69}
          className="w-15 h-16 object-contain"
        />
      </div> */}
      {/* Login Form */}
      <div className="relative bg-white p-10 rounded-3xl rounded-br-none shadow-md max-w-md w-full border border-gray-200">
        <h2 className="text-3xl font-thin
       text-[#172B4D] text-center mb-6" style={{ fontFamily: "var(--font-poppins)" }}>
          Login
        </h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form className="space-y-6" onSubmit={handleLogin}>
          {/* Phone Number Input */}
          <div className="flex items-center bg-[#F4F5F7] px-4 py-3 rounded-lg border border-gray-300 focus-within:border-[#0052CC] focus-within:ring-0.5 focus-within:ring-[#0052CC] transition-all">
            <span className="text-[#172B4D] font-medium">+91</span>
            <input
              type="text"
              placeholder="Phone Number"
              className="w-full bg-transparent text-[#172B4D] placeholder-gray-500 focus:outline-none ml-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* Vehicle Number Input */}
          <input
            type="text"
            placeholder="Vehicle No. (e.g., TN01AB1234)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-[#F4F5F7] text-[#172B4D] placeholder-gray-500 focus:outline-none focus:ring-0.5 focus:ring-[#0052CC] focus:border-[#0052CC] transition-all"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            required
          />

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#0052CC] text-white px-5 py-3 rounded-lg font-semibold hover:bg-[#003F91] transition-all duration-300"
          >
            Submit
          </button>
        </form>

      </div>
    </main>
  );
}
