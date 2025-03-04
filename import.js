// import.js

// Import Firebase functionality from our local firebase.js file.
import { db } from "./firebase.js";

import {
  ref,
  push,
  set
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

// Ensure Day.js and its plugin are loaded before using them
document.addEventListener('DOMContentLoaded', () => {
  // Retrieve Day.js and its customParseFormat plugin from the global scope.
  const dayjs = window.dayjs;
  const customParseFormat = window.dayjs_plugin_customParseFormat;

  if (dayjs && customParseFormat) {
    dayjs.extend(customParseFormat);
  } else {
    console.error("Day.js or customParseFormat plugin is not loaded.");
    return;
  }

  // -----------------------------
  // Helper Functions for Parsing
  // -----------------------------
  function parseDate(dateStr) {
    const formats = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "MMM D, YYYY"];
    for (const format of formats) {
      const parsed = dayjs(dateStr, format, true); // strict parsing
      if (parsed.isValid()) {
        return parsed.format("YYYY-MM-DD");
      }
    }
    console.warn("Date format not recognized:", dateStr);
    return dateStr;
  }

  function parseTime(timeStr) {
    const formats = ["HH:mm", "h:mm A", "HH:mm:ss"];
    for (const format of formats) {
      const parsed = dayjs(timeStr, format, true);
      if (parsed.isValid()) {
        return parsed.format("HH:mm");
      }
    }
    console.warn("Time format not recognized:", timeStr);
    return timeStr;
  }

  function calculateFlightTime(departureTime, arrivalTime) {
    const [depHours, depMinutes] = departureTime.split(":").map(Number);
    const [arrHours, arrMinutes] = arrivalTime.split(":").map(Number);
    let depTotal = depHours * 60 + depMinutes;
    let arrTotal = arrHours * 60 + arrMinutes;
    if (arrTotal < depTotal) {
      arrTotal += 24 * 60;
    }
    const diff = arrTotal - depTotal;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  }

  // -----------------------------
  // Import Functionality
  // -----------------------------
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const previewContainer = document.getElementById("preview-container");
  const importActions = document.getElementById("import-actions");
  const cancelImportButton = document.getElementById("cancel-import");
  const acceptImportButton = document.getElementById("accept-import");

  if (!cancelImportButton || !acceptImportButton || !importActions || !previewContainer) {
    console.error("Required elements are not found in the DOM.");
    return;
  }

  let csvData = [];

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", handleFile, false);

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "#eee";
  });
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "";
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      handleFile();
    }
  });

  function handleFile() {
    const file = fileInput.files[0];
    if (!file) return;
    
    console.log("Parsing file:", file.name);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        csvData = results.data;
        console.log("CSV parsed. Number of rows:", csvData.length);
        
        const requiredHeaders = [
          "date",
          "aircraft",
          "registration",
          "name",
          "designation",
          "departurePoint",
          "departureTime",
          "arrivalPoint",
          "arrivalTime",
          "flightType",
          "instrument",
          "takeOffs",
          "landings",
          "dayHours",
          "nightHours",
          "tacoFinish",
          "hobbsFinish"
        ];
        const headers = results.meta.fields;
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          alert("CSV is missing required headers: " + missing.join(", "));
          return;
        }
        displayPreview(csvData);
      },
      error: function(err) {
        alert("Error parsing CSV: " + err);
      }
    });
  }

  function displayPreview(data) {
    previewContainer.innerHTML = "";
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      const th = document.createElement("th");
      th.textContent = header;
      th.style.border = "1px solid #ccc";
      th.style.padding = "5px";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    data.forEach(row => {
      const tr = document.createElement("tr");
      headers.forEach(header => {
        const td = document.createElement("td");
        td.textContent = row[header];
        td.style.border = "1px solid #ccc";
        td.style.padding = "5px";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    const countDisplay = document.createElement("p");
    countDisplay.textContent = `Rows to import: ${data.length}`;
    previewContainer.appendChild(countDisplay);
    previewContainer.appendChild(table);
    importActions.style.display = "block";
    console.log("Preview displayed; import actions shown.");
  }

  cancelImportButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  acceptImportButton.addEventListener("click", async () => {
    console.log("Import button clicked. CSV data length:", csvData.length);
    if (!csvData.length) {
      alert("No data to import.");
      return;
    }
    let importedCount = 0;
    for (const row of csvData) {
      row.date = parseDate(row.date);
      row.departureTime = parseTime(row.departureTime);
      row.arrivalTime = parseTime(row.arrivalTime);
      
      const totalFlight = calculateFlightTime(row.departureTime, row.arrivalTime);
      if (row.flightType.toLowerCase() === "single") {
        row.single = totalFlight;
        row.dual = "";
      } else if (row.flightType.toLowerCase() === "dual") {
        row.dual = totalFlight;
        row.single = "";
      }
      
      const newEntryRef = push(ref(db, "logbook"));
      try {
        await set(newEntryRef, row);
        importedCount++;
      } catch (err) {
        console.error("Error importing row:", err);
      }
    }
    alert(`${importedCount} new rows have been added.`);
    window.location.href = "index.html";
  });
});
