"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";


export default function Home() {
  
  const router = useRouter();
  const [loading, setLoading] = useState(true); // Initial loading for auth check

  // Check if the user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/"); // Redirect if already logged in
      } else {
        setLoading(false); // Stop loading when no user is found
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">
          Checking authentication...
        </p>
      </div>
    </div>
    );
  }

  return (
    
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800">GNSS Intro</h1>
        <p className="text-gray-600 mt-2">Welcome to the GNSS Tracffic Monitoring System</p>
        <div className="mt-4">
          <a href="/govt_login" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Login
          </a>
          <a href="/govt_signup" className="px-4 py-2 ml-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
            Sign Up
          </a>
        </div>
      </div>
    </main>
  );
}
