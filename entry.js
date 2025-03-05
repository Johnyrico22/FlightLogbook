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
import { aerodromeList } from "./aerodromes.js";

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

  // Helper function to create or update a datalist.
  function populateDatalist(datalistId, options) {
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      // Find the corresponding input field by matching the list attribute.
      const input = document.querySelector(`input[list="${datalistId}"]`);
      if (input) {
        input.parentElement.appendChild(datalist);
      } else {
        document.body.appendChild(datalist);
      }
    }
    datalist.innerHTML = "";
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      datalist.appendChild(option);
    });
  }

  // Helper: Convert a formatted duration string ("Xh Ym") to minutes.
  function parseDurationToMinutes(durationStr) {
    const match = durationStr.match(/(\d+)\s*h\s*(\d+)\s*m/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
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
    const form = document.getElementById("log-entry-form");
    if (!form) return;

    // Set up the static datalists for departure and arrival from aerodromeList.
    // (Assumes the inputs have list="departure-datalist" and list="arrival-datalist".)
    populateDatalist("departure-datalist", aerodromeList);
    populateDatalist("arrival-datalist", aerodromeList);

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    let mode = (id && id !== "new") ? "view" : "edit";

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
            const totalMins = getFlightMinutes(form.departureTime.value, form.arrivalTime.value);
            dayHoursH.value = Math.floor(totalMins / 60);
            dayHoursM.value = totalMins % 60;
          }
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
          form.notes.value = data.notes || "";

          if (mode === "view") {
            setViewMode();
          }
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
              await remove(ref(db, "logbook/" + id));
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

    function setViewMode() {
      const elements = form.querySelectorAll("input, select, textarea");
      elements.forEach(el => { el.disabled = true; });
      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) { submitBtn.style.display = "none"; }
      if (!document.getElementById("edit-btn")) {
        const editButton = document.createElement("button");
        editButton.id = "edit-btn";
        editButton.type = "button";
        editButton.textContent = "Edit Entry";
        const deleteBtn = document.getElementById("delete-btn");
        if (deleteBtn) {
          deleteBtn.parentElement.insertBefore(editButton, deleteBtn);
        } else {
          form.appendChild(editButton);
        }
        editButton.addEventListener("click", () => {
          elements.forEach(el => { el.disabled = false; });
          if (submitBtn) { submitBtn.style.display = "block"; }
          editButton.remove();
        });
      }
    }

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

    const departureTimeInput = form.querySelector('[name="departureTime"]');
    const arrivalTimeInput = form.querySelector('[name="arrivalTime"]');

    function updateFlightTime() {
      if (departureTimeInput.value && arrivalTimeInput.value) {
        const totalMins = getFlightMinutes(departureTimeInput.value, arrivalTimeInput.value);
        dayHoursH.value = Math.floor(totalMins / 60);
        dayHoursM.value = totalMins % 60;
        nightHoursH.value = "0";
        nightHoursM.value = "0";
      }
    }

    departureTimeInput.addEventListener("change", updateFlightTime);
    arrivalTimeInput.addEventListener("change", updateFlightTime);

    // Setup autocomplete for departure and arrival using the static aerodromeList.
    setupAutocomplete();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const totalFlight = calculateFlightTime(form.departureTime.value, form.arrivalTime.value);
      const flightType = form.elements["flightType"].value;
      let single = "";
      let dual = "";
      if (flightType === "single") { single = totalFlight; }
      else if (flightType === "dual") { dual = totalFlight; }
      const engineType = form.elements["engineType"].value;
      const dayHoursFormatted = `${dayHoursH.value}h ${dayHoursM.value}m`;
      const nightHoursFormatted = `${nightHoursH.value}h ${nightHoursM.value}m`;
      const instrumentFormatted = `${form.querySelector("#instrumentH").value}h ${form.querySelector("#instrumentM").value}m`;

      // Sanitize text fields using DOMPurify.
      const sanitizedAircraft = DOMPurify.sanitize(form.aircraft.value);
      const sanitizedRegistration = DOMPurify.sanitize(form.registration.value);
      const sanitizedName = DOMPurify.sanitize(form.name.value);
      const sanitizedDesignation = DOMPurify.sanitize(form.designation.value);
      const sanitizedDeparturePoint = DOMPurify.sanitize(form.departurePoint.value);
      const sanitizedArrivalPoint = DOMPurify.sanitize(form.arrivalPoint.value);
      const sanitizedFlightType = DOMPurify.sanitize(flightType);
      const sanitizedEngineType = DOMPurify.sanitize(engineType);
      const sanitizedTacoFinish = DOMPurify.sanitize(form.tacoFinish.value);
      const sanitizedHobbsFinish = DOMPurify.sanitize(form.hobbsFinish.value);
      const sanitizedNotes = DOMPurify.sanitize(form.notes.value);

      const entryData = {
        date: form.date.value,
        aircraft: sanitizedAircraft,
        registration: sanitizedRegistration,
        name: sanitizedName,
        designation: sanitizedDesignation,
        departurePoint: sanitizedDeparturePoint,
        departureTime: form.departureTime.value,
        arrivalPoint: sanitizedArrivalPoint,
        arrivalTime: form.arrivalTime.value,
        flightType: sanitizedFlightType,
        single: single,
        dual: dual,
        engineType: sanitizedEngineType,
        instrument: DOMPurify.sanitize(instrumentFormatted),
        takeOffs: form.takeOffs.value,
        landings: form.landings.value,
        dayHours: dayHoursFormatted,
        nightHours: nightHoursFormatted,
        tacoFinish: sanitizedTacoFinish,
        hobbsFinish: sanitizedHobbsFinish,
        notes: sanitizedNotes,
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

  // Setup autocomplete for departure and arrival fields using the static aerodrome list.
  function setupAutocomplete() {
    const form = document.getElementById("log-entry-form");
    if (!form) return;

    populateDatalist("departure-datalist", aerodromeList);
    populateDatalist("arrival-datalist", aerodromeList);
  }

  function updateDatalist(fieldName, datalistId, dataSet) {
    const inputField = document.querySelector(`input[name="${fieldName}"]`);
    if (!inputField) return;
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      inputField.setAttribute("list", datalistId);
      inputField.parentElement.appendChild(datalist);
    }
    datalist.innerHTML = "";
    dataSet.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      datalist.appendChild(option);
    });
  }
});
