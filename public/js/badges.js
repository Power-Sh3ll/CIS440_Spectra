// badges.js – fetch and render user badges with PNG icons

(function () {
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
  const totalCountEl = document.getElementById("total-count");
  const earnedEmptyEl = document.getElementById("earned-empty");
  const lockedEmptyEl = document.getElementById("locked-empty");

  document.getElementById("back-to-profile").addEventListener("click", () => {
    window.location.href = "/profile";
  });

  // ---- ICON MAPPING ----
  // Files live in: public/assets/badges
  // Served path (Express static): /assets/badges/...
  const BADGE_BASE_PATH = "/assets/badges";

  // Map your badge keys/slugs/names (normalized) to filenames.
  // Adjust the keys here to match what your API actually returns.
  const BADGE_IMAGE_MAP = {
  // Steps
  "STEP_5K": "badge-steps-5k.png",
  "STEP_10K": "badge-steps-10k.png",
  "STEP_20K": "badge-steps-20k.png",

  // CO2 saved
  "CO2_1KG": "badge-co2-1kg.png",
  "CO2_25KG": "badge-co2-25kg.png",
  "CO2_50KG": "badge-co2-50kg.png",

  // Friends
  "FRIEND_1": "badge-friends-1.png",
  "FRIEND_10": "badge-friends-10.png",
  "FRIEND_20": "badge-friends-20.png",

  // Streaks
  "STREAK_STEPS_7": "badge-streak-7day-steps.png",
  "STREAK_ACTIVE_7": "badge-streak-7day-minutes.png",

  // Calories
  "CAL_500": "badge-calories-500.png",
  "CAL_1000": "badge-calories-1000.png",

  // Leaderboard
  "LEADER_1": "badge-leaderboard-1.png",

  // Active minutes
  "MINUTES_150": "badge-active-minutes-150.png"
};


  // Try to derive a key from whatever the backend sends.
  function getBadgeKey(badge) {
  return badge.code ? badge.code.toUpperCase().trim() : "";
}

  function getBadgeImageSrc(badge) {
    const key = getBadgeKey(badge);
    const filename = BADGE_IMAGE_MAP[key];

    if (!filename) {
      console.warn("No image mapped for badge key:", key, badge);
      return null;
    }

    return `${BADGE_BASE_PATH}/${filename}`;
  }

  function createBadgeCard(badge, locked = false) {
    const card = document.createElement("div");
    card.className = "badge-card" + (locked ? " locked" : "");

    const header = document.createElement("div");
    header.className = "badge-header";

    // icon wrapper
    const iconWrap = document.createElement("div");
    iconWrap.className = "badge-icon";

    const imgSrc = getBadgeImageSrc(badge);
    if (imgSrc) {
      const img = document.createElement("img");
      img.src = imgSrc;
      img.alt = badge.name || "badge icon";
      iconWrap.appendChild(img);
    } else {
      // Fallback: simple letter circle if mapping is missing
      iconWrap.classList.add("badge-icon-fallback");
      const letter = (badge.category || badge.name || "?")
        .charAt(0)
        .toUpperCase();
      iconWrap.textContent = letter;
    }

    const textWrap = document.createElement("div");
    textWrap.className = "badge-text";

    const nameEl = document.createElement("div");
    nameEl.className = "badge-name";
    nameEl.textContent = badge.name;

    const catEl = document.createElement("div");
    catEl.className = "badge-category";
    catEl.textContent = badge.category || "misc";

    textWrap.appendChild(nameEl);
    textWrap.appendChild(catEl);

    header.appendChild(iconWrap);
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
          Authorization: token,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error("Failed to load badges");
      }

      const data = await res.json();
      const earned = data.earned || [];
      const locked = data.locked || [];
      const total = earned.length + locked.length;

      earnedCountEl.textContent = earned.length;
      totalCountEl.textContent = total;

      // clear
      earnedListEl.innerHTML = "";
      lockedListEl.innerHTML = "";

      if (earned.length === 0) {
        earnedEmptyEl.style.display = "block";
      } else {
        earnedEmptyEl.style.display = "none";
        earned.forEach((b) => earnedListEl.appendChild(createBadgeCard(b, false)));
      }

      if (locked.length === 0) {
        lockedEmptyEl.style.display = "block";
      } else {
        lockedEmptyEl.style.display = "none";
        locked.forEach((b) => lockedListEl.appendChild(createBadgeCard(b, true)));
      }
    } catch (err) {
      console.error(err);
      earnedEmptyEl.textContent = "Error loading badges.";
      lockedEmptyEl.textContent = "";
    }
  }

  loadBadges();
})();
