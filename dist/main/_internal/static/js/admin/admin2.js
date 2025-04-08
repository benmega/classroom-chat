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
