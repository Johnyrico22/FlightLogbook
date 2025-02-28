// Import Firebase v11 modules using the modular API
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCeuF96j720WmtcNe_JkajIRz9SF-5rkYk",
  authDomain: "logbook-969dc.firebaseapp.com",
  databaseURL: "https://logbook-969dc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "logbook-969dc",
  storageBucket: "logbook-969dc.firebasestorage.app",
  messagingSenderId: "333508920254",
  appId: "1:333508920254:web:fbde733cb8a577dbfd6fef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Calculates total flight time given departure and arrival times in "HH:MM" format.
 */
function calculateFlightTime(departureTime, arrivalTime) {
  const [depHours, depMinutes] = departureTime.split(':').map(Number);
  const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number);
  let depTotal = depHours * 60 + depMinutes;
  let arrTotal = arrHours * 60 + arrMinutes;
  // Handle flights that cross midnight
  if (arrTotal < depTotal) {
    arrTotal += 24 * 60;
  }
  const diff = arrTotal - depTotal;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}h ${minutes}m`;
}

// If on index.html, load log entries and set up filtering.
if (document.getElementById('logbook-table')) {
  async function loadEntries() {
    try {
      const q = query(collection(db, "logbook"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const tbody = document.querySelector('#logbook-table tbody');

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const tr = document.createElement('tr');
        // Make row clickable for editing the entry.
        tr.addEventListener('click', () => {
          window.location.href = `entry.html?id=${docSnap.id}`;
        });
        tr.innerHTML = `
          <td>${data.date}</td>
          <td>${data.aircraft}</td>
          <td>${data.registration}</td>
          <td>${data.name}</td>
          <td>${data.designation}</td>
          <td>${data.departurePoint}</td>
          <td>${data.departureTime}</td>
          <td>${data.arrivalPoint}</td>
          <td>${data.arrivalTime}</td>
          <td>${calculateFlightTime(data.departureTime, data.arrivalTime)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error("Error loading entries: ", error);
      alert("Failed to load entries. Please check your network connection or try again later.");
    }
  }
  loadEntries();

  // Add basic filtering: each header input filters its corresponding column.
  document.querySelectorAll('thead input').forEach(input => {
    input.addEventListener('keyup', function() {
      const colIndex = this.parentElement.cellIndex;
      const filter = this.value.toUpperCase();
      const rows = document.querySelectorAll('#logbook-table tbody tr:not([data-id="new"])');
      rows.forEach(row => {
        const cell = row.cells[colIndex];
        if (cell) {
          const textValue = cell.textContent || cell.innerText;
          row.style.display = textValue.toUpperCase().includes(filter) ? "" : "none";
        }
      });
    });
  });
}

// If on entry.html, handle loading and saving of a log entry.
if (document.getElementById('log-entry-form')) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const form = document.getElementById('log-entry-form');

  // If editing an existing entry, load its data into the form.
  if (id && id !== "new") {
    const docRef = doc(db, "logbook", id);
    getDoc(docRef).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        form.date.value = data.date;
        form.aircraft.value = data.aircraft;
        form.registration.value = data.registration;
        form.name.value = data.name;
        form.designation.value = data.designation;
        form.departurePoint.value = data.departurePoint;
        form.departureTime.value = data.departureTime;
        form.arrivalPoint.value = data.arrivalPoint;
        form.arrivalTime.value = data.arrivalTime;
      }
    }).catch(error => {
      console.error("Error loading document: ", error);
      alert("Failed to load entry. Please check your network connection or try again later.");
    });
  }

  // Handle form submission for creating or updating an entry.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    // Collect form data
    const entryData = {
      date: form.date.value,
      aircraft: form.aircraft.value,
      registration: form.registration.value,
      name: form.name.value,
      designation: form.designation.value,
      departurePoint: form.departurePoint.value,
      departureTime: form.departureTime.value,
      arrivalPoint: form.arrivalPoint.value,
      arrivalTime: form.arrivalTime.value,
    };
  
    try {
      if (id && id !== "new") {
        // Update existing entry
        const docRef = doc(db, "logbook", id);
        await updateDoc(docRef, entryData);
      } else {
        // Add a new entry
        await addDoc(collection(db, "logbook"), entryData);
      }
      // Redirect back to the logbook page after a successful write
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error writing document: ", error);
      alert("Failed to save entry. Please check your network connection or try again later.");
    }
  });
}
