// messageHandling.js

export function updateConversation() {
        fetch('/user/get_conversation')  // Ensure the path is absolute or correctly relative
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                var chatDiv = document.getElementById('chat');
                if (!chatDiv) {
                    console.error('Chat div not found');
                    return;
                }
                chatDiv.innerHTML = '';  // Clear previous content

                data.conversation_history.forEach(function(entry) {
                    var user = entry.username;   // Assuming the object has 'username'
                    var message = entry.message; // Assuming the object has 'message'

                    // Convert URLs to clickable links
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

export function sendMessage() {
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
    })
    .then(function(response) {
        return response.json();  // Parse the JSON response
    })
    .then(function(data) {
        if (data.success) {
            document.getElementById('message').value = '';
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
        alert('An unexpected error occurred.');
    });
}



//export function sendMessage() {
//    var message = document.getElementById('message').value;
//    var username = document.getElementById('currentUsername').value;
//
//    var params = new URLSearchParams();
//    params.append('message', message);
//    params.append('username', username);
//
//    fetch('user/send_message', {
//        method: 'POST',
//        headers: {
//            'Content-Type': 'application/x-www-form-urlencoded',
//        },
//        body: params
//    }).then(function(response) {
//        if (response.ok) {
//            document.getElementById('message').value = '';
//        }
//    });
//}


export function setupMessagingAndConversation() {
    // Define function to send messages
    // Define function to update conversations
    messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Form submitted cool');
    sendMessage();
    updateConversation();
    });
    // Set an interval to update the conversation every 2 seconds
    setInterval(updateConversation, 2000);
}