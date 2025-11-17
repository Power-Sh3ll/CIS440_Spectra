// /public/js/footprint-dashboard.js
// Carbon tracker for dashboard (date-aware + synced with leaderboard + /api/carbon/save)

document.addEventListener("DOMContentLoaded", () => {
  const token =
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) return; // dashboard.js already redirects if no token

  // ---- DOM refs ----
  const form        = document.getElementById("fp-form");
  const walkInput   = document.getElementById("fp-walk");
  const runInput    = document.getElementById("fp-run");
  const cycleInput  = document.getElementById("fp-cycle");
  const hikeInput   = document.getElementById("fp-hike");
  const swimInput   = document.getElementById("fp-swim");
  const msgEl       = document.getElementById("fp-msg");

  const totalCO2El      = document.getElementById("totalCO2");
  const totalDistanceEl = document.getElementById("totalDistance");

  const walkKmEl  = document.getElementById("walkKm");
  const walkKgEl  = document.getElementById("walkKg");
  const runKmEl   = document.getElementById("runKm");
  const runKgEl   = document.getElementById("runKg");
  const cycleKmEl = document.getElementById("cycleKm");
  const cycleKgEl = document.getElementById("cycleKg");
  const hikeKmEl  = document.getElementById("hikeKm");
  const hikeKgEl  = document.getElementById("hikeKg");
  const swimKmEl  = document.getElementById("swimKm");
  const swimKgEl  = document.getElementById("swimKg");

  // ---- Local state ----
  let currentDate = null; // YYYY-MM-DD

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  // ---- Utilities ----
  function setMsg(text, ok = true) {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color = ok ? "#0b6e4f" : "#621708";
  }

  function clearInputs() {
    if (walkInput)  walkInput.value  = "";
    if (runInput)   runInput.value   = "";
    if (cycleInput) cycleInput.value = "";
    if (hikeInput)  hikeInput.value  = "";
    if (swimInput)  swimInput.value  = "";
  }

  function renderSummary(r) {
    const totalCO2 = Number(r?.total_co2 || 0);
    const totalKm  = Number(r?.total_km  || 0);

    if (totalCO2El)      totalCO2El.textContent      = totalCO2.toFixed(3);
    if (totalDistanceEl) totalDistanceEl.textContent = totalKm.toFixed(2);

    if (walkKmEl)  walkKmEl.textContent  = `${Number(r?.walk_km  || 0).toFixed(2)} km`;
    if (walkKgEl)  walkKgEl.textContent  = `${Number(r?.walk_kg  || 0).toFixed(3)} kg`;
    if (runKmEl)   runKmEl.textContent   = `${Number(r?.run_km   || 0).toFixed(2)} km`;
    if (runKgEl)   runKgEl.textContent   = `${Number(r?.run_kg   || 0).toFixed(3)} kg`;
    if (cycleKmEl) cycleKmEl.textContent = `${Number(r?.cycle_km || 0).toFixed(2)} km`;
    if (cycleKgEl) cycleKgEl.textContent = `${Number(r?.cycle_kg || 0).toFixed(3)} kg`;
    if (hikeKmEl)  hikeKmEl.textContent  = `${Number(r?.hike_km  || 0).toFixed(2)} km`;
    if (hikeKgEl)  hikeKgEl.textContent  = `${Number(r?.hike_kg  || 0).toFixed(3)} kg`;
    if (swimKmEl)  swimKmEl.textContent  = `${Number(r?.swim_km  || 0).toFixed(2)} km`;
    if (swimKgEl)  swimKgEl.textContent  = `${Number(r?.swim_kg  || 0).toFixed(3)} kg`;
  }

  function resetSummaryForDay() {
    renderSummary({
      total_co2: 0,
      total_km: 0,
      walk_km: 0,
      walk_kg: 0,
      run_km: 0,
      run_kg: 0,
      cycle_km: 0,
      cycle_kg: 0,
      hike_km: 0,
      hike_kg: 0,
      swim_km: 0,
      swim_kg: 0,
    });
  }

  // ---- API: save only (server has POST /api/carbon/save) ----
  const CARBON_SAVE_URL = "/api/carbon/save";

  async function saveCarbonForCurrentDay() {
    if (!currentDate) currentDate = todayISO();

    const toNum = (el) => Number(el?.value || 0);

    // hours entered by user
    const walkHours   = toNum(walkInput);
    const runHours    = toNum(runInput);
    const cycleHours  = toNum(cycleInput);
    const hikeHours   = toNum(hikeInput);
    const swimHours   = toNum(swimInput);

    // Simple assumptions for km/h (you can tweak to match whatever you used before)
    const SPEEDS = {
      walk: 5,   // km per hour
      run: 9,
      cycle: 16,
      hike: 4,
      swim: 3,
    };

    const CO2_PER_KM = 0.16; // kg CO₂e per km vs a car, for example

    const walkKm  = walkHours  * SPEEDS.walk;
    const runKm   = runHours   * SPEEDS.run;
    const cycleKm = cycleHours * SPEEDS.cycle;
    const hikeKm  = hikeHours  * SPEEDS.hike;
    const swimKm  = swimHours  * SPEEDS.swim;

    const walkKg  = walkKm  * CO2_PER_KM;
    const runKg   = runKm   * CO2_PER_KM;
    const cycleKg = cycleKm * CO2_PER_KM;
    const hikeKg  = hikeKm  * CO2_PER_KM;
    const swimKg  = swimKm  * CO2_PER_KM;

    const totalKm  = walkKm + runKm + cycleKm + hikeKm + swimKm;
    const totalCO2 = walkKg + runKg + cycleKg + hikeKg + swimKg;

    const payload = {
      day: currentDate,      // *** matches server.js change ***
      walk:  walkHours,
      run:   runHours,
      cycle: cycleHours,
      hike:  hikeHours,
      swim:  swimHours,
      totKm: totalKm,
      totCO2: totalCO2,
    };

    try {
      const resp = await fetch(CARBON_SAVE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Save failed (${resp.status})`);

      // We don't rely on the server returning totals; we already calculated them.
      renderSummary({
        total_co2: totalCO2,
        total_km: totalKm,
        walk_km: walkKm,
        walk_kg: walkKg,
        run_km: runKm,
        run_kg: runKg,
        cycle_km: cycleKm,
        cycle_kg: cycleKg,
        hike_km: hikeKm,
        hike_kg: hikeKg,
        swim_km: swimKm,
        swim_kg: swimKg,
      });

      setMsg("Saved for this day ✔", true);
    } catch (err) {
      console.error("saveCarbonForCurrentDay error", err);
      setMsg(err.message || "Save failed", false);
    }
  }

  // ---- Listen to dashboard date changes ----
  document.addEventListener("spectra:dateChange", (e) => {
    const day = e.detail?.date || todayISO();
    currentDate = day;
    clearInputs();
    resetSummaryForDay();
    setMsg(""); // clear status
  });

  // Initial state (today)
  if (!currentDate) {
    currentDate = todayISO();
    clearInputs();
    resetSummaryForDay();
  }

  // ---- Form submit ----
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveCarbonForCurrentDay();
  });
});
