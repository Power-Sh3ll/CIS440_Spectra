// Notification Manager - Handles in-app and email notifications
class NotificationManager {
  constructor() {
    this.notificationsEnabled = true;
    this.emailEnabled = true;
    this.pokesAllowed = true;
    // Don't auto-load settings, wait for auth manager
    window.addEventListener('utilitiesReady', () => {
      // Auth manager will call loadSettings when ready
    });
  }

  async loadSettings() {
    try {
      const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
      if (!token) {
        // No token, use defaults
        this.notificationsEnabled = true;
        this.emailEnabled = true;
        this.pokesAllowed = true;
        return;
      }

      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const settings = await response.json();
        this.notificationsEnabled = settings.notifications_enabled !== false;
        this.emailEnabled = settings.email_notifications !== false;
        this.pokesAllowed = settings.allow_pokes !== false;
      } else {
        // Settings not available, use defaults
        this.notificationsEnabled = true;
        this.emailEnabled = true;
        this.pokesAllowed = true;
      }
    } catch (error) {
      console.warn('Could not load notification settings:', error);
      // Use defaults on error
      this.notificationsEnabled = true;
      this.emailEnabled = true;
      this.pokesAllowed = true;
    }
  }

  // Check if user allows specific notification types
  canReceiveNotifications() {
    return this.notificationsEnabled;
  }

  canReceiveEmails() {
    return this.emailEnabled;
  }

  canReceivePokes() {
    return this.pokesAllowed;
  }

  // Show in-app notification if enabled
  showNotification(title, message, type = 'info') {
    if (!this.notificationsEnabled) return;

    // Browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/Assets/Logo.png',
        tag: 'spectra-notification'
      });
    }

    // In-app toast notification
    this.showToast(message, type);
  }

  showToast(message, type = 'info', duration = 4000) {
    if (!this.notificationsEnabled) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
      </div>
    `;

    // Add to page
    document.body.appendChild(toast);

    // Show animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto-hide
    const hideToast = () => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    };

    setTimeout(hideToast, duration);
    toast.querySelector('.toast-close').addEventListener('click', hideToast);
  }

  // Request browser notification permission
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  // Friend request notifications
  notifyFriendRequest(fromUser) {
    this.showNotification(
      'New Friend Request',
      `${fromUser.first_name} ${fromUser.last_name} wants to be your friend!`,
      'info'
    );
  }

  // Activity achievement notifications
  notifyAchievement(achievement) {
    this.showNotification(
      'Achievement Unlocked!',
      achievement.message,
      'success'
    );
  }

  // Poke notifications
  notifyPoke(fromUser) {
    if (!this.pokesAllowed) return;
    
    this.showNotification(
      'You got poked!',
      `${fromUser.first_name} ${fromUser.last_name} poked you`,
      'info'
    );
  }
}

window.notificationManager = new NotificationManager();