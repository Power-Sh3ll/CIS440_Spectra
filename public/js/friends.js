// Check if user is logged in
const token = localStorage.getItem('jwtToken');
if (!token) {
    window.location.href = '/';
}

// DOM elements
const friendsList = document.getElementById('friends-list');
const receivedRequests = document.getElementById('received-requests');
const sentRequests = document.getElementById('sent-requests');
const friendEmailInput = document.getElementById('friend-email-input');
const sendRequestBtn = document.getElementById('send-request-btn');
const searchInput = document.getElementById('friend-search');
const searchInputPage = document.getElementById('search-input-page');
const searchBtnPage = document.getElementById('search-btn-page');
const searchPage = document.getElementById('search-page');
const searchResultsContainer = document.getElementById('search-results-container');
const searchQueryDisplay = document.getElementById('search-query-display');
const friendsCountEl = document.getElementById('friends-count');
const requestsCountEl = document.getElementById('requests-count');
const sentCountEl = document.getElementById('sent-count');

// Store friends data for search functionality
let friendsData = [];
let allUsers = []; // For search functionality
let isSearchMode = false;

// Tab functionality
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and panels
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            const targetPanel = document.getElementById(targetTab + '-panel');
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// Search functionality
if (searchInput) {
    // Add search button functionality
    const searchBtn = document.getElementById('search-btn');
    
    // Search on input with debounce - only filter friends, don't auto-search
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const searchTerm = this.value.toLowerCase().trim();
        
        // Clear previous timeout
        searchTimeout = setTimeout(() => {
            if (searchTerm.length === 0) {
                // If search is empty and we're in search mode, exit search mode
                if (isSearchMode) {
                    exitSearchMode();
                } else {
                    // If search is empty, show original content based on active tab
                    const activeTabBtn = document.querySelector('.tab-btn.active');
                    if (activeTabBtn) {
                        const activeTab = activeTabBtn.getAttribute('data-tab');
                        if (activeTab === 'friends') {
                            renderFriends(friendsData);
                        }
                    }
                }
            } else if (searchTerm.length >= 2) {
                // Only filter existing friends on the friends tab, don't auto-search
                const activeTabBtn = document.querySelector('.tab-btn.active');
                if (activeTabBtn) {
                    const activeTab = activeTabBtn.getAttribute('data-tab');
                    if (activeTab === 'friends' && friendsData.length > 0 && !isSearchMode) {
                        filterFriends(searchTerm);
                    }
                    // Don't auto-enter search mode - user must click search button or press Enter
                }
            }
        }, 300); // 300ms debounce
    });
    
    // Search on button click
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            if (searchTerm.length >= 2) {
                enterSearchMode(searchTerm);
            }
        });
    }
    
    // Search on enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.toLowerCase().trim();
            if (searchTerm.length >= 2) {
                enterSearchMode(searchTerm);
            }
        }
    });
}

// Search page functionality
if (searchInputPage) {
    // Search on input with debounce
    let searchPageTimeout;
    searchInputPage.addEventListener('input', function() {
        clearTimeout(searchPageTimeout);
        const searchTerm = this.value.toLowerCase().trim();
        
        searchPageTimeout = setTimeout(() => {
            if (searchTerm.length >= 2) {
                searchUsers(searchTerm);
                updateSearchQueryDisplay(searchTerm);
            }
        }, 300);
    });
    
    // Search on button click
    if (searchBtnPage) {
        searchBtnPage.addEventListener('click', function() {
            const searchTerm = searchInputPage.value.toLowerCase().trim();
            if (searchTerm.length >= 2) {
                searchUsers(searchTerm);
                updateSearchQueryDisplay(searchTerm);
            }
        });
    }
    
    // Search on enter key
    searchInputPage.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.toLowerCase().trim();
            if (searchTerm.length >= 2) {
                searchUsers(searchTerm);
                updateSearchQueryDisplay(searchTerm);
            }
        }
    });
}

