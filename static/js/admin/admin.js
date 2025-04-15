// Toggle AI Teacher
document.getElementById('toggle-ai-button').addEventListener('click', function() {
    fetch(window.urls.toggleAiUrl, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);  // Assuming the response contains a message
        // Optionally update button text here based on the new status
    })
    .catch(error => { console.error('Error:', error); });
});

// Start a new conversation
document.getElementById('start-conversation-button').addEventListener('click', function() {
    fetch(window.urls.startConversationUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams()  // Empty body, you can add parameters if needed
    })
    .then(response => response.json())
    .then(data => {
        alert(`Conversation started: ${data.title}`);
    })
    .catch(error => { console.error('Error:', error); });
});

// Toggle Message Sending
document.getElementById('toggle-message-sending-button').addEventListener('click', function() {
    fetch(window.urls.toggleMessageSendingUrl, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);  // Assuming the response contains a message
        // Optionally update button text here based on the new status
    })
    .catch(error => { console.error('Error:', error); });
});

// Ban a word
document.getElementById('add-banned-word-button').addEventListener('click', function() {
    const word = document.getElementById('ban-word').value;
    const reason = document.getElementById('ban-reason').value;

    fetch(window.urls.addBannedWordUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            'word': word,
            'reason': reason
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message); // Assuming the response contains a message
    })
    .catch(error => { console.error('Error:', error); });
});

// Adjust Ducks
document.getElementById('update-ducks-button').addEventListener('click', function() {
    const username = document.getElementById('duck-username').value;
    const amount = document.getElementById('duck-amount').value;

    fetch(window.urls.adjustDucksUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            'username': username,
            'amount': amount
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message); // Assuming the response contains a message
    })
    .catch(error => { console.error('Error:', error); });
});

// Create User
document.getElementById('create-user-button').addEventListener('click', function() {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('create-password').value;
    const ducks    = parseInt(document.getElementById('new-ducks').value, 10);

    // client‑side username rules: 3–30 chars, lowercase alnum + underscore
    const unameRe = /^[a-z0-9_]{3,30}$/;
    if (!unameRe.test(username)) {
        return alert('Username must be 3–30 chars, lowercase letters, numbers, or underscores only.');
    }
    if (!password || isNaN(ducks) || ducks < 0) {
        return alert('Please fill in all fields correctly.');
    }

    fetch(window.urls.createUserUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({username, password, ducks})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            document.getElementById('new-username').value = '';
            document.getElementById('create-password').value = '';
            document.getElementById('new-ducks').value = 0;
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error('Error creating user:', err);
        alert('An unexpected error occurred.');
    });
});

document.getElementById('remove-user-button').addEventListener('click', function() {
    const username = document.getElementById('remove-username').value;

    if (!username) {
        alert('Please enter a username');
        return;
    }

    if (confirm('Are you sure you want to remove this user? This cannot be undone.')) {
        // Create FormData object
        const formData = new FormData();
        formData.append('username', username);

        // Send AJAX request with form data
        fetch('/admin/remove_user', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('User removed successfully');
                document.getElementById('remove-username').value = '';
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while removing the user');
        });
    }
});

function replaceDuckEmojis() {
    document.querySelectorAll('*').forEach(el => {
        el.childNodes.forEach(node => {
            if (node.nodeType === 3 && node.nodeValue.includes("🦆")) {
                const parts = node.nodeValue.split("🦆");
                const fragment = document.createDocumentFragment();

                parts.forEach((text, index) => {
                    fragment.appendChild(document.createTextNode(text));
                    if (index < parts.length - 1) {
                        const img = document.createElement('img');
                        img.src = "/static/images/rubber_duck.jpg";
                        img.alt = "Rubber Duck";
                        img.className = "emoji";
                        fragment.appendChild(img);
                    }
                });

                el.replaceChild(fragment, node);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', replaceDuckEmojis);
