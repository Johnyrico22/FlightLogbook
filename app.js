// Import the functions you need from the CDN (Firebase 11.4.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeuF96j720WmtcNe_JkajIRz9SF-5rkYk",
  authDomain: "logbook-969dc.firebaseapp.com",
  databaseURL: "https://logbook-969dc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "logbook-969dc",
  storageBucket: "logbook-969dc.firebasestorage.app",
  messagingSenderId: "333508920254",
  appId: "1:333508920254:web:fbde733cb8a577dbfd6fef"
};

// Initialize Firebase and the Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Calculates total flight time given departure and arrival times in "HH:MM" format.
 */
function calculateFlightTime(departureTime, arrivalTime) {
  const [depHours, depMinutes] = departureTime.split(":").map(Number);
  const [arrHours, arrMinutes] = arrivalTime.split(":").map(Number);
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

// -----------------------------
// Code for index.html (logbook list)
// -----------------------------
if (document.getElementById("logbook-table")) {
  /**
   * Loads log entries from the Realtime Database and populates the table.
   * The entries are ordered by date (ascending) and then reversed for descending order.
   */
  function loadEntries() {
    const logbookRef = ref(db, "logbook");
    // Order entries by the "date" child; note that this orders ascending.
    const logbookQuery = query(logbookRef, orderByChild("date"));

    onValue(logbookQuery, (snapshot) => {
      const data = snapshot.val();
      let entries = [];
      // Convert the object into an array of entries
      for (let id in data) {
        entries.push({ id, ...data[id] });
      }
      // Sort entries descending by date (assuming date strings are in a sortable format, e.g., "YYYY-MM-DD")
      entries.sort((a, b) => b.date.localeCompare(a.date));

      const tbody = document.querySelector("#logbook-table tbody");
      // Clear existing rows and add the blank "Add New Entry" row at the top.
      tbody.innerHTML = `
        <tr data-id="new">
          <td colspan="10"><a href="entry.html?id=new">Add New Entry</a></td>
        </tr>
      `;

      // Append each entry as a row
      entries.forEach((entry) => {
        const tr = document.createElement("tr");
        tr.addEventListener("click", () => {
          window.location.href = `entry.html?id=${entry.id}`;
        });
        tr.innerHTML = `
          <td>${entry.date}</td>
          <td>${entry.aircraft}</td>
          <td>${entry.registration}</td>
          <td>${entry.name}</td>
          <td>${entry.designation}</td>
          <td>${entry.departurePoint}</td>
          <td>${entry.departureTime}</td>
          <td>${entry.arrivalPoint}</td>
          <td>${entry.arrivalTime}</td>
          <td>${calculateFlightTime(entry.departureTime, entry.arrivalTime)}</td>
        `;
        tbody.appendChild(tr);
      });
    });
  }
  loadEntries();

  // Basic filter functionality for table columns
  document.querySelectorAll("thead input").forEach((input) => {
    input.addEventListener("keyup", function () {
      const colIndex = this.parentElement.cellIndex;
      const filter = this.value.toUpperCase();
      const rows = document.querySelectorAll('#logbook-table tbody tr:not([data-id="new"])');
      rows.forEach((row) => {
        const cell = row.cells[colIndex];
        if (cell) {
          const textValue = cell.textContent || cell.innerText;
          row.style.display = textValue.toUpperCase().includes(filter) ? "" : "none";
        }
      });
    });
  });
}

// -----------------------------
// Code for entry.html (log entry form)
// -----------------------------
if (document.getElementById("log-entry-form")) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const form = document.getElementById("log-entry-form");

  // If editing an existing entry, load its data from the Realtime Database.
  if (id && id !== "new") {
    const entryRef = ref(db, "logbook/" + id);
    onValue(entryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
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
    }, { onlyOnce: true });
  }

  // Handle form submission for creating/updating an entry
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
        // Update an existing entry
        const entryRef = ref(db, "logbook/" + id);
        await update(entryRef, entryData);
      } else {
        // Add a new entry using push to generate a new key
        const newEntryRef = push(ref(db, "logbook"));
        await set(newEntryRef, entryData);
      }
      // Redirect back to the logbook page after saving
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error saving entry: ", error);
      alert("Failed to save entry. Please try again.");
    }
  });
}
