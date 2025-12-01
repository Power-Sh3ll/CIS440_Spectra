// Check if user is logged in
const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

// DOM elements
const friendsList = document.getElementById('friends-list');
const receivedRequests = document.getElementById('received-requests');
const sentRequests = document.getElementById('sent-requests');

// Tab functionality
document.addEventListener('DOMContentLoaded', () => {
    // Navigation handlers
    document.getElementById('dashboardBtn')?.addEventListener('click', () => {
        window.location.href = '/dashboard';
    });
    
    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
        window.location.href = '/leaderboard';
    });
    
    document.getElementById('badgesBtn')?.addEventListener('click', () => {
        window.location.href = '/badges';
    });
    
    document.getElementById('carbonForestBtn')?.addEventListener('click', () => {
        window.location.href = '/carbon-forest.html';
    });
    
    // Refresh and logout
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        loadFriendsData();
    });
    
    document.getElementById('logoutButton')?.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    // Initialize tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab panel
            tabPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(`${tabId}-panel`).classList.add('active');
        });
    });
    
    // Load friends data
    loadFriendsData();
});

// Theme toggle functionality
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    let newTheme;
    
    switch(currentTheme) {
        case 'light':
            newTheme = 'dark';
            break;
        case 'dark':
            newTheme = 'auto';
            break;
        case 'auto':
        default:
            newTheme = 'light';
            break;
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('userTheme', newTheme);
    
    // Update button text
    const themeNames = {
        'light': 'Light',
        'dark': 'Dark',
        'auto': 'Auto'
    };
    document.getElementById('theme-toggle').textContent = `🌓 ${themeNames[newTheme]}`;
}

