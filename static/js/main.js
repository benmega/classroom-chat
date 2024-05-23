// main.js

import { handleUsernameFormSubmission, closeModalLogic, handlePasswordSubmission } from './users/usernameLogic.js';
import { socket } from './sockets/socketLogic.js';  // Import the socket instance
import { setupSocketConnection } from './sockets/socketManager.js';
import { setupMessagingAndConversation, sendMessage, updateConversation } from './messages/messageHandling.js';


document.addEventListener('DOMContentLoaded', async function() {

    // TODO move to username Logic. or are these arguments?
    var modal = document.getElementById("passwordModal");
    var span = document.getElementsByClassName("close")[0];
    var usernameForm = document.getElementById('usernameForm');
    var submitPasswordBtn = document.getElementById('submitPasswordBtn');

    // Attach the imported event handlers
    usernameForm.addEventListener('submit', handleUsernameFormSubmission);
    closeModalLogic(span, modal);
    handlePasswordSubmission(submitPasswordBtn);

    //TODO move to sockets
    try {
        const socket = await setupSocketConnection();
        console.log('Socket setup complete.');
    } catch (error) {
        console.error('Failed to set up socket connection:', error);
    }

    //TODO figure out why this line is not need. I think messagehandling should need it
    //var messageForm = document.getElementById('messageForm');
    // Set up messaging and conversation updates

    // Set an interval to update the conversation every 2 seconds
    setInterval(updateConversation, 2000);



    // setupSocketListeners();

    setupMessagingAndConversation();

//    // TODO Move to messages
//    function setupMessagingAndConversation() {
//        // Define function to send messages
//        // Define function to update conversations
//        messageForm.addEventListener('submit', function(e) {
//        e.preventDefault();
//        console.log('Form submitted no cool');
//        sendMessage();
//        updateConversation();
//        });
//    }


});
