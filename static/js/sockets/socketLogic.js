import config from '../config.js';
const serverEndpoint = config.serverEndpoint;
console.log(config.serverEndpoint);
export const socket = io.connect(serverEndpoint);



socket.on('user_status_change', (data) => {
    console.log('User status change received:', data);
    const userElement = document.getElementById(`user-${data.user_id}`);
    if (userElement) {
        const statusElement = userElement.getElementsByClassName('status')[0];
        if (statusElement) {
            statusElement.textContent = data.is_online ? 'Online' : 'Offline';
        } else {
            console.error('Status element not found for user:', data.user_id);
        }
    } else {
        console.error('User element not found for:', data.user_id);
    }
});

socket.on('new_message', function(data) {
    // Assume data contains { username: string, content: string, timestamp: string }
    sendMessage();
    const chatDiv = document.getElementById('chat'); // ID of your chat container
    if (chatDiv) {
        const newMessageElement = document.createElement('p');
        const userSpan = document.createElement('span');
        userSpan.textContent = `${data.username} [${new Date(data.timestamp).toLocaleTimeString()}]: `;
        const messageSpan = document.createElement('span');
        messageSpan.textContent = data.content;

        // Append new message to the chat div
        newMessageElement.appendChild(userSpan);
        newMessageElement.appendChild(messageSpan);
        chatDiv.appendChild(newMessageElement);

        // Auto-scroll to the latest message
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
});

//socket.on('connect', () => {
//    console.log('Connected to general namespace successfully');
//});
//
//socket.on('disconnect', () => {
//    console.log('Disconnected from admin namespace');
//});

socket.on('error', (error) => {
    console.error('Socket error:', error);
});