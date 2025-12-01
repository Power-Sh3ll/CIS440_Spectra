// /public/js/footprint.js
(function () {
  // ---------- Tunables ----------
  const STEP_KM_PER_STEP = 0.0008333333; // 24 steps ≈ 0.02 km
  const SPEEDS = { walk: 5.0, run: 9.6, cycle: 16.0, hike: 4.0, swim: 2.0 };
  const CO2_PER_KM = 0.16;

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const n = (v) => (isNaN(v) || v === "" ? 0 : Number(v));
  const fmtKm = (x) => `${x.toFixed(2)} km`;
  const fmtKg = (x) => `${x.toFixed(3)} kg`;

  // Read token (localStorage first, fallback sessionStorage)
  function getToken() {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      null
    );
  }

  async function saveToServer(payload) {
  const token =
    localStorage.getItem("jwtToken") ||  // what logon.js writes
    localStorage.getItem("token") || ""; // fallback

  const resp = await fetch("/api/footprint/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,          // your server reads req.headers["authorization"]
      // If you ever switch to Bearer scheme, use: "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    let msg = "Failed to save activity";
    try { msg = (await resp.json()).message || msg; } catch {}
    throw new Error(msg);
  }
}


  function calc() {
    const steps = n($("fp-steps")?.value);
    const walkH = n($("fp-walk")?.value);
    const runH  = n($("fp-run")?.value);
    const cycH  = n($("fp-cycle")?.value);
    const hikeH = n($("fp-hike")?.value);
    const swimH = n($("fp-swim")?.value);

    const kmSteps = steps * STEP_KM_PER_STEP;
    const kmWalk  = walkH * SPEEDS.walk;
    const kmRun   = runH  * SPEEDS.run;
    const kmCycle = cycH  * SPEEDS.cycle;
    const kmHike  = hikeH * SPEEDS.hike;
    const kmSwim  = swimH * SPEEDS.swim;

    const totKm = kmSteps + kmWalk + kmRun + kmCycle + kmHike + kmSwim;

    const kgSteps = kmSteps * CO2_PER_KM;
    const kgWalk  = kmWalk  * CO2_PER_KM;
    const kgRun   = kmRun   * CO2_PER_KM;
    const kgCycle = kmCycle * CO2_PER_KM;
    const kgHike  = kmHike  * CO2_PER_KM;
    const kgSwim  = kmSwim  * CO2_PER_KM;

    const totKg = kgSteps + kgWalk + kgRun + kgCycle + kgHike + kgSwim;

    // Per-activity rows
    $("stepsKm").textContent = fmtKm(kmSteps);
    $("stepsKg").textContent = fmtKg(kgSteps);

    $("walkKm").textContent  = fmtKm(kmWalk);
    $("walkKg").textContent  = fmtKg(kgWalk);

    $("runKm").textContent   = fmtKm(kmRun);
    $("runKg").textContent   = fmtKg(kgRun);

    $("cycleKm").textContent = fmtKm(kmCycle);
    $("cycleKg").textContent = fmtKg(kgCycle);

    $("hikeKm").textContent  = fmtKm(kmHike);
    $("hikeKg").textContent  = fmtKg(kgHike);

    $("swimKm").textContent  = fmtKm(kmSwim);
    $("swimKg").textContent  = fmtKg(kgSwim);

    // Totals
    $("totalDistance").textContent = fmtKm(totKm);
    $("totalCO2").textContent      = fmtKg(totKg);

    return { steps, walk: walkH, run: runH, cycle: cycH, hike: hikeH, swim: swimH };
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const form = $("fp-form");
    const msg  = $("fp-msg");
    if (!form) return;

    const token = getToken();

    // If there is no token, disable the form & inform the user
    if (!token) {
      if (msg) {
        msg.textContent = "Access denied. No token provided. Please log in again.";
        msg.style.color = "#b91c1c";
      }
      // disable inputs to avoid confusion
      Array.from(form.querySelectorAll("input, button")).forEach(el => el.disabled = true);
      // Optional: redirect to logon page
      // window.location.href = "/logon.html";
      return;
    }

    // Optional: preload previously saved values
    try {
      const pre = await fetch("/api/footprint", { headers: { Authorization: token }});
      if (pre.ok) {
        const data = await pre.json();
        if (data) {
          if (data.steps != null) $("fp-steps").value = data.steps;
          if (data.walk  != null) $("fp-walk").value  = data.walk;
          if (data.run   != null) $("fp-run").value   = data.run;
          if (data.cycle != null) $("fp-cycle").value = data.cycle;
          if (data.hike  != null) $("fp-hike").value  = data.hike;
          if (data.swim  != null) $("fp-swim").value  = data.swim;
        }
      }
    } catch { /* ignore preload errors */ }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = calc();

      // Persist locally (optional)
      try { localStorage.setItem("fp-values", JSON.stringify(payload)); } catch {}

      if (msg) { msg.textContent = "Saving…"; msg.style.color = "#5f718d"; }
      try {
        await saveToServer(payload, token);
        if (msg) { msg.textContent = "Saved and recalculated."; msg.style.color = "#0b6e4f"; }
      } catch (err) {
        if (msg) { msg.textContent = err.message || "Unable to save."; msg.style.color = "#b91c1c"; }
      }
    });

    // Also restore last local draft, if any
    try {
      const saved = JSON.parse(localStorage.getItem("fp-values") || "{}");
      if (saved) {
        if ("steps" in saved) $("fp-steps").value = saved.steps;
        if ("walk"  in saved) $("fp-walk").value  = saved.walk;
        if ("run"   in saved) $("fp-run").value   = saved.run;
        if ("cycle" in saved) $("fp-cycle").value = saved.cycle;
        if ("hike"  in saved) $("fp-hike").value  = saved.hike;
        if ("swim"  in saved) $("fp-swim").value  = saved.swim;
      }
    } catch {}

    // Navigation event handlers
    $("dashboardBtn")?.addEventListener("click", () => {
      window.location.href = "/dashboard";
    });

    $("friendsBtn")?.addEventListener("click", () => {
      window.location.href = "/friends";
    });

    $("leaderboardBtn")?.addEventListener("click", () => {
      window.location.href = "/leaderboard";
    });

    $("badgesBtn")?.addEventListener("click", () => {
      window.location.href = "/badges";
    });

    // Logout handler
    $("logoutButton")?.addEventListener("click", () => {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.href = "/logon";
    });
  });
})();
