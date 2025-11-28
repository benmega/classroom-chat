function postForm(url, data) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data)
    }).then(res => res.json());
}

function postEmpty(url) {
    return fetch(url, { method: 'POST'     }).then(res => res.json());
}

function showAlert(message, type = 'info') {
    const autoClose = type !== 'error' && type !== 'warning';
    Swal.fire({
        icon: type,
        text: message,
        timer: autoClose ? 1000 : undefined,
        timerProgressBar: autoClose,
        showConfirmButton: !autoClose
    });
}

document.getElementById('toggle-ai-button')?.addEventListener('click', () => {
    postEmpty(window.urls.toggleAiUrl)
        .then(data => showAlert(data.message, 'success'))
        .catch(console.error);
});

document.getElementById('start-conversation-button')?.addEventListener('click', () => {
    postForm(window.urls.startConversationUrl, {})
        .then(data => showAlert(`Conversation started: ${data.title}`, 'success'))
        .catch(console.error);
});

document.getElementById('toggle-message-sending-button')?.addEventListener('click', () => {
    postEmpty(window.urls.toggleMessageSendingUrl)
        .then(data => showAlert(data.message, 'success'))
        .catch(console.error);
});

document.getElementById('add-banned-word-button')?.addEventListener('click', () => {
    const word = document.getElementById('ban-word').value;
    const reason = document.getElementById('ban-reason').value;

    postForm(window.urls.addBannedWordUrl, { word, reason })
        .then(data => showAlert(data.message, 'success'))
        .catch(console.error);
});

document.getElementById('update-ducks-button')?.addEventListener('click', () => {
    const username = document.getElementById('duck-username').value;
    const amount = document.getElementById('duck-amount').value;

    postForm(window.urls.adjustDucksUrl, { username, amount })
        .then(data => showAlert(data.message, 'success'))
        .catch(console.error);
});

document.getElementById('create-user-button')?.addEventListener('click', () => {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('create-password').value;
    const ducks = parseInt(document.getElementById('new-ducks').value, 10);

    const validUsername = /^[a-z0-9_]{3,30}$/.test(username);
    if (!validUsername) return showAlert('Username must be 3–30 chars, lowercase letters, numbers, or underscores only.', 'error');
    if (!password || isNaN(ducks) || ducks < 0) return showAlert('Please fill in all fields correctly.', 'error');

    postForm(window.urls.createUserUrl, { username, password, ducks })
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                ['new-username', 'create-password', 'new-ducks'].forEach(id => {
                    document.getElementById(id).value = id === 'new-ducks' ? 0 : '';
                });
            } else {
                showAlert('Error: ' + data.message, 'error');
            }
        })
        .catch(err => {
            console.error('Error creating user:', err);
            showAlert('An unexpected error occurred.', 'error');
        });
});

document.getElementById('remove-user-button')?.addEventListener('click', () => {
    const username = document.getElementById('remove-username').value;
    if (!username) return showAlert('Please enter a username', 'warning');

    Swal.fire({
        title: 'Are you sure?',
        text: "This action cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (!result.isConfirmed) return;

        const formData = new FormData();
        formData.append('username', username);

        fetch('/admin/remove_user', {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showAlert('User removed successfully', 'success');
                    document.getElementById('remove-username').value = '';
                } else {
                    showAlert('Error: ' + data.message, 'error');
                }
            })
            .catch(err => {
                console.error('Error removing user:', err);
                showAlert('An error occurred while removing the user', 'error');
            });
    });
});

function replaceDuckEmojis() {
    document.querySelectorAll('*').forEach(el => {
        el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('🦆')) {
                const parts = node.nodeValue.split('🦆');
                const fragment = document.createDocumentFragment();

                parts.forEach((text, idx) => {
                    fragment.appendChild(document.createTextNode(text));
                    if (idx < parts.length - 1) {
                        const img = document.createElement('img');
                        img.src = '/static/images/rubber_duck.png';
                        img.alt = 'Rubber Duck';
                        img.className = 'emoji';
                        fragment.appendChild(img);
                    }
                });

                el.replaceChild(fragment, node);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', replaceDuckEmojis);

document.getElementById('update-multiplier-button').addEventListener('click', function() {
    const newMultiplier = parseFloat(document.getElementById('duck-multiplier-input').value);

    if (isNaN(newMultiplier) || newMultiplier < 0) {
        Swal.fire('Invalid Input', 'Please enter a valid non-negative number.', 'error');
        return;
    }

    fetch(window.urls.updateMultiplierUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ multiplier: newMultiplier })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Swal.fire('Multiplier Updated', `New duck multiplier: ${newMultiplier}`, 'success');
        } else {
            Swal.fire('Error', data.message || 'Failed to update multiplier.', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating multiplier:', error);
        Swal.fire('Error', 'Server error occurred.', 'error');
    });
});
