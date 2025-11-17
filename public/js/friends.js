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

    friendsList.innerHTML = friends.map(friend => {
        const emailInitials = getEmailInitials(friend.friend_email);
        return `
            <div class="friend-item">
                <div class="friend-info">
                    <div class="friend-avatar">${emailInitials}</div>
                    <div class="friend-details">
                        <div class="friend-name">${friend.friend_email}</div>
                        <div class="friend-email">Friend</div>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-remove" onclick="removeFriend('${friend.friend_email}')">Remove</button>
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
        return;
    }

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
        return;
    }

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

// Event listeners
sendRequestBtn.addEventListener('click', sendFriendRequest);

friendEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendFriendRequest();
    }
});

// Load friends data when page loads
loadFriendsData();