// Check if user is logged in
const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

// DOM elements
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userEmailTopEl = document.getElementById('user-email-top');
const userFirstNameEl = document.getElementById('user-first-name');
const userLastNameEl = document.getElementById('user-last-name');
const userDobEl = document.getElementById('user-dob');
const avatarImg = document.getElementById('avatar-img');
const avatarInitials = document.getElementById('avatar-initials');

// Load user profile data
async function loadProfile() {
    try {
        const response = await fetch('/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData = await response.json();
            
            // Update UI with user data
            const fullName = userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.email;
            if (userNameEl) userNameEl.textContent = userData.firstName || 'User';
            if (userEmailEl) userEmailEl.textContent = userData.email || 'Loading...';
            if (userEmailTopEl) userEmailTopEl.textContent = userData.email || 'Loading...';
            if (userFirstNameEl) userFirstNameEl.textContent = userData.firstName || 'Loading...';
            if (userLastNameEl) userLastNameEl.textContent = userData.lastName || 'Loading...';
            if (userDobEl) userDobEl.textContent = userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString() : 'Loading...';
            
            // Handle avatar
            if (avatarInitials && userData.firstName) {
                avatarInitials.textContent = userData.firstName.charAt(0).toUpperCase();
            } else if (avatarInitials) {
                avatarInitials.textContent = 'U';
            }
        } else {
            console.error('Failed to load profile');
            // Don't redirect on dashboard page, just show loading state
            console.log('Profile data could not be loaded, but staying on dashboard');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Don't redirect on dashboard page
        console.log('Error loading profile data, but staying on dashboard');
    }
}
// Load profile when page loads
loadProfile();