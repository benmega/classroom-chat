// main.js

import { handleUsernameFormSubmission, closeModalLogic, handlePasswordSubmission } from './usernameLogic.js';

document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById("passwordModal");
    var span = document.getElementsByClassName("close")[0];
    var usernameForm = document.getElementById('usernameForm');
    var messageForm = document.getElementById('messageForm');
    var submitPasswordBtn = document.getElementById('submitPasswordBtn');

    // Attach the imported event handlers
    usernameForm.addEventListener('submit', handleUsernameFormSubmission);
    closeModalLogic(span, modal);
    handlePasswordSubmission(submitPasswordBtn);

    // Handle message sending
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

    // Function to update the conversation
    function updateConversation() {
        fetch('user/get_conversation')
            .then(response => response.json())
            .then(data => {
                var chatDiv = document.getElementById('chat');
                chatDiv.innerHTML = '';
                data.conversation_history.forEach(function(entry) {
                    var user = entry[0];
                    var message = entry[1];
                    // Convert URLs to clickable links
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
