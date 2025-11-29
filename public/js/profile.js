// Check if user is logged in
const token = localStorage.getItem('jwtToken');
if (!token) {
    window.location.href = '/';
}

// DOM elements
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userFirstNameEl = document.getElementById('user-first-name');
const userLastNameEl = document.getElementById('user-last-name');
const userDobEl = document.getElementById('user-dob');
const logoutBtn = document.getElementById('logout-btn');
const editProfileBtn = document.getElementById('edit-profile-btn');
const goToDashboardBtn = document.getElementById('go-to-dashboard-btn');
const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
const viewFriendsBtn = document.getElementById('view-friends-btn');
const viewBadgesBtn = document.getElementById('view-badges-btn');

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
            userNameEl.textContent = userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.email;
            userEmailEl.textContent = userData.email;
            userFirstNameEl.textContent = userData.firstName || 'Not provided';
            userLastNameEl.textContent = userData.lastName || 'Not provided';
            userDobEl.textContent = userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString() : 'Not provided';
        } else {
            console.error('Failed to load profile');
            localStorage.removeItem('jwtToken');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        localStorage.removeItem('jwtToken');
        window.location.href = '/';
    }
}

// Logout functionality
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    window.location.href = '/';
});

// Edit profile functionality (placeholder)
editProfileBtn.addEventListener('click', () => {
    alert('Edit profile functionality coming soon!');
});

// Go to dashboard
goToDashboardBtn.addEventListener('click', () => {
    window.location.href = '/dashboard';
});

// View leaderboard
viewLeaderboardBtn.addEventListener('click', () => {
    window.location.href = '/leaderboard';
});

// View friends
viewFriendsBtn.addEventListener('click', () => {
    window.location.href = '/friends';
});

viewBadgesBtn.addEventListener('click', () => {
  window.location.href = '/badges';
});


// Load profile when page loads
loadProfile();