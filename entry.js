// entry.js
import { db, calculateFlightTime, getFlightMinutes, timeToMinutes, minutesToTime } from "./firebase.js";
import {
  ref,
  onValue,
  update,
  remove,
  push,
  set
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  
  // Use an auth state listener to ensure we wait for authentication status.
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // User not signed in: Initiate sign-in popup.
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider)
        .then((result) => {
          console.log("Signed in as:", result.user.displayName);
          // Now that the user is signed in, set up the form.
          setupForm();
        })
        .catch((error) => {
          console.error("Sign in error:", error);
          alert("You must sign in to add or edit entries.");
        });
    } else {
      // User is signed in; proceed to set up the form.
      setupForm();
    }
  });
  
  function setupForm() {
    if (!document.getElementById("log-entry-form")) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const form = document.getElementById("log-entry-form");
    
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
          form.instrument.value = data.instrument || "";
          form.takeOffs.value = data.takeOffs || 1;
          form.landings.value = data.landings || 1;
          form.dayHours.value = data.dayHours || calculateFlightTime(form.departureTime.value, form.arrivalTime.value);
          form.nightHours.value = data.nightHours || "00:00";
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
    
    // Auto-calculate day and night hours.
    form.dayHours.addEventListener("change", () => {
      const totalMins = getFlightMinutes(form.departureTime.value, form.arrivalTime.value);
      const dayMins = timeToMinutes(form.dayHours.value);
      const nightMins = totalMins - dayMins;
      form.nightHours.value = minutesToTime(nightMins);
    });
    
    form.nightHours.addEventListener("change", () => {
      const totalMins = getFlightMinutes(form.departureTime.value, form.arrivalTime.value);
      const nightMins = timeToMinutes(form.nightHours.value);
      const dayMins = totalMins - nightMins;
      form.dayHours.value = minutesToTime(dayMins);
    });
    
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
        instrument: form.instrument.value,
        takeOffs: form.takeOffs.value,
        landings: form.landings.value,
        dayHours: form.dayHours.value,
        nightHours: form.nightHours.value,
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
});
