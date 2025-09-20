// main.js

import { handleUsernameFormSubmission, closeModalLogic, handlePasswordSubmission, setupUsernameLogic } from './users/usernameLogic.js';
import { socket } from './sockets/socketLogic.js';  // Import the socket instance
import { setupSocketConnection, setupSocket } from './sockets/socketManager.js';
import { setupMessagingAndConversation, sendMessage, updateConversation } from './messages/messageHandling.js';
import { initChat } from './messages/chat.js';
import { initAchievements } from './achievements/achievements.js';


document.addEventListener('DOMContentLoaded', async function() {
//    setupUsernameLogic();
    await setupSocket();
    setupMessagingAndConversation();
    const usernameEl = document.getElementById('currentUsername');
    const username = usernameEl.dataset.username;

    initChat(username);
    initAchievements(username);
});
