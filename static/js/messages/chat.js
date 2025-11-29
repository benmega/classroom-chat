/*
File: chat.js
Type: js
Summary: Client-side chat input handling and submit-on-enter behavior.
*/

export function initChat(username) {
    const form = document.getElementById('messageForm');
    const messageInput = document.getElementById('message');

    messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            if (e.ctrlKey || e.metaKey) {
                const cursorPos = messageInput.selectionStart;
                const value = messageInput.value;
                messageInput.value = value.slice(0, cursorPos) + '\n' + value.slice(cursorPos);
                messageInput.selectionStart = messageInput.selectionEnd = cursorPos + 1;
                e.preventDefault();
            } else {
                e.preventDefault();
                form.requestSubmit();
            }
        }
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) return;
        messageInput.value = '';
        console.log(`[Send] ${username}: ${message}`);
    });
}
