// Open the modal on username form submission
usernameForm.addEventListener('submit', function(e) {
    e.preventDefault();
    openModal();
});

// Close the modal logic
span.onclick = closeModal;
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

function openModal() {
    document.getElementById('passwordInput').value = ''; // Clear the password field
    modal.style.display = "block";
}

function closeModal() {
    modal.style.display = "none";
}


// Handle password submission
submitPasswordBtn.onclick = function() {
    submitPassword();
}

function submitPassword() {
    var password = passwordInput.value;
    var username = usernameInput.value;
    closeModal();
    verifyPassword(username, password);
}

function verifyPassword(username, password) {
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
            currentUsernameInput.value = username;
            alert('Username updated successfully!');
        } else {
            alert("Incorrect password. You are not allowed to change the username.");
            usernameInput.value = currentUsernameInput.value;
        }
    });
}

// Close the modal when the user clicks on <span> (x)
span.onclick = closeModal;

// Close the modal when the user clicks outside of it
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}