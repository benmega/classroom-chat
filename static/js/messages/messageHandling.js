// messageHandling.js

export function setupMessagingAndConversation() {
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessage();
        uploadScreenshot();
        updateConversation();
    });
    // Set an interval to update the conversation every 2 seconds
    setInterval(updateConversation, 2000);
}

export function updateConversation() {
    fetchConversationData()
        .then(data => {
            updateChatUI(data.conversation_history);
        })
        .catch(error => {
            console.error('Failed to fetch conversation:', error);
        });
}


export function sendMessage() {
    const message = getMessageInput();
    const username = getUsernameInput();

//    if (!message || !username) {
//        alert('Both message and username are required.');
//        return;
//    }

    const params = createRequestParams({ message, username });

    sendRequest('user/send_message', params)
        .then(handleResponse)
        .catch(handleError);
}



// update conversation helper functions

function fetchConversationData() {
    return fetch('/user/get_conversation')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        });
}

function updateChatUI(conversationHistory) {
    const chatDiv = document.getElementById('chat');
    if (!chatDiv) {
        console.error('Chat div not found');
        return;
    }
    chatDiv.innerHTML = '';  // Clear previous content

    conversationHistory.forEach(entry => {
        const messageHTML = formatMessage(entry.username, entry.message);
        chatDiv.innerHTML += messageHTML;
    });
}

function formatMessage(username, message) {
    const urlRegex = /(https?:\/\/[^\s]+)|(\bwww\.[^\s]+(?:\.[^\s]+)+\b)/g;
    const formattedMessage = message.replace(urlRegex, url => {
        const href = url.startsWith('http') ? url : 'http://' + url;
        return `<a href="${href}" target="_blank">${url}</a>`;
    });

    return `<p><strong>${username}:</strong> ${formattedMessage}</p>`;
}


// send messages helper functions

function getMessageInput() {
    return document.getElementById('message').value.trim();
}

function getUsernameInput() {
    return document.getElementById('currentUsername').value.trim();
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
export function uploadScreenshot() {
    const file = getScreenshotFile();

    if (!file) {
        return;
    }

    convertFileToBase64(file)
        .then(dataURL => {
            const params = createJSONRequestParams({ image: dataURL });
            return sendJsonRequest('/user/upload_screenshot', params);
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

function getScreenshotFile() {
    return document.getElementById('screenshot').files[0];
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
        document.getElementById('screenshot').value = ''; // Clear the file input after upload
    } else {
        alert('Error: ' + data.error);
    }
}


//export function updateConversation() {
//        fetch('/user/get_conversation')
//            .then(response => {
//                if (!response.ok) {
//                    throw new Error('Network response was not ok: ' + response.statusText);
//                }
//                return response.json();
//            })
//            .then(data => {
//                var chatDiv = document.getElementById('chat');
//                if (!chatDiv) {
//                    console.error('Chat div not found');
//                    return;
//                }
//                chatDiv.innerHTML = '';  // Clear previous content
//
//                data.conversation_history.forEach(function(entry) {
//                    var user = entry.username;   // Assuming the object has 'username'
//                    var message = entry.message; // Assuming the object has 'message'
//
//                    // Convert URLs to clickable links
//                    var urlRegex = /(https?:\/\/[^\s]+)|(\bwww\.[^\s]+(?:\.[^\s]+)+\b)/g;
//                    message = message.replace(urlRegex, function(url) {
//                        return '<a href="' + (url.startsWith('http') ? url : 'http://' + url) + '" target="_blank">' + url + '</a>';
//                    });
//
//                    chatDiv.innerHTML += '<p><strong>' + user + ':</strong> ' + message + '</p>';
//                });
//            })
//            .catch(error => {
//                console.error('Failed to fetch conversation:', error);
//            });
//    }

//export function sendMessage() {
//    var message = document.getElementById('message').value;
//    var username = document.getElementById('currentUsername').value;
//
//    var params = new URLSearchParams();
//    params.append('message', message);
//    params.append('username', username);
//
//    fetch('user/send_message', {
//        method: 'POST',
//        headers: {
//            'Content-Type': 'application/x-www-form-urlencoded',
//        },
//        body: params
//    })
//    .then(function(response) {
//        return response.json();  // Parse the JSON response
//    })
//    .then(function(data) {
//        if (data.success) {
//            document.getElementById('message').value = '';
//        } else {
//            alert('Error: ' + data.error);
//        }
//    })
//    .catch(function(error) {
//        console.error('Error:', error);
//        alert('An unexpected error occurred.');
//    });
//}


//
//function uploadScreenshot() {
//    const file = getScreenshotFile();
//
//    if (!file) {
//        return;
//    }
//    const dummyDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgMBAQABAwAAAA==";
//
//    convertFileToBase64(file)
//        .then(dataURL => {
//            const params = createJSONRequestParams({ image: dummyDataURL });
//            return sendJsonRequest('/user/upload_screenshot', params);
//        })
//        .then(handleUploadResponse)
//        .catch(handleError);
//}
//
//function createJSONRequestParams(data) {
//    return {
//        method: 'POST',
//        headers: {
//            'Content-Type': 'application/json',
//        },
//        body: JSON.stringify(data),
//    };
//}
//
//
//
//function sendJsonRequest(url, data) {
//    return fetch(url, {
//        method: 'POST',
//        headers: {
//            'Content-Type': 'application/json',  // Correct content type for JSON data
//        },
//        body: JSON.stringify(data)  // Convert the data object to a JSON string
//    }).then(response => response.json());
//}

