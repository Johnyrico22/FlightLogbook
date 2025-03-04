// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCeuF96j720WmtcNe_JkajIRz9SF-5rkYk",
  authDomain: "logbook-969dc.firebaseapp.com",
  databaseURL: "https://logbook-969dc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "logbook-969dc",
  storageBucket: "logbook-969dc.firebasestorage.app",
  messagingSenderId: "333508920254",
  appId: "1:333508920254:web:fbde733cb8a577dbfd6fef"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

/**
 * Returns flight duration in minutes given departure and arrival times ("HH:MM").
 */
function getFlightMinutes(departureTime, arrivalTime) {
  const [depHours, depMinutes] = departureTime.split(":").map(Number);
  const [arrHours, arrMinutes] = arrivalTime.split(":").map(Number);
  let depTotal = depHours * 60 + depMinutes;
  let arrTotal = arrHours * 60 + arrMinutes;
  if (arrTotal < depTotal) {
    arrTotal += 24 * 60;
  }
  return arrTotal - depTotal;
}

/**
 * Returns flight time as a string (e.g., "2h 30m") from departure and arrival times.
 */
function calculateFlightTime(departureTime, arrivalTime) {
  const minutes = getFlightMinutes(departureTime, arrivalTime);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

/**
 * Convert a time string ("HH:mm") to minutes.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes to a time string ("HH:mm").
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// If Day.js and the plugin are loaded, extend dayjs.
if (typeof window.dayjs !== "undefined" && window.dayjs_plugin_customParseFormat) {
    window.dayjs.extend(window.dayjs_plugin_customParseFormat);
  }

export { db, getFlightMinutes, calculateFlightTime, timeToMinutes, minutesToTime, auth };
