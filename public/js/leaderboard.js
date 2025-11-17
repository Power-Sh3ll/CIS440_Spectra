// public/js/leaderboard.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Auth / token ---
  const token =
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  // --- DOM refs ---
  const datePicker   = document.getElementById("datePicker");
  const dateDisplay  = document.getElementById("dateDisplay");
  const todayBtn     = document.getElementById("todayBtn");

  const lbList       = document.getElementById("leaderboard-list");
  const loadingLabel = document.getElementById("loading-label");
  const noDataEl     = document.getElementById("no-data");   // optional
  const toastEl      = document.getElementById("toast");     // optional

  const sortButtons  = Array.from(document.querySelectorAll(".sort-btn"));

  const dashboardBtn = document.getElementById("dashboardBtn");
  const profileBtn   = document.getElementById("profileBtn");
  const logoutBtn    = document.getElementById("logoutButton");

  // --- Nav buttons ---
  dashboardBtn?.addEventListener("click", () => (window.location.href = "/dashboard"));
  profileBtn  ?.addEventListener("click", () => (window.location.href = "/profile"));
  logoutBtn   ?.addEventListener("click", () => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/";
  });

  // --- Toast helper (safe if toastEl missing) ---
  function toast(msg, isErr = false) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("toast--show");
    if (isErr) toastEl.classList.add("toast--err");
    else toastEl.classList.remove("toast--err");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.classList.remove("toast--show");
    }, 2200);
  }

  // --- Date helpers + state ---
  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  let currentDate = todayISO();
  let currentSortKey = "total_co2";
  let rows = [];

  if (datePicker) datePicker.value = currentDate;
  if (dateDisplay) dateDisplay.textContent = "Today";

  todayBtn?.addEventListener("click", () => {
    currentDate = todayISO();
    if (datePicker) datePicker.value = currentDate;
    if (dateDisplay) dateDisplay.textContent = "Today";
    loadLeaderboard();
  });

  datePicker?.addEventListener("change", () => {
    if (!datePicker.value) return;
    currentDate = datePicker.value;
    if (dateDisplay) {
      dateDisplay.textContent =
        currentDate === todayISO() ? "Today" : currentDate;
    }
    loadLeaderboard();
  });

  // --- How each sort key should DISPLAY its metric ---
  const metricConfig = {
    total_co2: {
      label: "CO₂ saved",
      main: (r) => `${r.total_co2.toFixed(3)} kg CO₂e`,
      sub:  (r) => `${r.total_km.toFixed(2)} km human-powered distance`,
    },
    total_km: {
      label: "Distance",
      main: (r) => `${r.total_km.toFixed(2)} km`,
      sub:  (r) => `${r.total_co2.toFixed(3)} kg CO₂e saved`,
    },
    walk_hours: {
      label: "Walk (hrs)",
      main: (r) => `${r.walk_hours.toFixed(1)} h walking`,
      sub:  (r) =>
        `${r.total_co2.toFixed(3)} kg CO₂e · ${r.total_km.toFixed(2)} km`,
    },
    run_hours: {
      label: "Run (hrs)",
      main: (r) => `${r.run_hours.toFixed(1)} h running`,
      sub:  (r) =>
        `${r.total_co2.toFixed(3)} kg CO₂e · ${r.total_km.toFixed(2)} km`,
    },
    cycle_hours: {
      label: "Cycle (hrs)",
      main: (r) => `${r.cycle_hours.toFixed(1)} h cycling`,
      sub:  (r) =>
        `${r.total_co2.toFixed(3)} kg CO₂e · ${r.total_km.toFixed(2)} km`,
    },
    hike_hours: {
      label: "Hike (hrs)",
      main: (r) => `${r.hike_hours.toFixed(1)} h hiking`,
      sub:  (r) =>
        `${r.total_co2.toFixed(3)} kg CO₂e · ${r.total_km.toFixed(2)} km`,
    },
    swim_hours: {
      label: "Swim (hrs)",
      main: (r) => `${r.swim_hours.toFixed(1)} h swimming`,
      sub:  (r) =>
        `${r.total_co2.toFixed(3)} kg CO₂e · ${r.total_km.toFixed(2)} km`,
    },
  };

  // --- Sort buttons ---
  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sort;
      if (!key) return;
      currentSortKey = key;
      sortButtons.forEach((b) => b.classList.remove("sort-btn--active"));
      btn.classList.add("sort-btn--active");
      renderRows(); // just re-render with new metric text
    });
  });

  // --- Fetch leaderboard from server ---
  async function loadLeaderboard() {
    try {
      if (loadingLabel) loadingLabel.style.display = "block";
      if (lbList) lbList.innerHTML = "";
      noDataEl?.classList.add("hidden");

      const params = new URLSearchParams();
      if (currentDate) params.set("day", currentDate);

      const resp = await fetch(`/api/leaderboard?${params.toString()}`, {
        headers: { Authorization: token },
      });
      if (!resp.ok) {
        throw new Error(`Server error (${resp.status})`);
      }

      const data = await resp.json();

      rows = (data || []).map((r) => {
        const walk = Number(r.walk_hours || 0);
        const run  = Number(r.run_hours || 0);
        const cyc  = Number(r.cycle_hours || 0);
        const hike = Number(r.hiking_hours || 0);
        const swim = Number(r.swimming_hours || 0);
        return {
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          walk_hours: walk,
          run_hours: run,
          cycle_hours: cyc,
          hike_hours: hike,
          swim_hours: swim,
          total_km: Number(r.total_km || 0),
          total_co2: Number(r.total_co2 || 0),
        };
      });

      if (loadingLabel) loadingLabel.style.display = "none";

      if (!rows.length) {
        noDataEl?.classList.remove("hidden");
      } else {
        renderRows();
      }
    } catch (err) {
      console.error("loadLeaderboard error", err);
      if (loadingLabel) loadingLabel.style.display = "none";
      noDataEl?.classList.remove("hidden");
      toast(err.message || "Failed to load leaderboard", true);
    }
  }

  // --- Render rows with metric tied to currentSortKey ---
  function renderRows() {
  if (!lbList) return;
  lbList.innerHTML = "";

  if (!rows.length) {
    noDataEl?.classList.remove("hidden");
    return;
  }
  noDataEl?.classList.add("hidden");

  const cfg = metricConfig[currentSortKey] || metricConfig.total_co2;

  const sorted = [...rows].sort((a, b) => {
    const va = Number(a[currentSortKey] || 0);
    const vb = Number(b[currentSortKey] || 0);
    return vb - va;
  });

  sorted.forEach((r, idx) => {
    const li = document.createElement("li");
    li.className = "lb-row";

    const rank = idx + 1;
    if (rank === 1) li.classList.add("rank-1");
    else if (rank === 2) li.classList.add("rank-2");
    else if (rank === 3) li.classList.add("rank-3");

    const name =
      `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Anonymous";

    const metricMain  = cfg.main(r);
    const metricLabel = cfg.label;
    const metricSub   = cfg.sub(r);

    li.innerHTML = `
      <div class="lb-left">
        <div class="rank-big">${rank}</div>
        <div class="user-block">
          <div class="user-name">${name}</div>
          <div class="metric-main">${metricMain}</div>
          <div class="metric-sub">${metricLabel} · ${metricSub}</div>
        </div>
      </div>
    `;

    lbList.appendChild(li);
  });
}




  // initial load
  loadLeaderboard();
});
