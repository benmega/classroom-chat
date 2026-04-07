/*
File: config.js
Type: js
Summary: Client-side configuration values for server communication.
*/

const config = {
    serverEndpoint: window.location.origin.includes(':5173') ? 'http://localhost:8000' : window.location.origin,
};

export default config;
