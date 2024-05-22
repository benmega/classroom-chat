// messageHandling.js

export function setupMessagingAndConversation(messageForm, chatDiv) {
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submitted');
        sendMessage();
    });

    function sendMessage() {
        var message = document.getElementById('message').value;
        var username = document.getElementById('currentUsername').value;

        var params = new URLSearchParams();
        params.append('message', message);
        params.append('username', username);

        fetch('user/send_message', {
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

    setInterval(updateConversation, 2000);

    function updateConversation() {
        fetch('/user/get_conversation')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                chatDiv.innerHTML = '';  // Clear previous content
                data.conversation_history.forEach(function(entry) {
                    var user = entry.username;
                    var message = entry.message;
                    var urlRegex = /(https?:\/\/[^\s]+)|(\bwww\.[^\s]+(?:\.[^\s]+)+\b)/g;
                    message = message.replace(urlRegex, function(url) {
                        return '<a href="' + (url.startsWith('http') ? url : 'http://' + url) + '" target="_blank">' + url + '</a>';
                    });
                    chatDiv.innerHTML += '<p><strong>' + user + ':</strong> ' + message + '</p>';
                });
            })
            .catch(error => {
                console.error('Failed to fetch conversation:', error);
            });
    }
}
