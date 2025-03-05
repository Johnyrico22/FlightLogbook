// entry.js
import { db, calculateFlightTime, getFlightMinutes, timeToMinutes, minutesToTime } from "./firebase.js";
import {
  ref,
  onValue,
  update,
  remove,
  push,
  set,
  get
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  
  // Use an auth state listener to ensure we wait for authentication status.
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // If no user is signed in, initiate Google sign-in popup.
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider)
        .then((result) => {
          console.log("Signed in as:", result.user.displayName);
          setupForm();
        })
        .catch((error) => {
          console.error("Sign in error:", error);
          alert("You must sign in to add or edit entries.");
        });
    } else {
      setupForm();
    }
  });
  
  // Helper: Convert a formatted duration string ("Xh Ym") to minutes.
  function parseDurationToMinutes(durationStr) {
    const match = durationStr.match(/(\d+)\s*h\s*(\d+)\s*m/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    // Fallback if not matching expected format:
    const parts = durationStr.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }
  
  // Helper: Convert minutes to a formatted duration string ("Xh Ym")
  function minutesToDurationStr(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }
  
  function setupForm() {
    if (!document.getElementById("log-entry-form")) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const form = document.getElementById("log-entry-form");
    
    // Grab separate day and night fields (ensure your HTML has these IDs)
    const dayHoursH = form.querySelector("#dayHoursH");
    const dayHoursM = form.querySelector("#dayHoursM");
    const nightHoursH = form.querySelector("#nightHoursH");
    const nightHoursM = form.querySelector("#nightHoursM");
    
    if (id && id !== "new") {
      const entryRef = ref(db, "logbook/" + id);
      onValue(entryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          form.date.value = data.date || "";
          form.aircraft.value = data.aircraft || "";
          form.registration.value = data.registration || "";
          form.name.value = data.name || "";
          form.designation.value = data.designation || "";
          form.departurePoint.value = data.departurePoint || "";
          form.departureTime.value = data.departureTime || "";
          form.arrivalPoint.value = data.arrivalPoint || "";
          form.arrivalTime.value = data.arrivalTime || "";
          if (data.flightType) {
            form.elements["flightType"].value = data.flightType;
          }
          if (data.engineType && form.elements["engineType"]) {
            form.elements["engineType"].value = data.engineType;
          }
          if (data.instrument) {
            const parts = data.instrument.match(/(\d+)\s*h\s*(\d+)\s*m/);
            if (parts) {
              form.querySelector("#instrumentH").value = parts[1];
              form.querySelector("#instrumentM").value = parts[2];
            } else {
              form.querySelector("#instrumentH").value = "0";
              form.querySelector("#instrumentM").value = "0";
            }
          } else {
            form.querySelector("#instrumentH").value = "0";
            form.querySelector("#instrumentM").value = "0";
          }
          
          form.takeOffs.value = data.takeOffs || 1;
          form.landings.value = data.landings || 1;
          // Parse dayHours from stored "Xh Ym" format.
          if (data.dayHours) {
            const parts = data.dayHours.match(/(\d+)\s*h\s*(\d+)\s*m/);
            if (parts) {
              dayHoursH.value = parts[1];
              dayHoursM.value = parts[2];
            } else {
              dayHoursH.value = "0";
              dayHoursM.value = "0";
            }
          } else {
            // Default: use total flight time.
            const totalMins = getFlightMinutes(form.departureTime.value, form.arrivalTime.value);
            dayHoursH.value = Math.floor(totalMins / 60);
            dayHoursM.value = totalMins % 60;
          }
          // Parse nightHours from stored "Xh Ym" format.
          if (data.nightHours) {
            const parts = data.nightHours.match(/(\d+)\s*h\s*(\d+)\s*m/);
            if (parts) {
              nightHoursH.value = parts[1];
              nightHoursM.value = parts[2];
            } else {
              nightHoursH.value = "0";
              nightHoursM.value = "0";
            }
          } else {
            nightHoursH.value = "0";
            nightHoursM.value = "0";
          }
          form.tacoFinish.value = data.tacoFinish || "";
          form.hobbsFinish.value = data.hobbsFinish || "";
        }
      }, { onlyOnce: true });
      
      if (!document.getElementById("delete-btn")) {
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete Entry";
        deleteButton.type = "button";
        deleteButton.id = "delete-btn";
        Object.assign(deleteButton.style, {
          backgroundColor: "#d9534f",
          color: "white",
          marginTop: "20px"
        });
        form.appendChild(deleteButton);
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
    }
    
    // Auto-calculate complementary day and night hours.
    function updateNightHours() {
      const totalMins = getFlightMinutes(form.departureTime.value, form.arrivalTime.value);
      const dayMins = parseInt(dayHoursH.value) * 60 + parseInt(dayHoursM.value);
      const nightMins = totalMins - dayMins;
      nightHoursH.value = Math.floor(nightMins / 60);
      nightHoursM.value = nightMins % 60;
    }
    
    function updateDayHours() {
      const totalMins = getFlightMinutes(form.departureTime.value, form.arrivalTime.value);
      const nightMins = parseInt(nightHoursH.value) * 60 + parseInt(nightHoursM.value);
      const dayMins = totalMins - nightMins;
      dayHoursH.value = Math.floor(dayMins / 60);
      dayHoursM.value = dayMins % 60;
    }
    
    dayHoursH.addEventListener("change", updateNightHours);
    dayHoursM.addEventListener("change", updateNightHours);
    nightHoursH.addEventListener("change", updateDayHours);
    nightHoursM.addEventListener("change", updateDayHours);
    
    // Auto-calculate flight time when departure and arrival times are entered.
    const departureTimeInput = form.querySelector('[name="departureTime"]');
    const arrivalTimeInput = form.querySelector('[name="arrivalTime"]');
    
    function updateFlightTime() {
      if (departureTimeInput.value && arrivalTimeInput.value) {
        const totalMins = getFlightMinutes(departureTimeInput.value, arrivalTimeInput.value);
        dayHoursH.value = Math.floor(totalMins / 60);
        dayHoursM.value = totalMins % 60;
        // Optionally, reset night hours if you want them to default to zero.
        nightHoursH.value = "0";
        nightHoursM.value = "0";
      }
    }
    
    departureTimeInput.addEventListener("change", updateFlightTime);
    arrivalTimeInput.addEventListener("change", updateFlightTime);
    
    // Setup autocomplete suggestions for aircraft, registration, departure point, arrival point, and name.
    setupAutocomplete();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const totalFlight = calculateFlightTime(form.departureTime.value, form.arrivalTime.value);
      const flightType = form.elements["flightType"].value;
      let single = "";
      let dual = "";
      if (flightType === "single") {
        single = totalFlight;
      } else if (flightType === "dual") {
        dual = totalFlight;
      }
      // Retrieve the engine type value.
      const engineType = form.elements["engineType"].value;
      
      // Combine separate day hours inputs into a formatted string.
      const dayHoursFormatted = `${dayHoursH.value}h ${dayHoursM.value}m`;
      const nightHoursFormatted = `${nightHoursH.value}h ${nightHoursM.value}m`;
      const instrumentFormatted = `${form.querySelector("#instrumentH").value}h ${form.querySelector("#instrumentM").value}m`;

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
        flightType: flightType,
        single: single,
        dual: dual,
        engineType: engineType,
        instrument: instrumentFormatted,
        takeOffs: form.takeOffs.value,
        landings: form.landings.value,
        dayHours: dayHoursFormatted,
        nightHours: nightHoursFormatted,
        tacoFinish: form.tacoFinish.value,
        hobbsFinish: form.hobbsFinish.value,
        userId: auth.currentUser ? auth.currentUser.uid : null
      };
      
      try {
        if (id && id !== "new") {
          const entryRef = ref(db, "logbook/" + id);
          await update(entryRef, entryData);
        } else {
          const newEntryRef = push(ref(db, "logbook"));
          await set(newEntryRef, entryData);
        }
        window.location.href = "index.html";
      } catch (error) {
        console.error("Error saving entry: ", error);
        alert("Failed to save entry. Please try again.");
      }
    });
  }
  
  // Function to set up autocomplete using previous log entries.
  function setupAutocomplete() {
    const form = document.getElementById("log-entry-form");
    if (!form) return;
    
    const logbookRef = ref(db, "logbook");
    get(logbookRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const entries = snapshot.val();
          const aircraftSet = new Set();
          const registrationSet = new Set();
          const departureSet = new Set();
          const arrivalSet = new Set();
          const nameSet = new Set();
          
          for (const key in entries) {
            const entry = entries[key];
            if (entry.aircraft) aircraftSet.add(entry.aircraft);
            if (entry.registration) registrationSet.add(entry.registration);
            if (entry.departurePoint) departureSet.add(entry.departurePoint);
            if (entry.arrivalPoint) arrivalSet.add(entry.arrivalPoint);
            if (entry.name) nameSet.add(entry.name);
          }
          
          // Update or create datalists for each field.
          updateDatalist("aircraft", "aircraft-datalist", aircraftSet);
          updateDatalist("registration", "registration-datalist", registrationSet);
          updateDatalist("departurePoint", "departure-datalist", departureSet);
          updateDatalist("arrivalPoint", "arrival-datalist", arrivalSet);
          updateDatalist("name", "name-datalist", nameSet);
        }
      })
      .catch((error) => {
        console.error("Error fetching logbook data for autocomplete:", error);
      });
  }
  
  // Helper function to create or update a datalist for a given input field.
  function updateDatalist(fieldName, datalistId, dataSet) {
    const inputField = document.querySelector(`input[name="${fieldName}"]`);
    if (!inputField) return;
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      // Attach the datalist to the input field.
      inputField.setAttribute("list", datalistId);
      // Append the datalist to the input field's parent element.
      inputField.parentElement.appendChild(datalist);
    }
    // Clear any existing options.
    datalist.innerHTML = "";
    // Populate the datalist with new options.
    dataSet.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      datalist.appendChild(option);
    });
  }
});
