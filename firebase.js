import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDiOFKHUgAkVCgeSu_g_MmHW-eqgLzIeRg",
  authDomain: "bulkbase-20b55.firebaseapp.com",
  projectId: "bulkbase-20b55",
  storageBucket: "bulkbase-20b55.firebasestorage.app",
  messagingSenderId: "327444676680",
  appId: "1:327444676680:web:62a86b5b48bd2ab67c187d",
  databaseURL: "https://bulkbase-20b55-default-rtdb.europe-west1.firebasedatabase.app",
  measurementId: "G-JSYBB968NE"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export { app };
export const db = getDatabase(app);
export const auth = getAuth(app);
