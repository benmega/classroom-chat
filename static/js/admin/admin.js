import config from './config.js';

// TODO Connect to rest of code
// Access admin credentials and socket
const ADMIN_USER = config.adminUser;
const ADMIN_PASS = config.adminPass;
const socket = io.connect(config.adminSocket);

socket.on('user_status_change', function(data) {
    const userElement = document.getElementById(`user-${data.user_id}`);
    if (userElement) {
        userElement.getElementsByClassName('status')[0].textContent = data.is_online ? 'Online' : 'Offline';
    }
});

document.addEventListener("DOMContentLoaded", function() {
    if (username === ADMIN_USER) {
        fetchAdminUsers();
    }
});

function fetchAdminUsers() {
    const queryParams = new URLSearchParams({ username: ADMIN_USER, password: ADMIN_PASS });
    fetch(`/admin/users?${queryParams}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch users');
            return response.json();
        })
        .then(displayUsers)
        .catch(error => console.error('Error fetching users:', error));
}

function displayUsers(users) {
    let usersTable = document.getElementById('users-table');
    users.forEach(user => {
        let row = usersTable.insertRow();
        console.log('user display admin.js')
        row.insertCell(0).innerHTML = user.username;
        row.insertCell(1).innerHTML = user.ip_address;
        row.insertCell(2).innerHTML = user.is_online ? 'Online' : 'Offline';  // Display online status
        row.insertCell(3).innerHTML = `<input type="checkbox" ${user.is_ai_teacher ? 'checked' : ''} onchange="toggleAITeacher(${user.id}, this.checked)">`;
        row.insertCell(4).innerHTML = `<button onclick="changeUsername(${user.id})">Change Username</button>`;
    });
}

window.toggleAITeacher = function(userId, isChecked) {
    fetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            username: ADMIN_USER,
            password: ADMIN_PASS,
            is_ai_teacher: isChecked
        })
    }).then(response => {
        if (!response.ok) console.error('Failed to update AI teacher status');
    }).catch(error => console.error('Error updating AI teacher status:', error));
};

window.changeUsername = function(userId) {
    let newUsername = prompt("Enter new username:");
    if (newUsername) {
        fetch(`/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                username: ADMIN_USER,
                password: ADMIN_PASS,
                username: newUsername
            })
        }).then(response => {
            if (!response.ok) console.error('Failed to change username');
        }).catch(error => console.error('Error changing username:', error));
    }
};
