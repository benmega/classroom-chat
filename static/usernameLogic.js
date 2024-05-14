// usernameLogic.js

// Open the modal on username form submission
export function handleUsernameFormSubmission(e) {
    e.preventDefault();
    openModal();
}

// Close the modal logic
export function closeModalLogic(span, modal) {
    span.onclick = closeModal;
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
}

export function openModal() {
    document.getElementById('passwordInput').value = ''; // Clear the password field
    document.getElementById('passwordModal').style.display = "block";
}

export function closeModal() {
    document.getElementById('passwordModal').style.display = "none";
}

// Handle password submission
export function handlePasswordSubmission(submitPasswordBtn) {
    submitPasswordBtn.onclick = function() {
        submitPassword();
    }
}

export function submitPassword() {
    var password = document.getElementById('passwordInput').value;
    var username = document.getElementById('username').value;
    closeModal();
    verifyPassword(username, password);
}

export function verifyPassword(username, password) {
    var params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    fetch('/verify_password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('currentUsername').value = username;
            alert('Username updated successfully!');
        } else {
            alert("Incorrect password. You are not allowed to change the username.");
            document.getElementById('username').value = document.getElementById('currentUsername').value;
        }
    });
}
