// @ts-nocheck
// logging.js - Simple Logging Module for SpaceCraft

export class LoggingModule {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
    }

    log(category, message, data = null) {
        const logEntry = {
            timestamp: Date.now(),
            category,
            message,
            data
        };

        this.logs.push(logEntry);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output
        const prefix = `[${category}]`;
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    getRecentLogs(count = 10) {
        return this.logs.slice(-count);
    }

    clearLogs() {
        this.logs = [];
    }
}