// Load all friends data
async function loadFriendsData() {
    try {
        const response = await fetch('/api/friends', {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch friends data');
        }

        const data = await response.json();
        console.log('Friends data:', data);

        renderFriends(data.friends);
        renderReceivedRequests(data.receivedRequests);
        renderSentRequests(data.sentRequests);
        
        // Update counts if no data was rendered (fallback)
        if (data.friends.length === 0) {
            document.getElementById('friends-count').textContent = '0';
        }
        if (data.receivedRequests.length === 0) {
            document.getElementById('requests-count').textContent = '0';
        }
        if (data.sentRequests.length === 0) {
            document.getElementById('sent-count').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading friends data:', error);
        friendsList.innerHTML = '<div class="empty-state">Error loading friends</div>';
        receivedRequests.innerHTML = '<div class="empty-state">Error loading requests</div>';
        sentRequests.innerHTML = '<div class="empty-state">Error loading sent requests</div>';
    }
}

// Render current friends
function renderFriends(friends) {
    if (friends.length === 0) {
        friendsList.innerHTML = '<div class="empty-state">No friends yet. Send some friend requests!</div>';
        return;
    }

    // Update friends count
    document.getElementById('friends-count').textContent = friends.length;

    friendsList.innerHTML = friends.map(friend => {
        const emailInitials = getEmailInitials(friend.friend_email);
        
        // Use database names if available, otherwise extract from email
        let displayName;
        if (friend.first_name && friend.last_name) {
            displayName = `${friend.first_name} ${friend.last_name}`;
        } else if (friend.first_name) {
            displayName = friend.first_name;
        } else {
            const nameInfo = getDisplayName(friend.friend_email);
            displayName = nameInfo.fullName;
        }
        
        return `
            <div class="friend-item">
                <div class="friend-info">
                    <div class="friend-avatar">${emailInitials}</div>
                    <div class="friend-details">
                        <div class="friend-name">${displayName}</div>
                        <div class="friend-email">${friend.friend_email}</div>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-decline" onclick="removeFriend('${friend.friend_email}')">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

// Render received friend requests
function renderReceivedRequests(requests) {
    console.log('Rendering received requests:', requests);
    
    if (requests.length === 0) {
        receivedRequests.innerHTML = '<div class="empty-state">No pending friend requests</div>';
        document.getElementById('requests-count').textContent = '0';
        return;
    }

    // Update requests count
    document.getElementById('requests-count').textContent = requests.length;

    receivedRequests.innerHTML = requests.map(request => {
        console.log('Processing request:', request);
        const emailInitials = getEmailInitials(request.requester_email);
        return `
            <div class="friend-item">
                <div class="friend-info">
                    <div class="friend-avatar">${emailInitials}</div>
                    <div class="friend-details">
                        <div class="friend-name">${request.requester_email}</div>
                        <div class="friend-email">Wants to be friends</div>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-accept" onclick="acceptRequest('${request.requester_email}')">Accept</button>
                    <button class="btn btn-decline" onclick="declineRequest('${request.requester_email}')">Decline</button>
                </div>
            </div>
        `;
    }).join('');
}

// Render sent friend requests
function renderSentRequests(requests) {
    if (requests.length === 0) {
        sentRequests.innerHTML = '<div class="empty-state">No pending sent requests</div>';
        document.getElementById('sent-count').textContent = '0';
        return;
    }

    // Update sent count
    document.getElementById('sent-count').textContent = requests.length;

    sentRequests.innerHTML = requests.map(request => {
        const emailInitials = getEmailInitials(request.recipient_email);
        return `
            <div class="friend-item">
                <div class="friend-info">
                    <div class="friend-avatar">${emailInitials}</div>
                    <div class="friend-details">
                        <div class="friend-name">${request.recipient_email}</div>
                        <div class="friend-email">Request sent</div>
                    </div>
                </div>
                <div class="friend-actions">
                    <span class="pending-status">Pending...</span>
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to get display name
function getDisplayName(firstName, lastName, email) {
    // If we have valid first and last names (not Unknown/User defaults)
    if (firstName && lastName && 
        firstName !== 'Unknown' && firstName !== 'null' && firstName !== null &&
        lastName !== 'User' && lastName !== 'null' && lastName !== null) {
        return `${firstName} ${lastName}`;
    }
    
    // If we only have first name
    if (firstName && firstName !== 'Unknown' && firstName !== 'null' && firstName !== null) {
        return firstName;
    }
    
    // If we only have last name  
    if (lastName && lastName !== 'User' && lastName !== 'null' && lastName !== null) {
        return lastName;
    }
    
    // Fall back to email if no valid names
    return email;
}

// Helper function to get initials
function getInitials(firstName, lastName) {
    // Handle null, undefined, or empty values
    const first = (firstName && firstName !== 'Unknown' && firstName !== 'null') ? firstName.charAt(0).toUpperCase() : '';
    const last = (lastName && lastName !== 'User' && lastName !== 'null') ? lastName.charAt(0).toUpperCase() : '';
    
    if (first || last) {
        return first + last;
    }
    
    // If no valid names, return a default
    return '?';
}

// Helper function to get initials from email address
function getEmailInitials(email) {
    if (!email || typeof email !== 'string') {
        return '?';
    }
    
    // Get the part before @ symbol
    const username = email.split('@')[0];
    
    // If username has dots or underscores, use first letters of parts
    if (username.includes('.') || username.includes('_')) {
        const parts = username.split(/[._]/);
        return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
    }
    
    // Otherwise, use first two letters of username
    return username.slice(0, 2).toUpperCase();
}

// Send friend request
async function sendFriendRequest() {
    const friendEmail = friendEmailInput.value.trim();
    
    if (!friendEmail) {
        alert('Please enter an email address');
        return;
    }

    if (!friendEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        sendRequestBtn.disabled = true;
        sendRequestBtn.textContent = 'Sending...';

        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendEmail })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Friend request sent successfully!');
            friendEmailInput.value = '';
            loadFriendsData(); // Reload to show updated data
        } else {
            alert(data.message || 'Error sending friend request');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        alert('Error sending friend request');
    } finally {
        sendRequestBtn.disabled = false;
        sendRequestBtn.textContent = 'Send Request';
    }
}

// Accept friend request
async function acceptRequest(requesterEmail) {
    try {
        const response = await fetch('/api/friends/accept', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requesterEmail })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Friend request accepted!');
            loadFriendsData(); // Reload to show updated data
        } else {
            alert(data.message || 'Error accepting friend request');
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        alert('Error accepting friend request');
    }
}

// Decline friend request
async function declineRequest(requesterEmail) {
    if (!confirm('Are you sure you want to decline this friend request?')) {
        return;
    }

    try {
        const response = await fetch('/api/friends/decline', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requesterEmail })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Friend request declined');
            loadFriendsData(); // Reload to show updated data
        } else {
            alert(data.message || 'Error declining friend request');
        }
    } catch (error) {
        console.error('Error declining friend request:', error);
        alert('Error declining friend request');
    }
}

