/*
File: config.js
Type: js
Summary: Client-side configuration values for server communication.
*/

const config = {
    serverEndpoint: (window.location.port === '5173' || window.location.port === '5174') 
        ? `${window.location.protocol}//${window.location.hostname}:8000` 
        : window.location.origin,
};

export default config;
