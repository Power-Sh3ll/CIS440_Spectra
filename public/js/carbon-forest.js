(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const carbonInput = $('#carbonInput');
  const unitSelect = $('#unitSelect');
  const factorInput = $('#factorInput');
  const treeCheckboxes = $$('.tree-checkbox input[type="checkbox"]');
  const resetFactorBtn = $('#resetFactor');
  const plantBtn = $('#plantBtn');
  const clearBtn = $('#clearBtn');
  const forestGrid = $('#forestGrid');
  const countOutput = $('#countOutput');

  const DEFAULT_FACTOR_KG_PER_TREE = 21;

  // Tree templates mapped to locations
  const locationTrees = {
    global: 'treeTemplate',
    japan: 'cherryTemplate',
    kenya: 'acaciaTemplate',
    indonesia: 'mangroveTemplate',
    usa: 'oakTemplate',
    amazon: 'tropicalTemplate',
    canada: 'pineTemplate'
  };
  
  // All tree types for global random selection
  const allTreeTypes = ['treeTemplate', 'cherryTemplate', 'acaciaTemplate', 'mangroveTemplate', 'oakTemplate', 'tropicalTemplate', 'pineTemplate'];

  // Get selected tree types
  function getSelectedTreeTypes() {
    const selected = [];
    treeCheckboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selected.push(checkbox.value);
      }
    });
    return selected.length > 0 ? selected : ['global'];
  }
  
  // Handle global checkbox behavior
  const globalCheckbox = $('#globalCheckbox');
  treeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      if (checkbox !== globalCheckbox && checkbox.checked) {
        // If any non-global checkbox is checked, uncheck global
        globalCheckbox.checked = false;
      } else if (checkbox === globalCheckbox && checkbox.checked) {
        // If global is checked, uncheck all others
        treeCheckboxes.forEach(cb => {
          if (cb !== globalCheckbox) {
            cb.checked = false;
          }
        });
      }
      
      // Ensure at least one is checked
      const anyChecked = Array.from(treeCheckboxes).some(cb => cb.checked);
      if (!anyChecked) {
        globalCheckbox.checked = true;
      }
      
      calculateAndPlant();
    });
  });

  // Convert user input to kg CO2
  function toKgCO2(value, unit) {
    const v = Number(value) || 0;
    if (unit === 't') return v * 1000;
    return v;
  }

  // Compute number of trees (floor for whole trees)
  function computeTreeCount(kgCO2, kgPerTree) {
    if (kgPerTree <= 0) return 0;
    return Math.floor(kgCO2 / kgPerTree);
  }

  // Update forest background based on selected tree types
  function updateForestBackground() {
    const selected = getSelectedTreeTypes();
    // Use a mixed natural forest background
    const background = 'radial-gradient(circle at 30% 70%, rgba(34, 197, 94, 0.12) 0%, transparent 25%), radial-gradient(circle at 70% 30%, rgba(34, 139, 34, 0.1) 0%, transparent 28%), linear-gradient(180deg, #0a1a0a 0%, #1a2a1a 50%, #2a3520 100%)';
    forestGrid.parentElement.style.background = background;
  }

  // Render tree nodes with a gentle stagger for visual feedback
  async function plantTrees(count, append = false) {
    if (!append) forestGrid.innerHTML = '';

    const selectedTypes = getSelectedTreeTypes();
    if (selectedTypes.length === 0) return;

    const fragment = document.createDocumentFragment();
    const gridWidth = forestGrid.offsetWidth;
    const gridHeight = forestGrid.offsetHeight; // Use fixed height instead of dynamic
    
    // Calculate center point
    const centerX = gridWidth / 2;
    const centerY = gridHeight / 2;
    
    // Spiral parameters for natural distribution from center
    const spiralSpacing = 100; // Distance between spiral rings (increased from 70)
    const pointsPerRing = 7; // Trees per spiral ring

    for (let i = 0; i < count; i++) {
      let templateId;
      
      // If global is selected, randomly pick from all tree types
      if (selectedTypes.includes('global')) {
        templateId = allTreeTypes[Math.floor(Math.random() * allTreeTypes.length)];
      } else {
        // Pick random tree type from selected types
        const randomType = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
        templateId = locationTrees[randomType] || 'treeTemplate';
      }
      
      const treeTpl = $(`#${templateId}`);
      const node = treeTpl.content.firstElementChild.cloneNode(true);
      
      const delay = Math.random() * 400 + (i * 25);
      node.style.animationDelay = `${delay}ms`;
      
      // Spiral distribution from center
      const angle = (i / pointsPerRing) * Math.PI * 2;
      const ring = Math.floor(i / pointsPerRing);
      const radius = ring * spiralSpacing + (Math.random() - 0.5) * 60; // More random spread
      
      let x = centerX + Math.cos(angle) * radius - 80; // -80 to center the tree (160px wide / 2)
      let y = centerY + Math.sin(angle) * radius - 100; // -100 to center the tree (200px tall / 2)
      
      // Check if tree would be out of bounds, if so, use random position within bounds
      const treeWidth = 160;
      const treeHeight = 200;
      const padding = 20; // Keep trees away from edges
      
      if (x < padding || x > gridWidth - treeWidth - padding || 
          y < padding || y > gridHeight - treeHeight - padding) {
        // Generate random position within safe bounds
        x = padding + Math.random() * (gridWidth - treeWidth - padding * 2);
        y = padding + Math.random() * (gridHeight - treeHeight - padding * 2);
      }
      
      const randomScale = 0.7 + Math.random() * 0.6;
      const randomRotation = (Math.random() - 0.5) * 12;
      const randomZ = Math.floor(Math.random() * 20);
      
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.setProperty('--random-scale', randomScale);
      node.style.setProperty('--random-rotation', `${randomRotation}deg`);
      node.style.zIndex = randomZ;
      
      fragment.appendChild(node);
    }
    forestGrid.appendChild(fragment);

    updateCounter();
    updateForestBackground();
  }

  function updateCounter() {
    const total = forestGrid.childElementCount;
    const selected = getSelectedTreeTypes();
    let treeName = 'mixed trees';
    if (selected.length === 1) {
      const locationNames = {
        global: 'trees',
        japan: 'cherry blossoms',
        kenya: 'acacia trees',
        indonesia: 'mangroves',
        usa: 'oak/maple trees',
        amazon: 'tropical trees',
        canada: 'pine trees'
      };
      treeName = locationNames[selected[0]] || 'trees';
    }
    countOutput.textContent = `${total.toLocaleString()} ${treeName}`;
  }

  function getInputs() {
    const kgCO2 = toKgCO2(carbonInput.value, unitSelect.value);
    const kgPerTree = Math.max(1, Number(factorInput.value) || DEFAULT_FACTOR_KG_PER_TREE);
    return { kgCO2, kgPerTree };
  }

  function calculateAndPlant() {
    const { kgCO2, kgPerTree } = getInputs();
    const count = computeTreeCount(kgCO2, kgPerTree);
    plantTrees(count, false);
  }

  // Events
  plantBtn.addEventListener('click', calculateAndPlant);
  clearBtn.addEventListener('click', () => { 
    forestGrid.innerHTML = ''; 
    updateCounter(); 
  });

  [carbonInput, unitSelect, factorInput].forEach(el => {
    el.addEventListener('change', calculateAndPlant);
    el.addEventListener('input', () => {
      window.cancelAnimationFrame(el._raf || 0);
      el._raf = window.requestAnimationFrame(calculateAndPlant);
    });
  });

  resetFactorBtn.addEventListener('click', () => {
    factorInput.value = DEFAULT_FACTOR_KG_PER_TREE;
    calculateAndPlant();
  });

  // Navigation
  const dashboardBtn = $('#dashboardBtn');
  const friendsBtn = $('#friendsBtn');
  const leaderboardBtn = $('#leaderboardBtn');
  const badgesBtn = $('#badgesBtn');
  const logoutButton = $('#logoutButton');
  const refreshButton = $('#refreshButton');

  if (dashboardBtn) dashboardBtn.addEventListener('click', () => window.location.href = '/dashboard.html');
  if (friendsBtn) friendsBtn.addEventListener('click', () => window.location.href = '/friends.html');
  if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => window.location.href = '/Leaderboard.html');
  if (badgesBtn) badgesBtn.addEventListener('click', () => window.location.href = '/badges.html');

  if (refreshButton) {
    refreshButton.addEventListener('click', calculateAndPlant);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = '/logon.html';
    });
  }

  // Initial render
  updateForestBackground();
  calculateAndPlant();
})();
