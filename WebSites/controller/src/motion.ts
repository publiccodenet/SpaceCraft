// @ts-nocheck
/**
 * MotionModule - Low-level device motion and touch tracking
 * Provides raw sensor data with normalization and dead zones
 */
export class MotionModule {
  constructor() {
      
      // Current device orientation state (radians)
      this.currentTiltX = 0;      // Left/right tilt (gamma)
      this.currentTiltY = 0;      // Forward/back tilt (beta) 
      this.currentTwist = 0;      // Rotation/yaw (alpha)
      
      // Touch tracking state
      this.activeTouches = new Map(); // touchId -> {startX, startY, lastX, lastY, startTime}
      
      // Motion tracking state
      this.isOrientationSupported = false;
      this.isOrientationActive = false;
      this.orientationPermissionGranted = false;
      
      console.log('[Motion] MotionModule created');
  }
  
  
  /**
   * Initialize device orientation tracking
   * Handles permission requests for iOS 13+
   */
  async initializeOrientationTracking() {
      if (typeof DeviceOrientationEvent === 'undefined') {
          console.log('[Motion] Device orientation not supported');
          return false;
      }
      
      this.isOrientationSupported = true;
      
      // Request permission for iOS 13+
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
              const response = await DeviceOrientationEvent.requestPermission();
              if (response === 'granted') {
                  this.orientationPermissionGranted = true;
                  this.startOrientationListening();
                  return true;
              } else {
                  console.log('[Motion] Device orientation permission denied');
                  return false;
              }
          } catch (error) {
              console.log('[Motion] Error requesting orientation permission:', error);
              return false;
          }
      } else {
          // Non-iOS or older iOS
          this.orientationPermissionGranted = true;
          this.startOrientationListening();
          return true;
      }
  }
  
  
  /**
   * Start listening to device orientation events
   */
  startOrientationListening() {
      if (this.isOrientationActive) return;
      
      window.addEventListener('deviceorientation', (e) => {
          this.handleOrientationChange(e);
      });
      
      this.isOrientationActive = true;
      console.log('[Motion] Device orientation listening started');
  }
  
  
  /**
   * Handle raw device orientation data
   */
  handleOrientationChange(event) {
      // Convert degrees to radians and store
      // alpha = compass/yaw (twist), beta = front/back (tilt Y), gamma = left/right (tilt X)
      this.currentTwist = (event.alpha || 0) * Math.PI / 180;
      this.currentTiltY = (event.beta || 0) * Math.PI / 180;
      this.currentTiltX = (event.gamma || 0) * Math.PI / 180;
  }
  
  
  /**
   * Get current device orientation
   */
  getCurrentOrientation() {
      return {
          tiltX: this.currentTiltX,
          tiltY: this.currentTiltY,
          twist: this.currentTwist
      };
  }
  
  
  /**
   * Start tracking a touch
   */
  handleTouchStart(touch) {
      const touchData = {
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY,
          startTime: Date.now()
      };
      
      this.activeTouches.set(touch.identifier, touchData);
      console.log(`[Motion] Touch ${touch.identifier} started at (${touch.clientX}, ${touch.clientY})`);
      
      return touchData;
  }
  
  
  /**
   * Update touch tracking and return movement delta
   */
  handleTouchMove(touch) {
      const touchData = this.activeTouches.get(touch.identifier);
      if (!touchData) return null;
      
      const deltaX = touch.clientX - touchData.lastX;
      const deltaY = touch.clientY - touchData.lastY;
      
      // Update last position
      touchData.lastX = touch.clientX;
      touchData.lastY = touch.clientY;
      
      return {
          deltaX,
          deltaY,
          totalDeltaX: touch.clientX - touchData.startX,
          totalDeltaY: touch.clientY - touchData.startY,
          touchData
      };
  }
  
  
  /**
   * End touch tracking
   */
  handleTouchEnd(touch) {
      const touchData = this.activeTouches.get(touch.identifier);
      if (touchData) {
          const duration = Date.now() - touchData.startTime;
          console.log(`[Motion] Touch ${touch.identifier} ended after ${duration}ms`);
          this.activeTouches.delete(touch.identifier);
          return touchData;
      }
      return null;
  }
  
  
  /**
   * Get all currently active touches
   */
  getActiveTouches() {
      return Array.from(this.activeTouches.entries());
  }
  
  
  /**
   * Calculate relative orientation from baseline
   */
  getRelativeOrientation(baseTiltX, baseTiltY, baseTwist) {
      const relativeTiltX = this.currentTiltX - baseTiltX;
      const relativeTiltY = this.currentTiltY - baseTiltY;
      
      // Handle twist wraparound (alpha can wrap from 359° to 0°)
      let relativeTwist = this.currentTwist - baseTwist;
      while (relativeTwist > Math.PI) relativeTwist -= 2 * Math.PI;
      while (relativeTwist < -Math.PI) relativeTwist += 2 * Math.PI;
      
      return {
          relativeTiltX,
          relativeTiltY,
          relativeTwist
      };
  }
  
  
  /**
   * Apply dead zone to a value
   */
  applyDeadZone(value, deadZoneRadius) {
      const magnitude = Math.abs(value);
      if (magnitude < deadZoneRadius) {
          return 0;
      }
      
      // Maintain direction but reduce magnitude
      const direction = value > 0 ? 1 : -1;
      const adjustedMagnitude = magnitude - deadZoneRadius;
      return direction * adjustedMagnitude;
  }
  
  
  /**
   * Apply smooth scaling with dead zone and max radius
   */
  applySmoothScaling(valueX, valueY, deadZoneRadius, maxRadius, scaleFactor) {
      const magnitude = Math.sqrt(valueX * valueX + valueY * valueY);
      
      if (magnitude < deadZoneRadius) {
          return { x: 0, y: 0 };
      }
      
      const effectiveRadius = Math.min(magnitude, maxRadius);
      const rampedMagnitude = (effectiveRadius - deadZoneRadius) / (maxRadius - deadZoneRadius);
      
      // Quadratic scaling for smooth feel
      const smoothScale = rampedMagnitude * rampedMagnitude;
      
      const directionX = valueX / magnitude;
      const directionY = valueY / magnitude;
      
      return {
          x: directionX * smoothScale * scaleFactor,
          y: directionY * smoothScale * scaleFactor
      };
  }
  
  

} 