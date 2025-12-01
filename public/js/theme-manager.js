// Global Theme Manager - Works site-wide
class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.init();
  }

  init() {
    // Apply saved theme immediately on page load
    this.applyTheme(this.getSavedTheme());
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    });

    // Make theme manager available globally
    window.themeManager = this;
  }

  getSavedTheme() {
    // Check localStorage first for immediate application
    const localTheme = localStorage.getItem('userTheme');
    if (localTheme) {
      return localTheme;
    }
    
    // Default to light theme
    return 'light';
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    
    let effectiveTheme = theme;
    if (theme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.body.classList.toggle('dark-theme', effectiveTheme === 'dark');
    
    // Save to localStorage
    localStorage.setItem('userTheme', theme);
    
    // Update any theme toggle buttons on the page
    this.updateThemeButtons();
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme: effectiveTheme, userChoice: theme } 
    }));
  }

  updateThemeButtons() {
    const themeNames = {
      'light': 'Light',
      'dark': 'Dark',
      'auto': 'Auto'
    };
    
    // Update theme toggle buttons
    const themeButtons = document.querySelectorAll('#theme-toggle, .theme-toggle');
    themeButtons.forEach(button => {
      if (button) {
        button.textContent = `🌓 ${themeNames[this.currentTheme]}`;
      }
    });
  }

  setTheme(theme) {
    this.applyTheme(theme);
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
      default:
        this.setTheme('light');
        break;
    }
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
}

// Initialize theme manager immediately
const globalThemeManager = new ThemeManager();

// Global function for theme toggling
function toggleTheme() {
  globalThemeManager.toggleTheme();
}