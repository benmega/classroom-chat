// messageHandling.js

export function setupMessagingAndConversation() {
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessage();
        uploadImage();
        updateConversation();
    });
    // Set an interval to update the conversation every 2 seconds
    setInterval(updateConversation, 2000);
}

export function updateConversation() {
    fetchCurrentConversation()
        .then(data => {
            updateChatUI(data.conversation);
        })
        .catch(error => {
            console.error('Failed to fetch conversation:', error);
        });
}


export function sendMessage() {
    const message = getMessageInput();

    if (!message) {
        alert('Message is required.');
        return;
    }

    // Since username is stored in session, we don’t need to send it manually
    const params = createRequestParams({ message });

    sendRequest('message/send_message', params)
        .then(handleResponse)
        .catch(handleError);
}


// update conversation helper functions

function fetchCurrentConversation() {
    return fetch('message/get_current_conversation')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}

function updateChatUI(conversationData) {
    console.log(conversationData)
    const chatDiv = document.getElementById('chat');
    if (!chatDiv) {
        console.error('Chat div not found');
        return;
    }
    chatDiv.innerHTML = '';  // Clear previous content

    // Optionally, display the conversation title
//    const titleDiv = document.createElement('div');
//    titleDiv.classList.add('conversation-title');
//    titleDiv.textContent = conversationData.title;
//    chatDiv.appendChild(titleDiv);

    // Loop through the messages and display each one
    conversationData.messages.forEach(msg => {
        const messageHTML = formatMessage(msg.user_name, msg.content);
        chatDiv.innerHTML += messageHTML;
    });
}


function formatMessage(username, message) {
    // Replace \n with <br> first
    message = message.replace(/\n/g, '<br>');

    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s<]+)|(\bwww\.[^\s<]+(?:\.[^\s<]+)+\b)/g;

    // Replace URLs with anchor tags
    const formattedMessage = message.replace(urlRegex, url => {
        const href = url.startsWith('http') ? url : 'http://' + url;
        return `<a href="${href}" target="_blank">${url}</a>`;
    });

    // Return the formatted message with <br> properly handled
    return `<p><strong>${username}:</strong> ${formattedMessage}</p>`;
}


//function formatMessage(username, message) {
//    const urlRegex = /(https?:\/\/[^\s\n\r]+)|(\bwww\.[^\s\n\r]+(?:\.[^\s\n\r]+)+\b)/g;
//    const formattedMessage = message.replace(urlRegex, url => {
//        const href = url.startsWith('http') ? url : 'http://' + url;
//        return `<a href="${href}" target="_blank">${url}</a>`;
//    });
//
//    return `<p><strong>${username}:</strong> ${formattedMessage}</p>`;
//}

//function formatMessage(username, message) {
//    const urlRegex = ^/(https?:\/\/[^\s\n\r]+)|(\bwww\.[^\s\n\r]+(?:\.[^\s\n\r]+)+\b)/g;
//    const formattedMessage = message.replace(urlRegex, url => {
//        const href = url.startsWith('http') ? url : 'http://' + url;
//        return `<a href="${href}" target="_blank">${url}</a>`;
//    });
//
//    return `<p><strong>${username}:</strong> ${formattedMessage}</p>`;
//}


// send messages helper functions

function getMessageInput() {
    return document.getElementById('message').value.trim();
}


function getUsername() {
    return document.getElementById('currentUsername').textContent.trim();
}

function createRequestParams(data) {
    const params = new URLSearchParams();
    Object.keys(data).forEach(key => params.append(key, data[key]));
    return params;
}


function sendRequest(url, params) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
    }).then(response => response.json());
}



function handleResponse(data) {
    if (data.success) {
        clearMessageInput();
    } else {
        alert('Error: ' + data.error);
    }
}

function handleError(error) {
    console.error('Error:', error);
    alert('An unexpected error occurred.');
}

function clearMessageInput() {
    document.getElementById('message').value = '';
}




// Image upload helper functions
export function uploadImage() {
    const file = getImageFile();

    if (!file) {
        return;
    }

    convertFileToBase64(file)
        .then(dataURL => {
            const params = createJSONRequestParams({ file: dataURL });
            return sendJsonRequest('/upload/upload_file', params);
        })
        .then(handleUploadResponse)
        .catch(handleError);
}

function createJSONRequestParams(data) {
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),  // Convert the data object to a JSON string
    };
}

function sendJsonRequest(url, data) {
    return fetch(url, data)  // No need to re-stringify; data is already JSON
        .then(response => response.json());
}

function getImageFile() {
    return document.getElementById('file').files[0];
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function handleUploadResponse(data) {
    if (data.message) {
        console.log(data.message); // Success message from server
        alert('Image uploaded successfully.');
        document.getElementById('file').value = ''; // Clear the file input after upload
    } else {
        alert('Error: ' + data.error);
    }
}