// Remove friend
async function removeFriend(friendEmail) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }

    try {
        const response = await fetch('/api/friends/remove', {
            method: 'DELETE',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendEmail })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Friend removed successfully');
            loadFriendsData(); // Reload to show updated data
        } else {
            alert(data.message || 'Error removing friend');
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        alert('Error removing friend');
    }
}

// Search functionality
let currentSearchResults = [];

function searchUsers(query) {
    if (!query || query.trim().length < 2) {
        alert('Please enter at least 2 characters to search');
        return;
    }

    fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`, {
        method: 'GET',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.users) {
            currentSearchResults = data.users;
            displaySearchResults(data.users, query);
            enterSearchMode();
        } else {
            alert('Error searching users: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Search error:', error);
        alert('Error searching users');
    });
}

function displaySearchResults(users, query) {
    const searchResults = document.getElementById('search-results-container');
    const searchQueryDisplay = document.getElementById('search-query-display');
    
    searchQueryDisplay.textContent = `Searching for: "${query}"`;
    
    if (users.length === 0) {
        searchResults.innerHTML = '<div class="empty-state">No users found matching your search</div>';
        return;
    }

    searchResults.innerHTML = users.map(user => {
        const displayName = getDisplayName(user.first_name, user.last_name, user.email);
        const initials = getInitials(user.first_name, user.last_name);
        
        let actionButton = '';
        switch(user.relationship_status) {
            case 'none':
                actionButton = `<button class="btn btn-primary" onclick="sendFriendRequestToUser('${user.email}')">Send Request</button>`;
                break;
            case 'sent':
                actionButton = `<button class="btn btn-secondary" onclick="cancelFriendRequest('${user.email}')">Cancel Request</button>`;
                break;
            case 'received':
                actionButton = `<div class="btn-group">
                    <button class="btn btn-success" onclick="acceptRequest('${user.email}')">Accept</button>
                    <button class="btn btn-danger" onclick="declineRequest('${user.email}')">Decline</button>
                </div>`;
                break;
            case 'friends':
                actionButton = `<span class="status-badge">Already Friends</span>`;
                break;
        }
        
        return `
            <div class="search-result-item">
                <div class="user-info">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-details">
                        <div class="user-name">${displayName}</div>
                        <div class="user-email">${user.email}</div>
                    </div>
                </div>
                <div class="user-actions">
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

function enterSearchMode() {
    // Hide tabs and tab panels
    document.querySelector('.tabs-container').style.display = 'none';
    document.querySelectorAll('.tab-panel').forEach(panel => panel.style.display = 'none');
    // Show search page
    document.getElementById('search-page').style.display = 'block';
}

function exitSearchMode() {
    // Hide search page
    document.getElementById('search-page').style.display = 'none';
    // Show tabs and restore active tab panel
    document.querySelector('.tabs-container').style.display = 'block';
    document.querySelectorAll('.tab-panel').forEach(panel => {
        if (panel.classList.contains('active')) {
            panel.style.display = 'block';
        }
    });
    currentSearchResults = [];
}

function sendFriendRequestToUser(email) {
    sendFriendRequestByEmail(email);
}

function sendFriendRequestByEmail(email) {
    fetch('/api/friends/request', {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendEmail: email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            // Refresh search results to update button states
            const searchInput = document.getElementById('search-input-page');
            if (searchInput.value.trim()) {
                searchUsers(searchInput.value.trim());
            }
        }
    })
    .catch(error => {
        console.error('Error sending friend request:', error);
        alert('Error sending friend request');
    });
}

