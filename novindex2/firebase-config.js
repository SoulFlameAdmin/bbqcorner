// novindex2/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhaEPIEODEoRiwTulBw4W9YTXyMW9sqKg",
  authDomain: "corner-bbq.firebaseapp.com",
  projectId: "corner-bbq",
  storageBucket: "corner-bbq.firebasestorage.app",
  messagingSenderId: "878314744141",
  appId: "1:878314744141:web:f869886ee4380e9dbcaf04",
  measurementId: "G-FWBDL96GN0"
};

const app = initializeApp(firebaseConfig);

// 🔥 Firestore
const db = getFirestore(app);
window.firebaseDb = db;

// 🔥 Storage (за снимки)
const storage = getStorage(app);
window.firebaseStorage      = storage;
window.firebaseStorageRef   = storageRef;
window.firebaseUploadBytes  = uploadBytes;
window.firebaseGetURL       = getDownloadURL;

console.log("Firebase зареден успешно:", { db, storage });
