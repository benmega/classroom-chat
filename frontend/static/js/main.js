/*
File: main.js
Type: js
Summary: Main frontend bootstrap for sockets, chat, and achievements.
*/

import { setupSocket } from './sockets/socketManager.js';
import { setupMessagingAndConversation } from './messages/messageHandling.js';
import { initAchievements } from './achievements/achievements.js';


document.addEventListener('DOMContentLoaded', async function() {
    await setupSocket();
    setupMessagingAndConversation();
    initAchievements();
});
