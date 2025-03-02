import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc,addDoc, collection,onSnapshot, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfFzRlBO7PG0zI7xEApTIBcYVvJkh0AyE",
  authDomain: "gnss-trafficviolationdetection.firebaseapp.com",
  projectId: "gnss-trafficviolationdetection",
  storageBucket: "gnss-trafficviolationdetection.firebasestorage.app",
  messagingSenderId: "876686687992",
  appId: "1:876686687992:web:c387112a65d8d0b080c50d",
  measurementId: "G-94NKFZGRQ6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);
export { db,  doc, getDoc,onSnapshot,addDoc,collection, getDocs, query, where};