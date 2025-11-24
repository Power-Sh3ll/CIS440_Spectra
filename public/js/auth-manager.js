// Authentication Manager - Handles authentication state and initializes utilities
class AuthManager {
  constructor() {
    this.isAuthenticated = false;
    this.token = null;
    this.utilitiesLoaded = false;
    this.init();
  }

  init() {
    this.checkAuthentication();
  }

  checkAuthentication() {
    this.token = localStorage.getItem('jwtToken') || 
                 localStorage.getItem('token') || 
                 sessionStorage.getItem('token');
    
    this.isAuthenticated = !!this.token;
    
    // If on a protected page and not authenticated, redirect to login
    if (this.requiresAuth() && !this.isAuthenticated) {
      this.redirectToLogin();
      return;
    }

    // Initialize utilities if authenticated
    if (this.isAuthenticated && !this.utilitiesLoaded) {
      this.initializeUtilities();
    }
  }

  requiresAuth() {
    const path = window.location.pathname;
    const protectedPaths = ['/dashboard', '/profile', '/friends', '/settings', '/footprint', '/leaderboard'];
    return protectedPaths.some(protectedPath => path.includes(protectedPath));
  }

  redirectToLogin() {
    if (window.location.pathname !== '/' && window.location.pathname !== '/logon.html') {
      window.location.href = '/';
    }
  }

  async initializeUtilities() {
    if (this.utilitiesLoaded) return;
    
    try {
      // Initialize all utility managers
      if (window.themeManager) {
        await window.themeManager.loadSavedTheme();
      }
      
      if (window.unitsManager) {
        await window.unitsManager.loadUserUnits();
      }
      
      if (window.notificationManager) {
        await window.notificationManager.loadSettings();
      }
      
      if (window.privacyManager) {
        await window.privacyManager.loadUserPrivacy(this.getEmailFromToken());
      }
      
      this.utilitiesLoaded = true;
      
      // Dispatch event that utilities are ready
      window.dispatchEvent(new CustomEvent('utilitiesReady'));
    } catch (error) {
      console.warn('Error initializing utilities:', error);
    }
  }

  getEmailFromToken() {
    if (!this.token) return null;
    
    try {
      // Decode JWT token to get email (basic decode, not verification)
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.email;
    } catch (error) {
      console.warn('Could not decode token:', error);
      return null;
    }
  }

  getToken() {
    return this.token;
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }

  logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('userTheme');
    this.isAuthenticated = false;
    this.token = null;
    this.utilitiesLoaded = false;
    window.location.href = '/';
  }
}

// Initialize authentication manager globally
window.authManager = new AuthManager();