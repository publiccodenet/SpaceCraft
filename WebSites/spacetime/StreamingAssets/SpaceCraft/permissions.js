// permissions.js - Permission tracking and management for SpaceCraft controllers

export class PermissionsModule {
    constructor(logger) {
        this.logger = logger;
        
        // Permission state tracking
        this.permissionStates = {
            'connection': 'unknown',
            'motion': 'inactive',
            'audio': 'inactive',
            'speech': 'inactive'
        };
        
        // Callbacks for permission changes
        this.permissionChangeCallbacks = new Map();
    }

    /**
     * Updates the permission status and triggers callbacks
     */
    updatePermissionStatus(permissionType, status) {
        const oldStatus = this.permissionStates[permissionType];
        this.permissionStates[permissionType] = status;
        
        this.logger.logEvent('Permissions', `${permissionType} changed from ${oldStatus} to ${status}`);
        
        // Trigger callbacks for this permission type
        const callbacks = this.permissionChangeCallbacks.get(permissionType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(permissionType, status, oldStatus);
                } catch (e) {
                    this.logger.logEvent('Error', `Permission callback error for ${permissionType}:`, e);
                }
            });
        }
        
        // Trigger global permission change callbacks
        const globalCallbacks = this.permissionChangeCallbacks.get('*');
        if (globalCallbacks) {
            globalCallbacks.forEach(callback => {
                try {
                    callback(permissionType, status, oldStatus);
                } catch (e) {
                    this.logger.logEvent('Error', `Global permission callback error:`, e);
                }
            });
        }
    }

    /**
     * Get the current status of a permission
     */
    getPermissionStatus(permissionType) {
        return this.permissionStates[permissionType] || 'unknown';
    }

    /**
     * Get all permission states
     */
    getAllPermissionStates() {
        return { ...this.permissionStates };
    }

    /**
     * Register a callback for permission changes
     * @param {string} permissionType - The permission type to watch, or '*' for all
     * @param {function} callback - Function called with (permissionType, newStatus, oldStatus)
     */
    onPermissionChange(permissionType, callback) {
        if (!this.permissionChangeCallbacks.has(permissionType)) {
            this.permissionChangeCallbacks.set(permissionType, []);
        }
        
        this.permissionChangeCallbacks.get(permissionType).push(callback);
        
        this.logger.logEvent('Permissions', `Callback registered for ${permissionType}`);
    }

    /**
     * Remove a callback for permission changes
     */
    offPermissionChange(permissionType, callback) {
        const callbacks = this.permissionChangeCallbacks.get(permissionType);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
                this.logger.logEvent('Permissions', `Callback removed for ${permissionType}`);
            }
        }
    }

    /**
     * Check if a permission is granted/active
     */
    hasPermission(permissionType) {
        const status = this.getPermissionStatus(permissionType);
        return status === 'granted' || status === 'active';
    }

    /**
     * Check if any permissions are in error state
     */
    hasPermissionErrors() {
        return Object.values(this.permissionStates).some(status => status === 'error' || status === 'denied');
    }

    /**
     * Get permissions in error state
     */
    getPermissionErrors() {
        const errors = {};
        Object.entries(this.permissionStates).forEach(([type, status]) => {
            if (status === 'error' || status === 'denied') {
                errors[type] = status;
            }
        });
        return errors;
    }

    /**
     * Get a status summary for display
     */
    getStatusSummary() {
        const states = this.getAllPermissionStates();
        const active = Object.entries(states).filter(([_, status]) => status === 'active' || status === 'granted');
        const errors = Object.entries(states).filter(([_, status]) => status === 'error' || status === 'denied');
        const pending = Object.entries(states).filter(([_, status]) => status === 'pending');
        
        return {
            active: active.map(([type, _]) => type),
            errors: errors.map(([type, status]) => ({ type, status })),
            pending: pending.map(([type, _]) => type),
            total: Object.keys(states).length
        };
    }

    /**
     * Reset all permissions to unknown state
     */
    resetPermissions() {
        Object.keys(this.permissionStates).forEach(permissionType => {
            this.updatePermissionStatus(permissionType, 'unknown');
        });
        
        this.logger.logEvent('Permissions', 'All permissions reset to unknown');
    }

    /**
     * Set the initial state for a new permission type
     */
    initializePermission(permissionType, initialStatus = 'unknown') {
        if (!(permissionType in this.permissionStates)) {
            this.permissionStates[permissionType] = initialStatus;
            this.logger.logEvent('Permissions', `New permission type initialized: ${permissionType} = ${initialStatus}`);
        }
    }
} 