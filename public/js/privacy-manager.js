// Privacy Manager - Handles activity visibility settings
class PrivacyManager {
  constructor() {
    this.userPrivacyLevel = 'public';
  }

  async loadUserPrivacy(userEmail) {
    try {
      const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const settings = await response.json();
        this.userPrivacyLevel = settings.activity_privacy || 'public';
      }
    } catch (error) {
      console.warn('Could not load privacy settings:', error);
    }
  }

  // Check if current user can view target user's activity
  async canViewActivity(targetUserEmail) {
    try {
      const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
      const response = await fetch(`/api/privacy/can-view/${encodeURIComponent(targetUserEmail)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.canView;
      }
      return false;
    } catch (error) {
      console.error('Error checking privacy permissions:', error);
      return false;
    }
  }

  // Filter activity data based on privacy settings
  filterActivityData(activityData, targetUserEmail, currentUserEmail, areFriends = false) {
    if (currentUserEmail === targetUserEmail) {
      return activityData; // Own data is always visible
    }

    const privacyLevel = activityData.privacy || this.userPrivacyLevel;
    
    switch (privacyLevel) {
      case 'private':
        return null; // No access
      case 'friends':
        return areFriends ? activityData : null;
      case 'public':
      default:
        return activityData;
    }
  }

  getPrivacyLabel(level) {
    const labels = {
      'public': 'Everyone can see',
      'friends': 'Friends only',
      'private': 'Only you can see'
    };
    return labels[level] || labels.public;
  }
}

window.privacyManager = new PrivacyManager();