  import { db } from "./firebase.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
  import { ref, query, orderByChild, equalTo, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

  document.getElementById("export-btn").addEventListener("click", async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be signed in to export data.");
      return;
    }

    // Query logbook entries for the current user.
    const logbookRef = ref(db, "logbook");
    const q = query(logbookRef, orderByChild("userId"), equalTo(user.uid));

    onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        alert("No data found.");
        return;
      }
      
      // Convert the Firebase object into an array of entries.
      let entries = [];
      for (const id in data) {
        entries.push(data[id]);
      }
      
      // Define the CSV headers in the same order as the importer expects.
      const headers = [
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
        "engineType",
        "instrument",
        "takeOffs",
        "landings",
        "dayHours",
        "nightHours",
        "tacoFinish",
        "hobbsFinish"
      ];
      
      // Build CSV rows.
      const csvRows = [];
      csvRows.push(headers.join(",")); // header row
      
      entries.forEach(entry => {
        const row = headers.map(header => {
          let val = entry[header] || "";
          // Escape any double quotes in the value.
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        });
        csvRows.push(row.join(","));
      });
      
      const csvData = csvRows.join("\n");
      
      // Create a Blob and trigger download.
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "logbook_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    }, { onlyOnce: true });
  });
