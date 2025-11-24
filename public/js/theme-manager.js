// Theme Manager - Handles theme switching and persistence
class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.init();
  }

  init() {
    // Apply saved theme immediately from localStorage for fast loading
    const savedTheme = localStorage.getItem('userTheme') || 'light';
    this.applyTheme(savedTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    });

    // Listen for authentication ready
    window.addEventListener('utilitiesReady', () => {
      // Auth manager will call loadSavedTheme when ready
    });
  }

  async loadSavedTheme() {
    try {
      // First try localStorage (immediate application)
      const savedTheme = localStorage.getItem('userTheme');
      if (savedTheme) {
        this.applyTheme(savedTheme);
        return;
      }

      // Then load from user settings (only if authenticated)
      const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
      if (!token) {
        // No token, use default theme
        this.applyTheme('light');
        return;
      }

      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const settings = await response.json();
        this.applyTheme(settings.theme || 'light');
      } else {
        // Settings not available, use default
        this.applyTheme('light');
      }
    } catch (error) {
      console.warn('Could not load theme from settings:', error);
      this.applyTheme('light');
    }
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    
    let actualTheme = theme;
    if (theme === 'auto') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', actualTheme);
    document.body.classList.toggle('dark-theme', actualTheme === 'dark');
    
    // Save to localStorage for immediate future use
    localStorage.setItem('userTheme', theme);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme: actualTheme, userChoice: theme } 
    }));
  }

  setTheme(theme) {
    this.applyTheme(theme);
  }

  getTheme() {
    return this.currentTheme;
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getEffectiveTheme() {
    if (this.currentTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  toggleTheme() {
    // Cycle through themes: light -> dark -> auto -> light
    switch (this.currentTheme) {
      case 'light':
        this.setTheme('dark');
        break;
      case 'dark':
        this.setTheme('auto');
        break;
      case 'auto':
        this.setTheme('light');
        break;
      default:
        this.setTheme('light');
        break;
    }
  }
}

// Initialize theme manager globally
window.themeManager = new ThemeManager();