// socketManager.js

export async function setupSocketConnection() {
    const response = await fetch('/user/get_user_id');
    if (!response.ok) {
        throw new Error('Failed to fetch user ID');
    }
    const { user_id } = await response.json();
    const serverEndpoint = 'http://localhost:5000'; // This should be dynamic in production
    const socket = io.connect(serverEndpoint, {
        auth: {
            user_id: user_id  // Pass user_id obtained from the server
        }
    });

    // Setting up listeners
    socket.on('connect', () => {
        console.log('Connected to the server with user ID:', user_id);
    });

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

    return socket;
}
