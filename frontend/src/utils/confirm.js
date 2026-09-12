// confirm.js - Singleton Promise Resolver for Confirm Dialog

class SimpleEmitter {
    constructor() {
        this.listeners = {};
    }
    
    emit(event, payload) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(payload));
    }
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
}

export const confirmEvents = new SimpleEmitter();

export const showConfirm = (message, options = {}) => {
    return new Promise((resolve) => {
        confirmEvents.emit('show', { message, options, resolve });
    });
};
