    // Event listener for username form submission
    document.getElementById('usernameForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var username = document.getElementById('username').value;
        document.getElementById('currentUsername').value = username;
    });

    // Event listener for message form submission
    document.getElementById('messageForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var message = document.getElementById('message').value;
        var username = document.getElementById('currentUsername').value;

        // Check if username is set
        if (!username) {
            alert("Please set your username first!");
            return;
        }
        var params = new URLSearchParams();
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
    });

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