// Enter search mode
function enterSearchMode(searchTerm) {
    isSearchMode = true;
    
    // Hide the friends header when entering search mode
    const friendsHeader = document.querySelector('.friends-header');
    if (friendsHeader) friendsHeader.style.display = 'none';
    
    // Hide tabs and normal content
    const tabsContainer = document.querySelector('.tabs-container');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    if (tabsContainer) tabsContainer.style.display = 'none';
    tabPanels.forEach(panel => panel.style.display = 'none');
    
    // Show search page
    if (searchPage) {
        searchPage.style.display = 'block';
        if (searchInputPage) {
            searchInputPage.value = searchTerm;
        }
        updateSearchQueryDisplay(searchTerm);
        searchUsers(searchTerm);
    }
}

// Exit search mode
function exitSearchMode() {
    isSearchMode = false;
    
    // Show the friends header when exiting search mode
    const friendsHeader = document.querySelector('.friends-header');
    if (friendsHeader) friendsHeader.style.display = 'block';
    
    // Show tabs and normal content
    const tabsContainer = document.querySelector('.tabs-container');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    if (tabsContainer) tabsContainer.style.display = 'block';
    
    // Hide search page
    if (searchPage) {
        searchPage.style.display = 'none';
    }
    
    // Show the currently active tab
    const activeTabBtn = document.querySelector('.tab-btn.active');
    if (activeTabBtn) {
        const activeTab = activeTabBtn.getAttribute('data-tab');
        const activePanel = document.getElementById(activeTab + '-panel');
        if (activePanel) {
            activePanel.style.display = 'block';
        }
    }
    
    // Clear search inputs
    if (searchInput) searchInput.value = '';
    if (searchInputPage) searchInputPage.value = '';
    
    // Restore original content
    if (activeTabBtn) {
        const activeTab = activeTabBtn.getAttribute('data-tab');
        if (activeTab === 'friends') {
            renderFriends(friendsData);
        } else {
            // Reload the current tab data
            loadFriendsData();
        }
    }
}

// Update search query display
function updateSearchQueryDisplay(searchTerm) {
    if (searchQueryDisplay) {
        searchQueryDisplay.textContent = `Searching for: "${searchTerm}"`;
    }
}

