// badges.js – fetch and render user badges

(function() {
  const token =
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  const earnedListEl = document.getElementById("earned-list");
  const lockedListEl = document.getElementById("locked-list");
  const earnedCountEl = document.getElementById("earned-count");
  const totalCountEl  = document.getElementById("total-count");
  const earnedEmptyEl = document.getElementById("earned-empty");
  const lockedEmptyEl = document.getElementById("locked-empty");

  document.getElementById("back-to-profile").addEventListener("click", () => {
    window.location.href = "/profile";
  });

  function createBadgeCard(badge, locked = false) {
    const card = document.createElement("div");
    card.className = "badge-card" + (locked ? " locked" : "");

    const header = document.createElement("div");
    header.className = "badge-header";

    const icon = document.createElement("div");
    icon.className = "badge-icon";
    // quick visual shorthand from category
    const letter = (badge.category || "?").charAt(0).toUpperCase();
    icon.textContent = letter;

    const textWrap = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.className = "badge-name";
    nameEl.textContent = badge.name;

    const catEl = document.createElement("div");
    catEl.className = "badge-category";
    catEl.textContent = badge.category || "misc";

    textWrap.appendChild(nameEl);
    textWrap.appendChild(catEl);

    header.appendChild(icon);
    header.appendChild(textWrap);

    const descEl = document.createElement("div");
    descEl.className = "badge-desc";
    descEl.textContent = badge.description || "";

    card.appendChild(header);
    card.appendChild(descEl);

    if (!locked && badge.earnedAt) {
      const earnedAtEl = document.createElement("div");
      earnedAtEl.className = "badge-earned-at";
      const date = new Date(badge.earnedAt);
      earnedAtEl.textContent = `Earned on ${date.toLocaleDateString()}`;
      card.appendChild(earnedAtEl);
    }

    return card;
  }

  async function loadBadges() {
    try {
      const res = await fetch("/api/user/badges", {
        headers: {
          "Authorization": token,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error("Failed to load badges");
      }

      const data = await res.json();
      const earned = data.earned || [];
      const locked = data.locked || [];
      const total  = earned.length + locked.length;

      earnedCountEl.textContent = earned.length;
      totalCountEl.textContent  = total;

      // clear
      earnedListEl.innerHTML = "";
      lockedListEl.innerHTML = "";

      if (earned.length === 0) {
        earnedEmptyEl.style.display = "block";
      } else {
        earnedEmptyEl.style.display = "none";
        earned.forEach(b => earnedListEl.appendChild(createBadgeCard(b, false)));
      }

      if (locked.length === 0) {
        lockedEmptyEl.style.display = "block";
      } else {
        lockedEmptyEl.style.display = "none";
        locked.forEach(b => lockedListEl.appendChild(createBadgeCard(b, true)));
      }
    } catch (err) {
      console.error(err);
      earnedEmptyEl.textContent = "Error loading badges.";
      lockedEmptyEl.textContent = "";
    }
  }

  loadBadges();
})();
