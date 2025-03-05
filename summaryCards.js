// summaryCards.js
import { minutesToTime, getFlightMinutes } from "./firebase.js";
const dayjs = window.dayjs; // using global dayjs loaded via CDN

/**
 * Creates HTML for a summary card.
 * @param {string} label - The label to display.
 * @param {string|number} value - The calculated value to display.
 * @param {string} headerTag - The HTML tag to wrap the value (default: "h3")
 * @returns {string} HTML string for the card.
 */
export function createSummaryCard(label, value, headerTag = "h3") {
  return `
    <div class="summary-card">
      <p>${label}</p>
      <${headerTag}>${value}</${headerTag}>
    </div>
  `;
}

/**
 * Renders summary stats into the provided container.
 * For desktop view:
 *   - If the container's id is "reporting-container", extra stats are always included.
 *   - Otherwise, only the basic (overall flight, solo, dual) stats are shown.
 * For mobile view, a simplified summary is shown.
 * @param {Array} entries - Array of logbook entries.
 * @param {HTMLElement} container - The DOM element where the summary will be rendered.
 * @param {string} viewMode - "desktop" or "mobile"
 * @param {boolean} splitSections - If true, split overall and last 12-month stats into separate sections.
 */
export function updateSummaryCards(entries, container, viewMode, splitSections = false) {
  let totalMinutes = 0;
  let soloMinutes = 0;
  let dualMinutes = 0;
  let totalMinutesLast12 = 0;
  let soloMinutesLast12 = 0;
  let dualMinutesLast12 = 0;
  
  // Engine stats accumulators.
  let totalSingleEngine = 0;
  let totalMultiEngine = 0;
  let totalSingleEngineLast12 = 0;
  let totalMultiEngineLast12 = 0;
  
  // Additional stats: takeoffs, landings, instrument hours.
  let totalTakeOffs = 0;
  let totalLandings = 0;
  let totalInstrumentMinutes = 0;
  let totalTakeOffsLast12 = 0;
  let totalLandingsLast12 = 0;
  let totalInstrumentMinutesLast12 = 0;
  
  // Extra stats: total flights and top aerodromes.
  const totalFlights = entries.length;
  const aerodromeCounts = {};
  
  const oneYearAgo = dayjs().subtract(12, 'month');
  
  entries.forEach(entry => {
    const flightMins = getFlightMinutes(entry.departureTime, entry.arrivalTime);
    totalMinutes += flightMins;
    if (entry.flightType && entry.flightType.toLowerCase() === "solo") {
      soloMinutes += flightMins;
    } else if (entry.flightType && entry.flightType.toLowerCase() === "dual") {
      dualMinutes += flightMins;
    }
    
    const entryDate = dayjs(entry.date, "YYYY-MM-DD", true);
    if (entryDate.isAfter(oneYearAgo)) {
      totalMinutesLast12 += flightMins;
      if (entry.flightType && entry.flightType.toLowerCase() === "solo") {
        soloMinutesLast12 += flightMins;
      } else if (entry.flightType && entry.flightType.toLowerCase() === "dual") {
        dualMinutesLast12 += flightMins;
      }
    }
    
    // Engine stats (assumes entry.engineType is "singleEngine" or "multiEngine")
    if (entry.engineType) {
      const et = entry.engineType.toLowerCase();
      if (et === "singleengine") {
        totalSingleEngine += flightMins;
        if (entryDate.isAfter(oneYearAgo)) {
          totalSingleEngineLast12 += flightMins;
        }
      } else if (et === "multiengine") {
        totalMultiEngine += flightMins;
        if (entryDate.isAfter(oneYearAgo)) {
          totalMultiEngineLast12 += flightMins;
        }
      }
    }
    
    // Sum takeoffs and landings.
    totalTakeOffs += Number(entry.takeOffs) || 0;
    totalLandings += Number(entry.landings) || 0;
    if (entryDate.isAfter(oneYearAgo)) {
      totalTakeOffsLast12 += Number(entry.takeOffs) || 0;
      totalLandingsLast12 += Number(entry.landings) || 0;
    }
    
    // Sum instrument hours. Assume instrument is stored as "Xh Ym"
    const instrumentMatch = (entry.instrument || "").match(/(\d+)\s*h\s*(\d+)\s*m/);
    const instrumentMins = instrumentMatch ? parseInt(instrumentMatch[1], 10) * 60 + parseInt(instrumentMatch[2], 10) : 0;
    totalInstrumentMinutes += instrumentMins;
    if (entryDate.isAfter(oneYearAgo)) {
      totalInstrumentMinutesLast12 += instrumentMins;
    }
    
    // Count aerodromes (combine departurePoint and arrivalPoint).
    if (entry.departurePoint) {
      aerodromeCounts[entry.departurePoint] = (aerodromeCounts[entry.departurePoint] || 0) + 1;
    }
    if (entry.arrivalPoint) {
      aerodromeCounts[entry.arrivalPoint] = (aerodromeCounts[entry.arrivalPoint] || 0) + 1;
    }
  });
  
  const overallTotal = minutesToTime(totalMinutes);
  const overallSolo = minutesToTime(soloMinutes);
  const overallDual = minutesToTime(dualMinutes);
  const last12Total = minutesToTime(totalMinutesLast12);
  const last12Solo = minutesToTime(soloMinutesLast12);
  const last12Dual = minutesToTime(dualMinutesLast12);
  
  const overallSingleEngine = minutesToTime(totalSingleEngine);
  const overallMultiEngine = minutesToTime(totalMultiEngine);
  const last12SingleEngine = minutesToTime(totalSingleEngineLast12);
  const last12MultiEngine = minutesToTime(totalMultiEngineLast12);
  
  const overallInstrument = minutesToTime(totalInstrumentMinutes);
  const last12Instrument = minutesToTime(totalInstrumentMinutesLast12);
  
  const sortedAerodromes = Object.entries(aerodromeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([aero, count]) => `${aero} (${count})`)
    .join(", ");
  
  let html = "";
  if (viewMode === "desktop") {
    if (container.id === "reporting-container") {
      // For reporting page, split sections and include extra stats.
      html = `
        <div class="summary-section overall">
          <h3>Overall Totals</h3>
          <div class="summary-cards">
            ${createSummaryCard("Total Flight Time", overallTotal, "h4")}
            ${createSummaryCard("Total Solo Time", overallSolo, "h4")}
            ${createSummaryCard("Total Dual Time", overallDual, "h4")}
            ${createSummaryCard("Total Single Engine Time", overallSingleEngine, "h4")}
            ${createSummaryCard("Total Multi Engine Time", overallMultiEngine, "h4")}
            ${createSummaryCard("Total Take Offs", totalTakeOffs.toString(), "h4")}
            ${createSummaryCard("Total Landings", totalLandings.toString(), "h4")}
            ${createSummaryCard("Total Instrument Hours", overallInstrument, "h4")}
            ${createSummaryCard("Total Flights", totalFlights.toString(), "h4")}
            ${createSummaryCard("Top Aerodromes", sortedAerodromes, "h4")}
          </div>
        </div>
        <div class="summary-section last12">
          <h3>Last 12 Months</h3>
          <div class="summary-cards">
            ${createSummaryCard("Last 12 Months Flight Time", last12Total, "h4")}
            ${createSummaryCard("Last 12 Months Solo Time", last12Solo, "h4")}
            ${createSummaryCard("Last 12 Months Dual Time", last12Dual, "h4")}
            ${createSummaryCard("Last 12 Months Single Engine Time", last12SingleEngine, "h4")}
            ${createSummaryCard("Last 12 Months Multi Engine Time", last12MultiEngine, "h4")}
            ${createSummaryCard("Last 12 Months Take Offs", totalTakeOffsLast12.toString(), "h4")}
            ${createSummaryCard("Last 12 Months Landings", totalLandingsLast12.toString(), "h4")}
            ${createSummaryCard("Last 12 Months Instrument Hours", last12Instrument, "h4")}
          </div>
        </div>
      `;
      container.style.cursor = "default";
      container.onclick = null;
    } else {
      // For index page, show only basic stats.
      html = `
        <div class="summary-cards">
          ${createSummaryCard("Total Flight Time", overallTotal)}
          ${createSummaryCard("Total Solo Time", overallSolo)}
          ${createSummaryCard("Total Dual Time", overallDual)}
        </div>
      `;
      container.style.cursor = "default";
      container.onclick = null;
    }
  } else {
    // Mobile layout: simplified summary.
    html = `
      <div class="summary-cards">
        ${createSummaryCard("Total Flight Time", overallTotal)}
        ${createSummaryCard("Total Solo Time", overallSolo)}
        ${createSummaryCard("Total Dual Time", overallDual)}
    `;
    container.style.cursor = "pointer";
    container.onclick = () => {
      window.location.href = "reporting.html";
    };
  }
  
  container.innerHTML = html;
}