function filterFriends(searchTerm) {
    const friendCards = document.querySelectorAll('.friend-card');
    friendCards.forEach(card => {
        const name = card.querySelector('.friend-name-large')?.textContent.toLowerCase() || '';
        const email = card.querySelector('.friend-email-large')?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Search for users via API
async function searchUsers(searchTerm) {
    try {
        // Show loading state in search results container
        if (searchResultsContainer) {
            searchResultsContainer.innerHTML = '<div class="loading">Searching users...</div>';
        } else {
            // Fallback for non-search mode
            const activePanel = document.querySelector('.tab-panel.active');
            if (activePanel) {
                const gridContainer = activePanel.querySelector('.friends-grid, .requests-grid') || activePanel;
                gridContainer.innerHTML = '<div class="loading">Searching users...</div>';
            }
        }

        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to search users');
        }

        const data = await response.json();
        renderSearchResults(data.users, searchTerm);
        
    } catch (error) {
        console.error('Error searching users:', error);
        if (searchResultsContainer) {
            searchResultsContainer.innerHTML = '<div class="error-state">Error searching users. Please try again.</div>';
        } else {
            const activePanel = document.querySelector('.tab-panel.active');
            if (activePanel) {
                const gridContainer = activePanel.querySelector('.friends-grid, .requests-grid') || activePanel;
                gridContainer.innerHTML = '<div class="error-state">Error searching users. Please try again.</div>';
            }
        }
    }
}

// Render search results
function renderSearchResults(users, searchTerm) {
    const targetContainer = searchResultsContainer || 
        document.querySelector('.tab-panel.active .friends-grid, .tab-panel.active .requests-grid') || 
        document.querySelector('.tab-panel.active');
    
    if (!targetContainer) return;
    
    if (users.length === 0) {
        targetContainer.innerHTML = `
            <div class="empty-state">
                <h3>No users found</h3>
                <p>No users match "${searchTerm}". Try a different search term.</p>
                ${isSearchMode ? '' : '<button class="btn btn-secondary" onclick="clearSearch()">Clear Search</button>'}
            </div>
        `;
        return;
    }

    const usersHTML = users.map(user => {
        const email = user.email;
        const firstName = user.first_name;
        const lastName = user.last_name;
        const initials = getInitials(firstName, lastName, email);
        const displayName = firstName && lastName ? `${firstName} ${lastName}` : email;
        const status = user.relationship_status;
        
        let actionButton = '';
        switch (status) {
            case 'none':
                actionButton = `<button class="btn btn-send" onclick="sendFriendRequestToUser('${email}')">Send Request</button>`;
                break;
            case 'sent':
                actionButton = `<button class="btn btn-cancel" onclick="cancelFriendRequest('${email}')">Cancel Request</button>`;
                break;
            case 'received':
                actionButton = `<button class="btn btn-accept" onclick="acceptFriendRequest('${email}')">Accept Request</button>`;
                break;
            case 'friends':
                actionButton = `<button class="btn btn-secondary" disabled>Already Friends</button>`;
                break;
        }
        
        return `
            <div class="friend-card search-result" data-email="${email}">
                <div class="friend-avatar-large">${initials}</div>
                <div class="friend-name-large">${displayName}</div>
                <div class="friend-email-large">${email}</div>
                <div class="friend-actions">
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');

    if (isSearchMode) {
        // In search mode, just show the results without header
        targetContainer.innerHTML = `<div class="friends-grid">${usersHTML}</div>`;
    } else {
        // In normal mode, show with search header
        targetContainer.innerHTML = `
            <div class="search-header">
                <h3>Search Results for "${searchTerm}"</h3>
                <button class="btn btn-secondary" onclick="clearSearch()">Clear Search</button>
            </div>
            <div class="friends-grid">
                ${usersHTML}
            </div>
        `;
    }
}

// Clear search and restore original view
function clearSearch() {
    if (isSearchMode) {
        exitSearchMode();
    } else {
        searchInput.value = '';
        const activeTabBtn = document.querySelector('.tab-btn.active');
        if (activeTabBtn) {
            const activeTab = activeTabBtn.getAttribute('data-tab');
            if (activeTab === 'friends') {
                renderFriends(friendsData);
            } else {
                // Reload the current tab data
                loadFriendsData();
            }
        }
    }
}

// Send friend request from search results
async function sendFriendRequestToUser(email) {
    try {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendEmail: email })
        });

        if (!response.ok) {
            throw new Error('Failed to send friend request');
        }

        // Update the button to show request sent
        const userCard = document.querySelector(`[data-email="${email}"]`);
        if (userCard) {
            const actionButton = userCard.querySelector('.btn');
            if (actionButton) {
                actionButton.textContent = 'Request Sent';
                actionButton.className = 'btn btn-pending';
                actionButton.disabled = true;
            }
        }

        // Show success message
        alert('Friend request sent successfully!');
        
    } catch (error) {
        console.error('Error sending friend request:', error);
        alert('Failed to send friend request. Please try again.');
    }
}

// Load all friends data
async function loadFriendsData() {
    console.log('Starting to load friends data...');
    console.log('Token exists:', !!token);
    console.log('Elements found:', {
        friendsList: !!friendsList,
        receivedRequests: !!receivedRequests,
        sentRequests: !!sentRequests
    });
    
    try {
        const response = await fetch('/api/friends', {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error('Failed to fetch friends data: ' + errorText);
        }

        const data = await response.json();
        console.log('Friends data received:', data);

        renderFriends(data.friends || []);
        renderReceivedRequests(data.receivedRequests || []);
        renderSentRequests(data.sentRequests || []);
        
        // Store data for search functionality
        friendsData = data.friends || [];
        
        // Update counts
        updateCounts(
            (data.friends || []).length, 
            (data.receivedRequests || []).length, 
            (data.sentRequests || []).length
        );
    } catch (error) {
        console.error('Error loading friends data:', error);
        if (friendsList) friendsList.innerHTML = '<div class="empty-state">Error loading friends: ' + error.message + '</div>';
        if (receivedRequests) receivedRequests.innerHTML = '<div class="empty-state">Error loading requests: ' + error.message + '</div>';
        if (sentRequests) sentRequests.innerHTML = '<div class="empty-state">Error loading sent requests: ' + error.message + '</div>';
    }
}

function updateCounts(friendsCount, requestsCount, sentCount = 0) {
    if (friendsCountEl) friendsCountEl.textContent = friendsCount;
    if (requestsCountEl) requestsCountEl.textContent = requestsCount;
    if (sentCountEl) sentCountEl.textContent = sentCount;
}

// Render current friends with modern card layout and 3-dot menu
function renderFriends(friends) {
    console.log('renderFriends called with:', friends);
    console.log('friendsList element:', friendsList);
    
    if (!friendsList) {
        console.error('friendsList element not found!');
        return;
    }
    
    if (!friends || friends.length === 0) {
        friendsList.innerHTML = '<div class="empty-state">No friends yet. Send some friend requests to get started!</div>';
        return;
    }

    const friendsHTML = friends.map(friend => {
        console.log('Processing friend:', friend);
        
        const email = friend.friend_email;
        const firstName = friend.first_name;
        const lastName = friend.last_name;
        
        const initials = getInitials(firstName, lastName, email);
        const displayName = firstName && lastName ? 
            `${firstName} ${lastName}` : (email || 'Unknown User');
        
        return `
            <div class="friend-card" data-email="${email || ''}">
                <div class="friend-menu">
                    <button class="menu-trigger" onclick="toggleMenu(this)">⋮</button>
                    <div class="menu-dropdown">
                        <button class="menu-item" onclick="pokeFriend('${email || ''}')">👋 Poke</button>
                        <button class="menu-item" onclick="unfriendUser('${email || ''}')">👥 Unfriend</button>
                        <button class="menu-item danger" onclick="blockUser('${email || ''}')">🚫 Block</button>
                        <button class="menu-item danger" onclick="reportUser('${email || ''}')">⚠️ Report</button>
                    </div>
                </div>
                <div class="friend-avatar-large">${initials}</div>
                <div class="friend-name-large">${displayName}</div>
                <div class="friend-email-large">${email || 'No email'}</div>
            </div>
        `;
    }).join('');
    
    console.log('Setting friendsList.innerHTML to:', friendsHTML.substring(0, 100) + '...');
    friendsList.innerHTML = friendsHTML;
}

// Menu toggle functionality
function toggleMenu(trigger) {
    const dropdown = trigger.nextElementSibling;
    const allDropdowns = document.querySelectorAll('.menu-dropdown');
    
    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('active');
        }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('active');
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// Friend action functions
async function pokeFriend(email) {
    alert('Poke sent to ' + email + '! 👋');
}

async function unfriendUser(email) {
    if (!confirm('Are you sure you want to unfriend this person?')) return;
    removeFriend(email);
}

async function blockUser(email) {
    if (!confirm('Are you sure you want to block this user? This will remove them from your friends list.')) return;
    alert('User blocked: ' + email);
    removeFriend(email);
}

async function reportUser(email) {
    const reason = prompt('Please provide a reason for reporting this user:');
    if (!reason) return;
    alert('Thank you for the report. We will review this user: ' + email);
}

// Remove friend function
async function removeFriend(friendEmail) {
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

// Enhanced search functionality  
function filterFriends(searchTerm) {
    const friendCards = document.querySelectorAll('.friend-card');
    friendCards.forEach(card => {
        const name = card.querySelector('.friend-name-large')?.textContent.toLowerCase() || '';
        const email = card.querySelector('.friend-email-large')?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Helper function to get initials
function getInitials(firstName, lastName, email) {
    // Check if we have valid firstName and lastName
    if (firstName && typeof firstName === 'string' && 
        lastName && typeof lastName === 'string') {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    
    // Check if we have a valid email as fallback
    if (email && typeof email === 'string' && email.length > 0) {
        return email.charAt(0).toUpperCase();
    }
    
    // Final fallback
    return 'U';
}

// Render received friend requests with new card layout
function renderReceivedRequests(requests) {
    console.log('Rendering received requests:', requests);
    
    if (requests.length === 0) {
        receivedRequests.innerHTML = '<div class="empty-state">No pending friend requests</div>';
        return;
    }

    receivedRequests.innerHTML = requests.map(request => {
        const initials = getInitials(request.first_name, request.last_name, request.requester_email);
        return `
            <div class="request-card">
                <div class="request-avatar">${initials}</div>
                <div class="request-info">
                    <div class="request-name">${request.first_name && request.last_name ? 
                        `${request.first_name} ${request.last_name}` : request.requester_email}</div>
                    <div class="request-email">${request.requester_email}</div>
                </div>
                <div class="request-actions">
                    <button class="btn btn-accept" onclick="acceptRequest('${request.requester_email}')">
                        Accept
                    </button>
                    <button class="btn btn-decline" onclick="declineRequest('${request.requester_email}')">
                        Decline
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Render sent friend requests with new card layout
function renderSentRequests(requests) {
    if (requests.length === 0) {
        sentRequests.innerHTML = '<div class="empty-state">No pending sent requests</div>';
        return;
    }

    sentRequests.innerHTML = requests.map(request => {
        const initials = getInitials(request.first_name, request.last_name, request.recipient_email);
        return `
            <div class="request-card">
                <div class="friend-menu">
                    <button class="menu-trigger" onclick="toggleMenu(this)">⋮</button>
                    <div class="menu-dropdown">
                        <button class="menu-item danger" onclick="cancelFriendRequest('${request.recipient_email}')">❌ Cancel Request</button>
                    </div>
                </div>
                <div class="request-avatar">${initials}</div>
                <div class="request-info">
                    <div class="request-name">${request.first_name && request.last_name ? 
                        `${request.first_name} ${request.last_name}` : request.recipient_email}</div>
                    <div class="request-email">Request pending</div>
                </div>
                <div class="request-actions">
                    <div class="pending-status">Pending...</div>
                </div>
            </div>
        `;
    }).join('');
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

// Cancel sent friend request
async function cancelFriendRequest(email) {
    try {
        const response = await fetch('/api/friends/cancel', {
            method: 'DELETE',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendEmail: email })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Friend request cancelled successfully');
            loadFriendsData(); // Reload to show updated data
        } else {
            alert(data.message || 'Error cancelling friend request');
        }
    } catch (error) {
        console.error('Error cancelling friend request:', error);
        alert('Error cancelling friend request');
    }
}

// Event listeners
if (sendRequestBtn) {
    sendRequestBtn.addEventListener('click', sendFriendRequest);
}

if (friendEmailInput) {
    friendEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendFriendRequest();
        }
    });
}

// Initialize when DOM is loaded
console.log('Script loaded, document.readyState:', document.readyState);

if (document.readyState === 'loading') {
    console.log('DOM still loading, adding event listener...');
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOMContentLoaded fired!');
        initializeTabs();
        loadFriendsData();
    });
} else {
    console.log('DOM already loaded, initializing immediately...');
    initializeTabs();
    loadFriendsData();
}