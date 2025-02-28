import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc,addDoc, collection,onSnapshot, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC4Imu4bB-JrIpiVIBmcOvtclVhyJqJE30",
  authDomain: "traffic-violations-a8dc6.firebaseapp.com",
  projectId: "traffic-violations-a8dc6",
  storageBucket: "traffic-violations-a8dc6.firebasestorage.app",
  messagingSenderId: "437718234145",
  appId: "1:437718234145:web:cc73ffa6c9296737945f60",
  measurementId: "G-C3S6X3WZ7J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);
export { db,  doc, getDoc,onSnapshot, addDoc,collection, getDocs, query, where};