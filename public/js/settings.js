// Settings Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token) {
    window.location.href = '/';
    return;
  }

  // Initialize the navbar
  new SpectraNavbar();

  // DOM Elements
  const form = document.getElementById('settings-form');
  const resetBtn = document.getElementById('reset-btn');
  const messageEl = document.getElementById('settings-message');
  const distanceUnitEl = document.getElementById('distance-unit');
  const unitsSelect = document.getElementById('units');

  // Settings API endpoints
  const SETTINGS_API = '/api/settings';

  // Default settings
  const defaultSettings = {
    theme: 'light',
    notifications_enabled: true,
    email_notifications: true,
    activity_privacy: 'public',
    units: 'metric',
    timezone: 'UTC',
    language: 'en',
    weekly_goal_steps: 70000,
    weekly_goal_distance: 50.0
  };

  // Wait for authentication manager to be ready
  if (window.authManager && window.authManager.isLoggedIn()) {
    // Auth manager is ready and user is authenticated
    initializePage();
  } else {
    // Wait for utilities to be ready
    window.addEventListener('utilitiesReady', initializePage);
    
    // Fallback timeout in case auth manager doesn't fire the event
    setTimeout(() => {
      if (localStorage.getItem('jwtToken') || localStorage.getItem('token')) {
        initializePage();
      }
    }, 1000);
  }

  function initializePage() {
    loadSettings();
    
    // Event Listeners
    form.addEventListener('submit', saveSettings);
    resetBtn.addEventListener('click', resetToDefaults);
    unitsSelect.addEventListener('change', updateDistanceUnit);
  }

  // Load user settings from server
  async function loadSettings() {
    try {
      const currentToken = localStorage.getItem('jwtToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!currentToken) {
        showMessage('Authentication required. Redirecting to login...', 'error');
        setTimeout(() => window.location.href = '/', 1000);
        return;
      }

      const response = await fetch(SETTINGS_API, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const settings = await response.json();
        populateForm(settings);
        applyTheme(settings.theme);
      } else if (response.status === 404) {
        // No settings exist yet, use defaults
        populateForm(defaultSettings);
      } else if (response.status === 403) {
        // Authentication failed, redirect to login
        showMessage('Session expired. Please log in again.', 'error');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Error loading settings. Using defaults.', 'error');
      populateForm(defaultSettings);
    }
  }

  // Populate form with settings data
  function populateForm(settings) {
    Object.keys(settings).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = settings[key];
        } else {
          element.value = settings[key];
        }
      }
    });
    
    // Update distance unit display
    updateDistanceUnit();
  }

  // Save settings to server
  async function saveSettings(event) {
    event.preventDefault();
    
    const currentToken = localStorage.getItem('jwtToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!currentToken) {
      showMessage('Authentication required. Please log in again.', 'error');
      setTimeout(() => window.location.href = '/', 2000);
      return;
    }

    const formData = new FormData(form);
    const settings = {};
    
    // Extract form data
    for (const [key, value] of formData.entries()) {
      if (['weekly_goal_steps', 'weekly_goal_distance'].includes(key)) {
        settings[key] = parseFloat(value) || defaultSettings[key];
      } else {
        settings[key] = value;
      }
    }

    // Handle checkboxes (they won't be in formData if unchecked)
    settings.notifications_enabled = document.getElementById('notifications_enabled').checked;
    settings.email_notifications = document.getElementById('email_notifications').checked;

    try {
      const response = await fetch(SETTINGS_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        showMessage('Settings saved successfully!', 'success');
        applyTheme(settings.theme);
        
        // Update localStorage for immediate theme effect
        localStorage.setItem('userTheme', settings.theme);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Error saving settings. Please try again.', 'error');
    }
  }

  // Reset to default settings
  function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
      populateForm(defaultSettings);
      showMessage('Settings reset to defaults. Click "Save Settings" to apply.', 'info');
    }
  }

  // Apply theme
  function applyTheme(theme) {
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply to body as well for compatibility
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }

  // Update distance unit display based on selected units
  function updateDistanceUnit() {
    const units = unitsSelect.value;
    distanceUnitEl.textContent = units === 'metric' ? 'km' : 'mi';
    
    // Update placeholder if needed
    const distanceInput = document.getElementById('weekly_goal_distance');
    if (units === 'imperial') {
      distanceInput.placeholder = '31.0'; // ~50km in miles
    } else {
      distanceInput.placeholder = '50.0';
    }
  }

  // Show status message
  function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `settings-message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }

  // Listen for system theme changes if auto theme is selected
  window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
    const currentTheme = document.getElementById('theme').value;
    if (currentTheme === 'auto') {
      applyTheme('auto');
    }
  });

  // Apply saved theme on page load
  const savedTheme = localStorage.getItem('userTheme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }
});