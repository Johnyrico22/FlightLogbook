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
import { updateSummaryCards } from "./summaryCards.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event fired");

  // Ensure required containers exist.
  if (!document.getElementById("tabulator-table") || !document.getElementById("mobile-cards-container")) {
    console.log("Required elements are not found in the DOM.");
    return;
  }

  const auth = getAuth();
  
  // Use auth state listener to ensure a user is signed in.
  onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed:", user);
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
  // "stats" button 
  document.getElementById("stats-btn").addEventListener("click", () => {
    window.location.href = "reporting.html";
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
  let currentViewMode = "desktop"; // "mobile" or "desktop"
  
  // Render view (table or mobile cards) based on screen width.
  function renderView(entries) {
    console.log("Rendering view with entries:", entries);
    const newViewMode = window.innerWidth < 1100 ? "mobile" : "desktop";
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
        // Build card with a title container and two columns underneath.
        card.innerHTML = `
          <div class="card-title-container">
            <h3>${entry.date} - Flight from ${entry.departurePoint} to ${entry.arrivalPoint}</h3>
          </div>
          <div class="card-content">
            <div class="card-column">
              <p><strong>Aircraft:</strong> ${entry.aircraft}</p>
              <p><strong>Registration:</strong> ${entry.registration}</p>
              <p><strong>Name:</strong> ${entry.name} (${entry.designation})</p>
            </div>
            <div class="card-column">
              <p><strong>Departure Time:</strong> ${entry.departureTime}</p>
              <p><strong>Arrival Time:</strong> ${entry.arrivalTime}</p>
              <p><strong>Total Flight Time:</strong> ${totalFlight}</p>
            </div>
          </div>
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
          solo: (entry.flightType && entry.flightType.toLowerCase() === "solo") ? totalFlight : "",
          dual: (entry.flightType && entry.flightType.toLowerCase() === "dual") ? totalFlight : "",          
          singleEngine: (entry.engineType === "singleEngine") ? totalFlight : "",
          multiEngine: (entry.engineType === "multiEngine") ? totalFlight : "",
          engineType: entry.engineType || "",
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
        columnDefaults: {
          resizable: false, // disable column resizing for all columns
        },
        movableColumns: false,
        responsiveLayout: "hide",
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
          { title: "Single Engine", field: "singleEngine", sorter: "string" },
          { title: "Multi Engine", field: "multiEngine", sorter: "string" },
          { title: "Solo", field: "solo", sorter: "string" },
          { title: "Dual", field: "dual", sorter: "string" },
          { title: "Instrument", field: "instrument", sorter: "string" },
          { title: "Day Hours", field: "dayHours", sorter: "string" },
          { title: "Night Hours", field: "nightHours", sorter: "string" },
          { title: "Take Offs", field: "takeOffs", sorter: "number" },
          { title: "Landings", field: "landings", sorter: "number" },
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
  
  function loadEntriesOnce() {
    const logbookRef = ref(db, "logbook");
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.log("No user is authenticated");
      return;
    }
    
    const logbookQuery = query(logbookRef, orderByChild("userId"), equalTo(user.uid));
    onValue(logbookQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        console.log("No data found for the user.");
        return;
      }
      let entries = [];
      for (let id in data) {
        entries.push({ id, ...data[id] });
      }
      // Sort entries descending by date.
      entries.sort((a, b) => b.date.localeCompare(a.date));
      entriesCache = entries;
      
      // Render view and update summary.
      renderView(entriesCache);
      const summaryContainer = document.getElementById("summary-container");
      updateSummaryCards(entriesCache, summaryContainer, currentViewMode, false, false);
      

    }, (error) => {
      console.error("Error fetching data:", error);
    });
  }
  
  // Listen for window resize events to update view.
  window.addEventListener("resize", () => {
    if (entriesCache.length > 0) {
      renderView(entriesCache);
      const summaryContainer = document.getElementById("summary-container");
      updateSummaryCards(entriesCache, summaryContainer, currentViewMode, false, false);
      

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

});
