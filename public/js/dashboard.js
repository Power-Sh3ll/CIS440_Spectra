// public/js/dashboard.js
// DASHBOARD CONTROLLER (with toasts + robust saves)
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

  // --------- Auth check ---------
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return;
  }

  // --------- Ensure toast exists (auto-inject if missing) ---------
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
    toastEl.style.borderColor = (kind === 'ok') ? 'rgba(11,110,79,.3)' : 'rgba(190,30,30,.35)';
    toastEl.style.color = (kind === 'ok') ? '#2b4162' : '#621708';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.display = 'none'; }, 2200);
  }

  // --------- Date ---------
  if (todayDateEl) {
    todayDateEl.textContent = new Date().toLocaleDateString(undefined, {
      year:'numeric', month:'long', day:'numeric'
    });
  }

  // --------- Tab switching ---------
  function setTab(tab) {
    if (!activityTab || !carbonTab || !fitnessView || !carbonView) return;
    if (tab === 'fitness') {
      activityTab.classList.add('segmented__btn--active');
      carbonTab.classList.remove('segmented__btn--active');
      fitnessView.classList.remove('hidden');
      carbonView.classList.add('hidden');
    } else {
      carbonTab.classList.add('segmented__btn--active');
      activityTab.classList.remove('segmented__btn--active');
      carbonView.classList.remove('hidden');
      fitnessView.classList.add('hidden');
    }
  }
  activityTab?.addEventListener('click', () => setTab('fitness'));
  carbonTab?.addEventListener('click',   () => setTab('carbon'));

  // --------- Navigation ---------
  document.getElementById('profileBtn')?.addEventListener('click', () => location.href='/profile');
  document.getElementById('leaderboardBtn')?.addEventListener('click', () => location.href='/leaderboard');
  document.getElementById('challengesBtn')?.addEventListener('click', () => alert('Challenges coming soon ✨'));

  // --------- Logout / Refresh ---------
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('token');
    location.href = '/';
  });
  refreshBtn?.addEventListener('click', () => renderActivity());

  // --------- Render cards ---------
  async function renderActivity() {
    try {
      const m = await DataModel.getActivityMetrics();
      // numbers
      setCard('steps', m.steps, m.stepsTarget);
      setCard('cal',   m.calories,  m.caloriesTarget);
      setCard('dist',  m.distance,  m.distanceTarget);
      setCard('min',   m.minutes,   m.minutesTarget);

      // preload modals so they open with current values
      preloadValues(m);
      preloadGoals(m);
    } catch (e) {
      console.error('renderActivity error:', e);
      toast('Failed to load activity', 'err');
    }
  }

  function setCard(prefix, value, target) {
    const valueEl  = document.getElementById(`${prefix}Value`);
    const targetEl = document.getElementById(`${prefix}Target`);
    const barEl    = document.getElementById(`${prefix}Bar`);
    if (valueEl)  valueEl.textContent  = Number(value ?? 0).toLocaleString();
    if (targetEl) targetEl.textContent = Number(target ?? 0).toLocaleString();
    if (barEl) {
      const pct = Math.max(0, Math.min(100, target ? (value / target) * 100 : 0));
      requestAnimationFrame(() => { barEl.style.width = `${pct}%`; });
    }
  }

  // --------- Modals: preload + open/close ---------
  function preloadValues(m) {
    const S = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    S('val-steps',    m.steps ?? 0);
    S('val-distance', m.distance ?? 0);
    S('val-minutes',  m.minutes ?? 0);
    S('val-calories', m.calories ?? 0);
  }
  function preloadGoals(m) {
    const S = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    S('goal-steps',    m.stepsTarget ?? 10000);
    S('goal-distance', m.distanceTarget ?? 8);
    S('goal-minutes',  m.minutesTarget ?? 60);
    S('goal-calories', m.caloriesTarget ?? 650);
  }

  const open  = (el)=> el && el.classList.remove('hidden');
  const close = (el)=> el && el.classList.add('hidden');

  editValuesBtn?.addEventListener('click', () => open(modalValues));
  editGoalsBtn?.addEventListener('click',  () => open(modalGoals));

  document.querySelector('[data-close-values]')?.addEventListener('click', () => close(modalValues));
  document.querySelector('[data-close-goals]')?.addEventListener('click',  () => close(modalGoals));

  // close on backdrop click
  modalValues?.addEventListener('click', (e)=> { if (e.target === modalValues) close(modalValues); });
  modalGoals ?.addEventListener('click', (e)=> { if (e.target === modalGoals)  close(modalGoals);  });

  // Esc key closes
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') { close(modalValues); close(modalGoals); }
  });

  // --------- Save helpers ---------
  function setSaving(formEl, saving) {
    if (!formEl) return;
    const btn = formEl.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = !!saving;
      btn.textContent = saving ? 'Saving…' : 'Save';
    }
    // also disable inputs to avoid double submits
    formEl.querySelectorAll('input').forEach(i => i.disabled = !!saving);
  }

  // --------- Form submits ---------
  formValues?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      steps:    Number(document.getElementById('val-steps')?.value || 0),
      distance: Number(document.getElementById('val-distance')?.value || 0),
      minutes:  Number(document.getElementById('val-minutes')?.value || 0),
      calories: Number(document.getElementById('val-calories')?.value || 0),
    };
    try {
      setSaving(formValues, true);
      await DataModel.updateActivityValues(payload);        // POST /api/activity/update
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

  formGoals?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      stepsTarget:    Number(document.getElementById('goal-steps')?.value || 10000),
      distanceTarget: Number(document.getElementById('goal-distance')?.value || 8),
      minutesTarget:  Number(document.getElementById('goal-minutes')?.value || 60),
      caloriesTarget: Number(document.getElementById('goal-calories')?.value || 650),
    };
    try {
      setSaving(formGoals, true);
      await DataModel.updateActivityGoals(payload);         // POST /api/activity/goals
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

  // --------- First paint ---------
  renderActivity();
});
