// main.js

import { handleUsernameFormSubmission, closeModalLogic, handlePasswordSubmission } from './usernameLogic.js';
import { socket } from './socketLogic.js';  // Import the socket instance
import { setupSocketConnection } from './socketManager.js';


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

    try {
        const socket = await setupSocketConnection();
        console.log('Socket setup complete.');
    } catch (error) {
        console.error('Failed to set up socket connection:', error);
    }
    // Set up messaging and conversation updates
    setupMessagingAndConversation();

    setupSocketListeners();

    function setupMessagingAndConversation() {
        // Define function to send messages
        // Define function to update conversations
        messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submitted');
        sendMessage();
        });
    }


    function setupSocketListeners() {
        socket.on('new_message', function(data) {
            // Handle new messages if needed
        });
    }

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

    // Set an interval to update the conversation every 2 seconds
    setInterval(updateConversation, 2000);
});
