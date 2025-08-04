// @ts-nocheck
import { MotionModule } from './motion.js';

/**
 * GestureService - High-level gesture interpretation service
 * Maps raw motion data to semantic gesture events with configurable behavior
 */
export class GestureService {
    constructor(motionModule) {
        this.motionModule = motionModule;
        
        // Registered gesture instances
        this.gestureInstances = new Map(); // targetId -> GestureServiceInstance
        
        // Active gesture state
        this.activeTargetId = null;
        this.activeGestureInstance = null;
        this.updateInterval = null;
        this.updateRate = 60; // Hz
        
        // Touch-to-target mapping
        this.touchTargets = new Map(); // touchId -> targetId
        
        console.log('[Gesture] GestureService created');
    }
    
    
    /**
     * Register a gesture target with its configuration
     */
    registerTarget(targetId, gestureInstance) {
        this.gestureInstances.set(targetId, gestureInstance);
        gestureInstance.setParentService(this);
        console.log(`[Gesture] Registered gesture target: ${targetId}`);
    }
    
    
    /**
     * Unregister a gesture target
     */
    unregisterTarget(targetId) {
        const instance = this.gestureInstances.get(targetId);
        if (instance) {
            instance.setParentService(null);
            this.gestureInstances.delete(targetId);
            
            // Clear if this was the active target
            if (this.activeTargetId === targetId) {
                this.deactivateTarget();
            }
            
            console.log(`[Gesture] Unregistered gesture target: ${targetId}`);
        }
    }
    
    
    /**
     * Handle touch start - initiate gesture tracking for a target
     */
    handleTouchStart(touch, targetId) {
        const gestureInstance = this.gestureInstances.get(targetId);
        if (!gestureInstance) {
            console.log(`[Gesture] No gesture instance found for target: ${targetId}`);
            return false;
        }
        
        // Track this touch for the target
        const touchData = this.motionModule.handleTouchStart(touch);
        this.touchTargets.set(touch.identifier, targetId);
        
        // Store baseline orientation for this touch
        const orientation = this.motionModule.getCurrentOrientation();
        gestureInstance.setOrientationBaseline(touch.identifier, orientation);
        
        // Activate this target if not already active
        if (!this.activeTargetId) {
            this.activateTarget(targetId);
        }
        
        console.log(`[Gesture] Touch ${touch.identifier} started for target: ${targetId}`);
        return true;
    }
    
    
    /**
     * Handle touch move - process drag gestures
     */
    handleTouchMove(touch) {
        const targetId = this.touchTargets.get(touch.identifier);
        if (!targetId) return false;
        
        const gestureInstance = this.gestureInstances.get(targetId);
        if (!gestureInstance) return false;
        
        const moveData = this.motionModule.handleTouchMove(touch);
        if (!moveData) return false;
        
        // Process drag gesture if significant movement
        if (Math.abs(moveData.deltaX) > 1 || Math.abs(moveData.deltaY) > 1) {
            gestureInstance.processDragGesture(touch.identifier, moveData.deltaX, moveData.deltaY);
        }
        
        return true;
    }
    
    
    /**
     * Handle touch end - stop tracking gesture for target
     */
    handleTouchEnd(touch) {
        const targetId = this.touchTargets.get(touch.identifier);
        if (!targetId) return false;
        
        const gestureInstance = this.gestureInstances.get(targetId);
        if (gestureInstance) {
            gestureInstance.removeOrientationBaseline(touch.identifier);
        }
        
        this.motionModule.handleTouchEnd(touch);
        this.touchTargets.delete(touch.identifier);
        
        // Deactivate if no more active touches
        if (this.touchTargets.size === 0) {
            this.deactivateTarget();
        }
        
        console.log(`[Gesture] Touch ${touch.identifier} ended for target: ${targetId}`);
        return true;
    }
    
    
    /**
     * Activate gesture tracking for a target
     */
    activateTarget(targetId) {
        const gestureInstance = this.gestureInstances.get(targetId);
        if (!gestureInstance) return;
        
        this.activeTargetId = targetId;
        this.activeGestureInstance = gestureInstance;
        
        // Start continuous updates for orientation gestures
        this.startContinuousUpdates();
        
        // Notify the gesture instance
        gestureInstance.onActivate();
        
        console.log(`[Gesture] Activated gesture target: ${targetId}`);
    }
    
    
    /**
     * Deactivate current gesture target
     */
    deactivateTarget() {
        if (this.activeGestureInstance) {
            this.activeGestureInstance.onDeactivate();
        }
        
        this.stopContinuousUpdates();
        this.activeTargetId = null;
        this.activeGestureInstance = null;
        
        console.log('[Gesture] Deactivated gesture target');
    }
    
    
    /**
     * Start continuous updates for orientation-based gestures
     */
    startContinuousUpdates() {
        if (this.updateInterval) return; // Already running
        
        this.updateInterval = setInterval(() => {
            if (this.activeGestureInstance) {
                this.activeGestureInstance.processContinuousGestures();
            }
        }, 1000 / this.updateRate);
        
        console.log('[Gesture] Started continuous gesture updates');
    }
    
    
    /**
     * Stop continuous updates
     */
    stopContinuousUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('[Gesture] Stopped continuous gesture updates');
        }
    }
    
    
    /**
     * Get all registered targets
     */
    getRegisteredTargets() {
        return Array.from(this.gestureInstances.keys());
    }
    
    
    /**
     * Get gesture instance for target
     */
    getGestureInstance(targetId) {
        return this.gestureInstances.get(targetId);
    }

}


