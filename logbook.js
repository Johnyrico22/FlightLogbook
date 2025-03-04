// logbook.js
import { db, calculateFlightTime, minutesToTime, getFlightMinutes } from "./firebase.js";
import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // Ensure required containers exist.
  if (!document.getElementById("tabulator-table") || !document.getElementById("mobile-cards-container")) return;

  const auth = getAuth();
  
  // Use auth state listener to ensure a user is signed in.
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      loadEntriesOnce();
    }
  });
  
  // "Add New Entry" button
  const addEntryButton = document.getElementById("add-entry-btn");
  addEntryButton.addEventListener("click", () => {
    window.location.href = "entry.html?id=new";
  });
  
  // "Import" button
  document.getElementById("import-btn").addEventListener("click", () => {
    window.location.href = "import.html";
  });
  
  // Column selector UI (for desktop view)
  const colSelectorBtn = document.getElementById("column-selector-btn");
  const colSelectorPanel = document.getElementById("column-selector-panel");
  const applyColumnsBtn = document.getElementById("apply-columns-btn");
  
  if (colSelectorBtn && colSelectorPanel && applyColumnsBtn) {
    colSelectorBtn.addEventListener("click", () => {
      colSelectorPanel.style.display = colSelectorPanel.style.display === "none" ? "block" : "none";
    });
  
    applyColumnsBtn.addEventListener("click", () => {
      const checkboxes = colSelectorPanel.querySelectorAll("input[type=checkbox]");
      checkboxes.forEach(cb => {
        const field = cb.getAttribute("data-field");
        const column = tabulatorTable && tabulatorTable.getColumn(field);
        if (column) {
          cb.checked ? column.show() : column.hide();
        }
      });
      colSelectorPanel.style.display = "none";
    });
  }
  
  let tabulatorTable; // For desktop view
  let entriesCache = []; // Global cache of entries
  let currentViewMode = ""; // "mobile" or "desktop"
  
  // Render view (table or mobile cards) based on screen width.
  function renderView(entries) {
    console.log("Rendering view with entries:", entries); // Add this line to log entries being rendered
    const newViewMode = window.innerWidth < 800 ? "mobile" : "desktop";
    currentViewMode = newViewMode;
    
    if (newViewMode === "mobile") {
      // Hide table view.
      const tableContainer = document.getElementById("tabulator-table");
      if (tableContainer) tableContainer.style.display = "none";
      
      // Render mobile card layout.
      const mobileContainer = document.getElementById("mobile-cards-container");
      mobileContainer.innerHTML = ""; // Clear previous cards
      entries.forEach(entry => {
        const card = document.createElement("div");
        card.classList.add("card");
        const totalFlight = calculateFlightTime(entry.departureTime, entry.arrivalTime);
        // Title format: "$date - flight from $departurePoint to $arrivalPoint"
        const title = `${entry.date} - flight from ${entry.departurePoint} to ${entry.arrivalPoint}`;
        card.innerHTML = `
          <h3>${title}</h3>
          <p><strong>Aircraft:</strong> ${entry.aircraft}</p>
          <p><strong>Registration:</strong> ${entry.registration}</p>
          <p><strong>Name:</strong> ${entry.name} (${entry.designation})</p>
          <p><strong>Departure Time:</strong> ${entry.departureTime}</p>
          <p><strong>Arrival Time:</strong> ${entry.arrivalTime}</p>
          <p><strong>Total Flight Time:</strong> ${totalFlight}</p>
        `;
        card.style.whiteSpace = "normal";
        card.addEventListener("click", () => {
          window.location.href = `entry.html?id=${entry.id}`;
        });
        mobileContainer.appendChild(card);
      });
      mobileContainer.style.display = "block";
    } else {
      // Desktop/table view.
      const mobileContainer = document.getElementById("mobile-cards-container");
      if (mobileContainer) mobileContainer.style.display = "none";
      const tableContainer = document.getElementById("tabulator-table");
      if (tableContainer) tableContainer.style.display = "block";
      
      const tableData = entries.map(entry => {
        const totalFlight = calculateFlightTime(entry.departureTime, entry.arrivalTime);
        return {
          id: entry.id,
          date: entry.date,
          aircraft: entry.aircraft,
          registration: entry.registration,
          name: entry.name,
          designation: entry.designation,
          departurePoint: entry.departurePoint,
          departureTime: entry.departureTime,
          arrivalPoint: entry.arrivalPoint,
          arrivalTime: entry.arrivalTime,
          totalFlightTime: totalFlight,
          single: (entry.flightType === "single") ? totalFlight : "",
          dual: (entry.flightType === "dual") ? totalFlight : "",
          instrument: entry.instrument || "",
          takeOffs: entry.takeOffs || 1,
          landings: entry.landings || 1,
          dayHours: entry.dayHours || totalFlight,
          nightHours: entry.nightHours || "00:00",
          tacoFinish: entry.tacoFinish || "",
          hobbsFinish: entry.hobbsFinish || ""
        };
      });
      
      if (tabulatorTable && typeof tabulatorTable.destroy === "function") {
        tabulatorTable.destroy();
      }
      
      tabulatorTable = new Tabulator("#tabulator-table", {
        data: tableData,
        layout: "fitColumns",
        movableColumns: true,
        responsiveLayout: "collapse",
        columns: [
          { title: "Date", field: "date", sorter: "string" },
          { title: "Aircraft", field: "aircraft", sorter: "string" },
          { title: "Registration", field: "registration", sorter: "string" },
          { title: "Name", field: "name", sorter: "string" },
          { title: "Designation", field: "designation", sorter: "string" },
          { title: "Departure Point", field: "departurePoint", sorter: "string" },
          { title: "Departure Time", field: "departureTime", sorter: "string" },
          { title: "Arrival Point", field: "arrivalPoint", sorter: "string" },
          { title: "Arrival Time", field: "arrivalTime", sorter: "string" },
          { title: "Total Flight Time", field: "totalFlightTime", sorter: "string" },
          { title: "Single", field: "single", sorter: "string" },
          { title: "Dual", field: "dual", sorter: "string" },
          { title: "Instrument", field: "instrument", sorter: "string" },
          { title: "Take Offs", field: "takeOffs", sorter: "number" },
          { title: "Landings", field: "landings", sorter: "number" },
          { title: "Day Hours", field: "dayHours", sorter: "string" },
          { title: "Night Hours", field: "nightHours", sorter: "string" },
          { title: "Taco Finish", field: "tacoFinish", sorter: "number" },
          { title: "Hobbs Finish", field: "hobbsFinish", sorter: "number" }
        ]
      });
      
      tabulatorTable.on("tableBuilt", () => {
        tabulatorTable.redraw();
      });
      
      tabulatorTable.on("rowClick", (e, row) => {
        const rowData = row.getData();
        window.location.href = `entry.html?id=${rowData.id}`;
      });
    }
  }
  
  // Load entries once from Firebase filtered by authenticated user's UID.
  function loadEntriesOnce() {
    const logbookRef = ref(db, "logbook");
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    
    const logbookQuery = query(logbookRef, orderByChild("userId"), equalTo(user.uid));
    onValue(logbookQuery, (snapshot) => {
      const data = snapshot.val();
      console.log("Fetched data:", data); // Add this line to log fetched data
      let entries = [];
      for (let id in data) {
        entries.push({ id, ...data[id] });
      }
      // Sort entries descending by date.
      entries.sort((a, b) => b.date.localeCompare(a.date));
      entriesCache = entries;
      
      // Update summary.
      updateSummary(entriesCache);
      
      // Render view.
      renderView(entriesCache);
    });
  }
  
  loadEntriesOnce();
  
  // Listen for window resize events to update view.
  window.addEventListener("resize", () => {
    if (entriesCache.length > 0) {
      renderView(entriesCache);
    }
  });
  
  // Filter functionality.
  const filterInput = document.getElementById("filter-input");
  if (filterInput) {
    filterInput.addEventListener("input", () => {
      const term = filterInput.value.trim().toLowerCase();
      const filteredEntries = entriesCache.filter(entry => {
        return Object.values(entry).some(val => {
          return val && val.toString().toLowerCase().includes(term);
        });
      });
      renderView(filteredEntries);
      // Update summary based on filtered entries.
      updateSummary(filteredEntries);
    });
  }
  
  // Summary update function.
  function updateSummary(entries) {
    let totalMinutes = 0;
    let singleMinutes = 0;
    let dualMinutes = 0;
    let totalMinutesLast12 = 0;
    let singleMinutesLast12 = 0;
    let dualMinutesLast12 = 0;
    
    const oneYearAgo = dayjs().subtract(12, 'month');
    
    entries.forEach(entry => {
      const entryDate = dayjs(entry.date, "YYYY-MM-DD", true);
      const flightMins = getFlightMinutes(entry.departureTime, entry.arrivalTime);
      totalMinutes += flightMins;
      if (entry.flightType && entry.flightType.toLowerCase() === "single") {
        singleMinutes += flightMins;
      } else if (entry.flightType && entry.flightType.toLowerCase() === "dual") {
        dualMinutes += flightMins;
      }
      if (entryDate.isAfter(oneYearAgo)) {
        totalMinutesLast12 += flightMins;
        if (entry.flightType && entry.flightType.toLowerCase() === "single") {
          singleMinutesLast12 += flightMins;
        } else if (entry.flightType && entry.flightType.toLowerCase() === "dual") {
          dualMinutesLast12 += flightMins;
        }
      }
    });
    
    const overallTotal = minutesToTime(totalMinutes);
    const overallSingle = minutesToTime(singleMinutes);
    const overallDual = minutesToTime(dualMinutes);
    const last12Total = minutesToTime(totalMinutesLast12);
    const last12Single = minutesToTime(singleMinutesLast12);
    const last12Dual = minutesToTime(dualMinutesLast12);
    
    const summaryContainer = document.getElementById("summary-container");
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div class="summary-cards">
          <div class="summary-card">
            <p>Total Flight Time</p>
            <h3>${overallTotal}</h3>
          </div>
          <div class="summary-card">
            <p>Total Single Time</p>
            <h3>${overallSingle}</h3>
          </div>
          <div class="summary-card">
            <p>Total Dual Time</p>
            <h3>${overallDual}</h3>
          </div>
          <div class="summary-card">
            <p>Last 12 Months Flight Time</p>
            <h3>${last12Total}</h3>
          </div>
          <div class="summary-card">
            <p>Last 12 Months Single Time</p>
            <h3>${last12Single}</h3>
          </div>
          <div class="summary-card">
            <p>Last 12 Months Dual Time</p>
            <h3>${last12Dual}</h3>
          </div>
        </div>
      `;
    }
  }
});
