// /public/js/dashboard.js
// DASHBOARD CONTROLLER (tabs + toasts + saves + date-aware activity)

document.addEventListener('DOMContentLoaded', () => {
  // --------- Elements ---------
  const activityTab = document.getElementById('activityTab');
  const carbonTab   = document.getElementById('carbonTab');
  const fitnessView = document.getElementById('fitnessView');
  const carbonView  = document.getElementById('carbonView');

  const refreshBtn  = document.getElementById('refreshButton');
  const logoutBtn   = document.getElementById('logoutButton');

  const editValuesBtn = document.getElementById('edit-values-btn');
  const editGoalsBtn  = document.getElementById('edit-goals-btn');

  const modalValues = document.getElementById('modal-values');
  const modalGoals  = document.getElementById('modal-goals');

  const formValues = document.getElementById('form-values');
  const formGoals  = document.getElementById('form-goals');

  const todayDateEl = document.getElementById('todayDate');

  // date controls (header calendar)
  const dashDatePicker = document.getElementById('dashDatePicker');
  const dashTodayBtn   = document.getElementById('dashTodayBtn');
  const dashDateLabel  = document.getElementById('dashDateLabel');

  // --------- Auth check ---------
  const token =
    localStorage.getItem('jwtToken') || localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return;
  }

  // --------- Toast (auto-inject if missing) ---------
  let toastEl = document.getElementById('toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.style.cssText = `
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      background:#fff; color:#2b4162; border:1px solid rgba(43,65,98,.12);
      box-shadow:0 12px 28px rgba(31,42,68,.12); padding:10px 14px; border-radius:10px;
      font-weight:700; display:none; z-index:2000; max-width:90vw;
    `;
    document.body.appendChild(toastEl);
  }
  function toast(msg, kind = 'ok') {
    toastEl.textContent = msg;
    toastEl.style.display = 'inline-block';
    toastEl.style.borderColor =
      kind === 'ok' ? 'rgba(11,110,79,.3)' : 'rgba(190,30,30,.35)';
    toastEl.style.color = kind === 'ok' ? '#2b4162' : '#621708';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.style.display = 'none';
    }, 2200);
  }

  // --------- Date helpers ---------
  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  // current dashboard date (shared by Activity + Carbon)
  let currentDashDate = todayISO();

  function updateDateUI() {
    if (dashDatePicker) dashDatePicker.value = currentDashDate;
    if (dashDateLabel) {
      dashDateLabel.textContent =
        currentDashDate === todayISO() ? 'Today' : currentDashDate;
    }
    if (todayDateEl) {
      // nice human-readable header
      const d = new Date(currentDashDate);
      todayDateEl.textContent = d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }

  function emitDateChange() {
    const ev = new CustomEvent('spectra:dateChange', {
      detail: { date: currentDashDate },
    });
    document.dispatchEvent(ev);
  }

  // wire date picker + today button
  dashDatePicker?.addEventListener('change', () => {
    if (!dashDatePicker.value) return;
    currentDashDate = dashDatePicker.value;
    updateDateUI();
    emitDateChange();
    renderActivity(); // reload fitness values for this day
  });

  dashTodayBtn?.addEventListener('click', () => {
    currentDashDate = todayISO();
    updateDateUI();
    emitDateChange();
    renderActivity();
  });

  // initial date UI
  updateDateUI();
  emitDateChange();

  // --------- Tab switching (persists to hash + localStorage) ---------
  function setTab(tab) {
    const isCarbon = tab === 'carbon';

    activityTab?.classList.toggle('segmented__btn--active', !isCarbon);
    carbonTab?.classList.toggle('segmented__btn--active', isCarbon);

    fitnessView?.classList.toggle('hidden', isCarbon);
    carbonView?.classList.toggle('hidden', !isCarbon);

    document.body.classList.toggle('show-carbon', isCarbon);

    try {
      localStorage.setItem('dashTab', isCarbon ? 'carbon' : 'fitness');
    } catch {}

    const desiredHash = `#${isCarbon ? 'carbon' : 'fitness'}`;
    if (location.hash !== desiredHash) {
      history.replaceState(null, '', desiredHash);
    }
  }

  activityTab?.addEventListener('click', () => setTab('fitness'));
  carbonTab?.addEventListener('click', () => setTab('carbon'));

  const initial =
    location.hash === '#carbon'
      ? 'carbon'
      : location.hash === '#fitness'
      ? 'fitness'
      : localStorage.getItem('dashTab') || 'fitness';
  setTab(initial);

  // --------- Navigation ---------
  document
    .getElementById('profileBtn')
    ?.addEventListener('click', () => (location.href = '/profile'));
  document
    .getElementById('leaderboardBtn')
    ?.addEventListener('click', () => (location.href = '/leaderboard'));
  document
  .getElementById('challengesBtn')
  ?.addEventListener('click', () => {
    location.href = '/badges';
  });


  // --------- Logout / Refresh ---------
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('token');
    location.href = '/';
  });
  refreshBtn?.addEventListener('click', () => renderActivity());

  // --------- Render fitness cards (DATE-AWARE) ---------
  async function renderActivity() {
    try {
      const m = await DataModel.getActivityMetrics(currentDashDate);

      setCard('steps', m.steps, m.stepsTarget);
      setCard('cal', m.calories, m.caloriesTarget);
      setCard('dist', m.distance, m.distanceTarget);
      setCard('min', m.minutes, m.minutesTarget);

      preloadValues(m);
      preloadGoals(m);
    } catch (e) {
      console.error('renderActivity error:', e);
      toast('Failed to load activity', 'err');
    }
  }

  function setCard(prefix, value, target) {
    const valueEl = document.getElementById(`${prefix}Value`);
    const targetEl = document.getElementById(`${prefix}Target`);
    const barEl = document.getElementById(`${prefix}Bar`);
    if (valueEl) valueEl.textContent = Number(value ?? 0).toLocaleString();
    if (targetEl) targetEl.textContent = Number(target ?? 0).toLocaleString();
    if (barEl) {
      const pct = Math.max(
        0,
        Math.min(100, target ? (value / target) * 100 : 0)
      );
      requestAnimationFrame(() => {
        barEl.style.width = `${pct}%`;
      });
    }
  }

  // --------- Modals: preload + open/close (Fitness only) ---------
  function preloadValues(m) {
    const S = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v;
    };
    S('val-steps', m.steps ?? 0);
    S('val-distance', m.distance ?? 0);
    S('val-minutes', m.minutes ?? 0);
    S('val-calories', m.calories ?? 0);
  }
  function preloadGoals(m) {
    const S = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v;
    };
    S('goal-steps', m.stepsTarget ?? 10000);
    S('goal-distance', m.distanceTarget ?? 8);
    S('goal-minutes', m.minutesTarget ?? 60);
    S('goal-calories', m.caloriesTarget ?? 650);
  }

  const open = (el) => el && el.classList.remove('hidden');
  const close = (el) => el && el.classList.add('hidden');

  editValuesBtn?.addEventListener('click', () => open(modalValues));
  editGoalsBtn?.addEventListener('click', () => open(modalGoals));

  document
    .querySelector('[data-close-values]')
    ?.addEventListener('click', () => close(modalValues));
  document
    .querySelector('[data-close-goals]')
    ?.addEventListener('click', () => close(modalGoals));

  modalValues?.addEventListener('click', (e) => {
    if (e.target === modalValues) close(modalValues);
  });
  modalGoals?.addEventListener('click', (e) => {
    if (e.target === modalGoals) close(modalGoals);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close(modalValues);
      close(modalGoals);
    }
  });

  // Save helpers for Fitness forms
  function setSaving(formEl, saving) {
    if (!formEl) return;
    const btn = formEl.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = !!saving;
      btn.textContent = saving ? 'Saving…' : 'Save';
    }
    formEl.querySelectorAll('input').forEach((i) => (i.disabled = !!saving));
  }

  // Fitness forms (DATE-AWARE save)
  formValues?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      steps: Number(document.getElementById('val-steps')?.value || 0),
      distance: Number(
        document.getElementById('val-distance')?.value || 0
      ),
      minutes: Number(
        document.getElementById('val-minutes')?.value || 0
      ),
      calories: Number(
        document.getElementById('val-calories')?.value || 0
      ),
    };
    try {
      setSaving(formValues, true);
      await DataModel.updateActivityValues(payload, currentDashDate);
      close(modalValues);
      toast('Values saved ✔', 'ok');
      renderActivity();
    } catch (err) {
      console.error('Save values failed:', err);
      toast(err?.message || 'Failed to save values', 'err');
    } finally {
      setSaving(formValues, false);
    }
  });

  formGoals?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      stepsTarget: Number(
        document.getElementById('goal-steps')?.value || 10000
      ),
      distanceTarget: Number(
        document.getElementById('goal-distance')?.value || 8
      ),
      minutesTarget: Number(
        document.getElementById('goal-minutes')?.value || 60
      ),
      caloriesTarget: Number(
        document.getElementById('goal-calories')?.value || 650
      ),
    };
    try {
      setSaving(formGoals, true);
      await DataModel.updateActivityGoals(payload);
      close(modalGoals);
      toast('Goals updated ✔', 'ok');
      renderActivity();
    } catch (err) {
      console.error('Save goals failed:', err);
      toast(err?.message || 'Failed to save goals', 'err');
    } finally {
      setSaving(formGoals, false);
    }
  });

  // First paint for the current date
  renderActivity();
});