/**
 * GestureServiceInstance - Configuration for a specific gesture target
 * Handles property-specific gesture interpretation and callbacks
 */
export class GestureServiceInstance {
    constructor(config = {}) {
        // Target identification
        this.targetId = config.targetId || 'unknown';
        this.propertyName = config.propertyName || '';
        
        // Drag gesture configuration
        this.dragScaleFactor = config.dragScaleFactor || 0.01;
        this.dragDeadZone = config.dragDeadZone || 1.0; // pixels
        
        // Tilt gesture configuration  
        this.tiltScaleFactor = config.tiltScaleFactor || 2.0;
        this.tiltDeadZoneRadius = config.tiltDeadZoneRadius || 0.1; // radians
        this.tiltMaxRadius = config.tiltMaxRadius || 0.5; // radians
        
        // Twist gesture configuration
        this.twistScaleFactor = config.twistScaleFactor || 1.0;
        this.twistDeadZoneRadius = config.twistDeadZoneRadius || 0.05; // radians
        this.twistMaxRadius = config.twistMaxRadius || 1.0; // radians
        
        // Property constraints
        this.minValue = config.minValue !== undefined ? config.minValue : null;
        this.maxValue = config.maxValue !== undefined ? config.maxValue : null;
        this.stepSize = config.stepSize || 0.1;
        this.currentValue = config.initialValue || 0;
        
        // State tracking
        this.isActive = false;
        this.orientationBaselines = new Map(); // touchId -> {tiltX, tiltY, twist}
        
        // Callbacks
        this.onDrag = config.onDrag || (() => {});
        this.onTilt = config.onTilt || (() => {});
        this.onTwist = config.onTwist || (() => {});
        this.onSelect = config.onSelect || (() => {});
        this.onDeselect = config.onDeselect || (() => {});
        this.onChange = config.onChange || (() => {});
        
        // Parent service reference
        this.parentService = null;
    }
    
    
    /**
     * Set parent gesture service reference
     */
    setParentService(service) {
        this.parentService = service;
    }
    
    
    /**
     * Set orientation baseline for a touch
     */
    setOrientationBaseline(touchId, orientation) {
        this.orientationBaselines.set(touchId, {
            tiltX: orientation.tiltX,
            tiltY: orientation.tiltY,
            twist: orientation.twist
        });
    }
    
    
    /**
     * Remove orientation baseline for a touch
     */
    removeOrientationBaseline(touchId) {
        this.orientationBaselines.delete(touchId);
    }
    
    
    /**
     * Process drag gesture
     */
    processDragGesture(touchId, deltaX, deltaY) {
        if (!this.isActive) return;
        
        // Apply drag dead zone
        if (Math.abs(deltaX) < this.dragDeadZone && Math.abs(deltaY) < this.dragDeadZone) {
            return;
        }
        
        // Convert to world coordinates
        const worldDeltaX = deltaX * this.dragScaleFactor;
        const worldDeltaY = deltaY * this.dragScaleFactor;
        
        // Call drag callback
        this.onDrag(worldDeltaX, worldDeltaY, touchId);
    }
    
    
    /**
     * Process continuous gestures (tilt and twist)
     */
    processContinuousGestures() {
        if (!this.isActive || !this.parentService?.motionModule) return;
        
        // Process for each active touch
        this.orientationBaselines.forEach((baseline, touchId) => {
            const current = this.parentService.motionModule.getCurrentOrientation();
            const relative = this.parentService.motionModule.getRelativeOrientation(
                baseline.tiltX, baseline.tiltY, baseline.twist
            );
            
            // Process tilt gesture
            this.processTiltGesture(touchId, relative.relativeTiltX, relative.relativeTiltY);
            
            // Process twist gesture
            this.processTwistGesture(touchId, relative.relativeTwist);
        });
    }
    
    
    /**
     * Process tilt gesture with dead zone and scaling
     */
    processTiltGesture(touchId, relativeTiltX, relativeTiltY) {
        const scaled = this.parentService.motionModule.applySmoothScaling(
            relativeTiltX, relativeTiltY,
            this.tiltDeadZoneRadius, this.tiltMaxRadius, this.tiltScaleFactor
        );
        
        // Call tilt callback if significant movement
        if (Math.abs(scaled.x) > 0.001 || Math.abs(scaled.y) > 0.001) {
            this.onTilt(scaled.x, scaled.y, touchId);
        }
    }
    
    
    /**
     * Process twist gesture with dead zone and smooth scaling (consistent with tilt)
     */
    processTwistGesture(touchId, relativeTwist) {
        // Apply smooth scaling with dead zone and max radius (same pattern as tilt)
        const scaled = this.parentService.motionModule.applySmoothScaling(
            relativeTwist, 0, // Treat twist as 1D value (Y=0)
            this.twistDeadZoneRadius, this.twistMaxRadius, this.twistScaleFactor
        );
        
        // Extract the X component (since we passed Y=0)
        const strengthDelta = scaled.x;
        
        if (Math.abs(strengthDelta) > 0.001) {
            const direction = strengthDelta > 0 ? 1 : -1;
            
            // Update current value with constraints
            let newValue = this.currentValue + strengthDelta;
            if (this.minValue !== null) newValue = Math.max(this.minValue, newValue);
            if (this.maxValue !== null) newValue = Math.min(this.maxValue, newValue);
            
            // Apply step size
            if (this.stepSize > 0) {
                newValue = Math.round(newValue / this.stepSize) * this.stepSize;
            }
            
            // Call callbacks if value changed
            if (newValue !== this.currentValue) {
                this.currentValue = newValue;
                this.onTwist(strengthDelta, direction, touchId);
                this.onChange(this.currentValue, this.propertyName);
            }
        }
    }
    
    
    /**
     * Called when this gesture target becomes active
     */
    onActivate() {
        this.isActive = true;
        this.onSelect(this.targetId, this.propertyName);
    }
    
    
    /**
     * Called when this gesture target becomes inactive
     */
    onDeactivate() {
        this.isActive = false;
        this.orientationBaselines.clear();
        this.onDeselect(this.targetId, this.propertyName);
    }
    
    
    /**
     * Update configuration
     */
    updateConfig(config) {
        Object.assign(this, config);
    }
    
    
    /**
     * Get current configuration
     */
    getConfig() {
        return {
            targetId: this.targetId,
            propertyName: this.propertyName,
            dragScaleFactor: this.dragScaleFactor,
            tiltScaleFactor: this.tiltScaleFactor,
            twistScaleFactor: this.twistScaleFactor,
            minValue: this.minValue,
            maxValue: this.maxValue,
            currentValue: this.currentValue,
            isActive: this.isActive
        };
    }
}