function cancelFriendRequest(email) {
    fetch('/api/friends/cancel', {
        method: 'DELETE',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendEmail: email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            // Refresh search results
            const searchInput = document.getElementById('search-input-page');
            if (searchInput.value.trim()) {
                searchUsers(searchInput.value.trim());
            }
        }
    })
    .catch(error => {
        console.error('Error cancelling friend request:', error);
        alert('Error cancelling friend request');
    });
}

// Friend menu hover functionality
let menuTimeout;

function showFriendMenu(friendId) {
    clearTimeout(menuTimeout);
    const menu = document.getElementById(`menu-${friendId}`);
    if (menu) {
        // Hide all other menus first
        document.querySelectorAll('.friend-submenu.show').forEach(m => {
            if (m.id !== `menu-${friendId}`) {
                m.classList.remove('show');
            }
        });
        
        menu.classList.add('show');
    }
}

function hideFriendMenu(friendId) {
    menuTimeout = setTimeout(() => {
        const menu = document.getElementById(`menu-${friendId}`);
        if (menu) {
            menu.classList.remove('show');
        }
    }, 200); // Small delay to allow moving to menu
}

// Keep menu open when hovering over it
function keepMenuOpen(friendId) {
    clearTimeout(menuTimeout);
}

// Hide menu when leaving it
function hideMenuDelayed(friendId) {
    hideFriendMenu(friendId);
}

// Friend action functions
function pokeFriend(email) {
    alert(`Poked ${email}! 👋`);
    // Close the menu
    document.querySelectorAll('.friend-submenu.show').forEach(menu => {
        menu.classList.remove('show');
    });
}

function blockFriend(email) {
    if (confirm(`Are you sure you want to block ${email}?`)) {
        // Implement block functionality
        alert(`${email} has been blocked.`);
        // Close the menu and refresh friends list
        document.querySelectorAll('.friend-submenu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        loadFriendsData();
    }
}

function reportFriend(email) {
    const reason = prompt(`Report ${email} for:\n\n1. Inappropriate behavior\n2. Spam\n3. Harassment\n4. Other\n\nEnter reason number or custom reason:`);
    
    if (reason) {
        alert(`${email} has been reported. Thank you for keeping our community safe.`);
        // Close the menu
        document.querySelectorAll('.friend-submenu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Navigation buttons
    document.getElementById('dashboardBtn')?.addEventListener('click', () => {
        window.location.href = '/dashboard';
    });
    
    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
        window.location.href = '/leaderboard';
    });
    
    document.getElementById('challengesBtn')?.addEventListener('click', () => {
        window.location.href = '/badges';
    });
    
    // Refresh and logout
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        loadFriendsData();
    });
    
    document.getElementById('logoutButton')?.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    // Friend request functionality
    const sendRequestBtn = document.getElementById('send-request-btn');
    const friendEmailInput = document.getElementById('friend-email-input');
    
    sendRequestBtn?.addEventListener('click', sendFriendRequest);

    friendEmailInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendFriendRequest();
        }
    });

    // Search event listeners
    const searchBtn = document.getElementById('search-btn');
    const friendSearch = document.getElementById('friend-search');
    const searchBtnPage = document.getElementById('search-btn-page');
    const searchInputPage = document.getElementById('search-input-page');

    // Header search bar
    searchBtn?.addEventListener('click', () => {
        const query = friendSearch?.value.trim();
        if (query) {
            searchUsers(query);
            const searchPageInput = document.getElementById('search-input-page');
            if (searchPageInput) searchPageInput.value = query;
        }
    });

    friendSearch?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = friendSearch?.value.trim();
            if (query) {
                searchUsers(query);
                const searchPageInput = document.getElementById('search-input-page');
                if (searchPageInput) searchPageInput.value = query;
            }
        }
    });

    // Search page search bar
    searchBtnPage?.addEventListener('click', () => {
        const query = searchInputPage?.value.trim();
        if (query) {
            searchUsers(query);
        }
    });

    searchInputPage?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInputPage?.value.trim();
            if (query) {
                searchUsers(query);
            }
        }
    });

    // Load friends data when page loads
    loadFriendsData();
});