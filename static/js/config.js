const config = {
    socketEndpoint: 'wss://yourdomain.com/socket',
    serverEndpoint: 'http://192.168.1.136:5000',
    updateInterval: 2000, // Update every 2000 milliseconds or 2 seconds
    adminUser: 'Mr. Mega', // Development only
    adminPass: '1234',     // Development only, use environment variables in production
    adminSocket: 'http://localhost:5000/admin'
};

export default config;
