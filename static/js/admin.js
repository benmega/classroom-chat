document.addEventListener("DOMContentLoaded", function() {
    if (username === 'Mr. Mega') {
        fetch('/admin/users?username=Mr. Mega&password=1234')
            .then(response => response.json())
            .then(data => {
                let usersTable = document.getElementById('users-table');
                data.forEach(user => {
                    let row = usersTable.insertRow();
                    row.insertCell(0).innerHTML = user.username;
                    row.insertCell(1).innerHTML = user.ip_address;
                    row.insertCell(2).innerHTML = `<input type="checkbox" ${user.is_ai_teacher ? 'checked' : ''} onclick="toggleAITeacher(${user.id}, this.checked)">`;
                    row.insertCell(3).innerHTML = `<button onclick="changeUsername(${user.id})">Change Username</button>`;
                });
            });

        window.toggleAITeacher = function(userId, isChecked) {
            fetch(`/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: 'Mr. Mega',
                    password: '1234',
                    is_ai_teacher: isChecked
                })
            });
        };

        window.changeUsername = function(userId) {
            let newUsername = prompt("Enter new username:");
            if (newUsername) {
                fetch(`/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        username: 'Mr. Mega',
                        password: '1234',
                        username: newUsername
                    })
                });
            }
        };
    }
});
