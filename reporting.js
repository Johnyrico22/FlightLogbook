import { updateSummaryCards } from "./summaryCards.js";
import { db, minutesToTime, getFlightMinutes } from "./firebase.js";
import { ref, query, orderByChild, equalTo, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      loadReportingData(user.uid);
    }
  });
  
  document.getElementById("back-btn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
  
  function loadReportingData(uid) {
    const logbookRef = ref(db, "logbook");
    const logbookQuery = query(logbookRef, orderByChild("userId"), equalTo(uid));
    onValue(logbookQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      let entries = [];
      for (let id in data) {
        entries.push(data[id]);
      }
      const reportingContainer = document.getElementById("reporting-container");
      updateSummaryCards(entries, document.getElementById("reporting-container"), "desktop", true );


    });
  }
});
