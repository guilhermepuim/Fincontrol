import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
 
const firebaseConfig = {
  apiKey: "AIzaSyBZTu_ynlaQw70wR4KWVH4D8BTbt0gSNrk",
  authDomain: "fincontrol-4f015.firebaseapp.com",
  projectId: "fincontrol-4f015",
  storageBucket: "fincontrol-4f015.firebasestorage.app",
  messagingSenderId: "995369986592",
  appId: "1:995369986592:web:57c9cd59cf2793bad42a45"
};
 
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
 
// Set persistence once at init — survives page reloads on mobile
setPersistence(auth, browserLocalPersistence).catch(() => {});
 
