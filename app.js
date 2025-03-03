import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,remove, 
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

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
// Logbook Page Code using Grid.js
// -----------------------------
if (document.getElementById("gridjs-logbook")) {
  function loadEntries() {
    const logbookRef = ref(db, "logbook");
    // Order entries by the "date" field (ascending order)
    const logbookQuery = query(logbookRef, orderByChild("date"));
    
    onValue(logbookQuery, (snapshot) => {
      const data = snapshot.val();
      let entries = [];
      // Convert the object into an array of entries with their IDs
      for (let id in data) {
        entries.push({ id, ...data[id] });
      }
      // Sort entries descending by date (assuming date is in "YYYY-MM-DD" format)
      entries.sort((a, b) => b.date.localeCompare(a.date));
      
      // Store entries globally for use in the row click handler
      window.logbookEntries = entries;
      
      // Prepare data for Grid.js:
      // The first (blank) row is for adding a new entry.
      let gridData = [];
      gridData.push(["", "", "", "", "", "", "", "", "", ""]);
      // Append each entry as an array of values
      entries.forEach(entry => {
        gridData.push([
          entry.date,
          entry.aircraft,
          entry.registration,
          entry.name,
          entry.designation,
          entry.departurePoint,
          entry.departureTime,
          entry.arrivalPoint,
          entry.arrivalTime,
          calculateFlightTime(entry.departureTime, entry.arrivalTime)
        ]);
      });
      
      // Render the grid using Grid.js with rowClick property
      new gridjs.Grid({
        columns: [
          "Date",
          "Aircraft",
          "Registration",
          "Name",
          "Designation",
          "Departure Point",
          "Departure Time",
          "Arrival Point",
          "Arrival Time",
          "Total Flight Time"
        ],
        data: gridData,
        sort: true,
        pagination: {
          enabled: false
        },
        rowClick: (row, rowIndex) => {
          if (rowIndex === 0) {
            window.location.href = "entry.html?id=new";
          } else {
            const entryId = window.logbookEntries[rowIndex - 1].id;
            window.location.href = `entry.html?id=${entryId}`;
          }
        }
      }).render(document.getElementById("gridjs-logbook"));
    });
  }
  
  loadEntries();
}


// -----------------------------
// Code for entry.html (log entry form)
// -----------------------------
if (document.getElementById("log-entry-form")) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const form = document.getElementById("log-entry-form");

  // If editing an existing entry, load its data and add a delete button.
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

    // Create a Delete button for removing the entry.
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete Entry";
    deleteButton.type = "button"; // Ensure it doesn't trigger form submission.
    deleteButton.style.backgroundColor = "#d9534f"; // Optional styling (red)
    deleteButton.style.color = "white";
    deleteButton.style.marginTop = "20px";

    form.appendChild(deleteButton);

    // Attach a click event that asks for confirmation before deletion.
    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm("Are you sure you want to delete this entry?");
      if (confirmed) {
        try {
          await remove(entryRef);
          alert("Entry deleted.");
          window.location.href = "index.html";
        } catch (error) {
          console.error("Error deleting entry:", error);
          alert("Failed to delete entry.");
        }
      }
    });
  }

  // Handle form submission for creating/updating an entry.
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
        // Update an existing entry.
        const entryRef = ref(db, "logbook/" + id);
        await update(entryRef, entryData);
      } else {
        // Add a new entry using push to generate a new key.
        const newEntryRef = push(ref(db, "logbook"));
        await set(newEntryRef, entryData);
      }
      // Redirect back to the logbook page after saving.
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error saving entry: ", error);
      alert("Failed to save entry. Please try again.");
    }
  });
}
