// Get the modal and elements

document.addEventListener('DOMContentLoaded', function() {
var modal = document.getElementById("passwordModal");
var span = document.getElementsByClassName("close")[0];
var usernameInput = document.getElementById('username');
var passwordInput = document.getElementById('passwordInput');
var currentUsernameInput = document.getElementById('currentUsername');
var usernameForm = document.getElementById('usernameForm');
var messageForm = document.getElementById('messageForm');
var submitPasswordBtn = document.getElementById('submitPasswordBtn');

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

// Handle password submission
submitPasswordBtn.onclick = function() {
    submitPassword();
}

// Handle message sending
messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Form submitted');
    sendMessage();
});

function openModal() {
    document.getElementById('passwordInput').value = ''; // Clear the password field
    modal.style.display = "block";
}

function closeModal() {
    modal.style.display = "none";
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

function sendMessage() {
    var message = document.getElementById('message').value;
    var username = currentUsernameInput.value;

    var params = new URLSearchParams();
    // e.preventDefault();
    params.append('message', message);
    params.append('username', username);

    fetch('/send_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
    }).then(function(response) {
        if (response.ok) {
            document.getElementById('message').value = '';
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

// Example listener for submitting the password form within the modal
// document.getElementById('submitPasswordBtn').addEventListener('click', submitPassword);

// Function to update the conversation
function updateConversation() {
    fetch('/get_conversation')
        .then(response => response.json())
        .then(data => {
            var chatDiv = document.getElementById('chat');
            chatDiv.innerHTML = '';
            data.conversation_history.forEach(function(entry) {
                var user = entry[0];
                var message = entry[1];
                // Convert URLs to clickable links
                //var urlRegex = /(https?:\/\/[^\s]+)/g;
                var urlRegex = /(https?:\/\/[^\s]+)|(\bwww\.[^\s]+(?:\.[^\s]+)+\b)/g;
                message = message.replace(urlRegex, function(url) {
                    return '<a href="' + url + '" target="_blank">' + url + '</a>';
                });
                chatDiv.innerHTML += '<p><strong>' + user + ':</strong> ' + message + '</p>';
            });
        });
}

// Set an interval to update the conversation every 2 seconds
setInterval(updateConversation, 2000);

});