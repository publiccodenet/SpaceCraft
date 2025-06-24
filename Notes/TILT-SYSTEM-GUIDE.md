# 🎮 Cooperative Tilt Control System Guide

## 🌟 Overview
The SpaceCraft physics system supports **cooperative tilt control** where multiple mobile controllers can simultaneously tilt their devices to collectively manipulate the gravity center in the 3D book space. This creates a "marble madness" effect where books roll and bounce based on real-world physics influenced by tilting phones/tablets.

## 📱 Controller Implementation

### Required Presence State Fields
Controllers must include these fields in their Supabase presence state:

```javascript
{
    // ... other presence fields ...
    
    // Tilt control fields
    tiltEnabled: true,           // Boolean: User pressed "start tilting" button
    tiltX: -12.5,               // Float: Left/right tilt in degrees (-90 to +90)
    tiltZ: 8.3                  // Float: Forward/back tilt in degrees (-90 to +90)
}
```

### Coordinate System Mapping

**📱 Phone Orientation → 🌍 World Coordinates**

| Phone State | tiltX | tiltZ | Effect in Unity |
|-------------|-------|-------|-----------------|
| **Face up toward ceiling** | 0° | 0° | Neutral gravity (center) |
| **Tilt left** | -45° | 0° | Gravity pulls books left |
| **Tilt right** | +45° | 0° | Gravity pulls books right |
| **Tilt forward (away from face)** | 0° | +45° | Gravity pulls books forward |
| **Tilt back (toward face)** | 0° | -45° | Gravity pulls books back |

### Example Controller Implementation

```javascript
// Controller JavaScript example
class TiltController {
    constructor() {
        this.tiltEnabled = false;
        this.baseOrientation = null; // Calibration reference
    }
    
    // User presses "Start Tilting" button
    enableTilting() {
        this.tiltEnabled = true;
        this.calibrateNeutral(); // Set current orientation as neutral
        this.startDeviceOrientationUpdates();
    }
    
    // User presses "Stop Tilting" button  
    disableTilting() {
        this.tiltEnabled = false;
        this.stopDeviceOrientationUpdates();
        
        // Clear tilt from presence state
        this.updatePresence({
            tiltEnabled: false,
            tiltX: 0,
            tiltZ: 0
        });
    }
    
    calibrateNeutral() {
        // Store current device orientation as "neutral"
        // Phone face-up toward ceiling = (0, 0) reference
        this.baseOrientation = this.getCurrentOrientation();
    }
    
    handleDeviceOrientation(event) {
        if (!this.tiltEnabled) return;
        
        // Calculate tilt relative to calibrated neutral
        const currentOrientation = this.getCurrentOrientation();
        const tiltX = this.calculateTiltX(currentOrientation);
        const tiltZ = this.calculateTiltZ(currentOrientation);
        
        // Clamp to reasonable ranges
        const clampedTiltX = Math.max(-45, Math.min(45, tiltX));
        const clampedTiltZ = Math.max(-45, Math.min(45, tiltZ));
        
        // Update presence state
        this.updatePresence({
            tiltEnabled: true,
            tiltX: clampedTiltX,
            tiltZ: clampedTiltZ
        });
    }
}
```

## 🤝 Cooperative Behavior

### Multi-Controller Averaging
The simulator **automatically combines** tilt inputs from all controllers:

```javascript
// Example: 3 controllers tilting simultaneously
Controller A: { tiltEnabled: true, tiltX: 20°, tiltZ: 0° }
Controller B: { tiltEnabled: true, tiltX: -10°, tiltZ: 15° }  
Controller C: { tiltEnabled: true, tiltX: 5°, tiltZ: -5° }

// Simulator calculates cooperative average:
Combined: tiltX = (20 + -10 + 5) / 3 = 5°
          tiltZ = (0 + 15 + -5) / 3 = 3.33°
```

### Filtering Rules
- Only controllers with `tiltEnabled: true` are included
- Controllers with `tiltEnabled: false` or missing are ignored
- Neutral controllers (0°, 0°) still contribute to averaging
- If no controllers have tilting enabled → gravity returns to center

## ⚙️ Unity System Details

### Coordinate Transformation
```csharp
// JavaScript sends normalized values (-1 to +1)
float normalizedTiltX = combinedTiltX / 45f;  // 45° = full tilt
float normalizedTiltZ = combinedTiltZ / 45f;

// Unity converts to world offset
centerOffset.x = normalizedTiltX * tiltSensitivity;  // Default: 20 units
centerOffset.z = normalizedTiltZ * tiltSensitivity;

// Effective gravity center becomes:
Vector3 effectiveCenter = centerPoint + centerOffset;
```

### Physics Application
Books experience force toward the effective gravity center:
```csharp
Vector3 toCenter = effectiveCenter - bookPosition;
float distance = toCenter.magnitude;

if (distance > centerForceRadius) {
    float forceStrength = centerForceStrength / (distance * distance);
    Vector3 force = toCenter.normalized * forceStrength;
    rigidbody.AddForce(force, ForceMode.Force);
}
```

## 🎛️ Tunable Parameters

### Unity Inspector Settings
| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `tiltSensitivity` | 0-50 | 20 | How far tilt moves gravity center |
| `centerForceStrength` | 0-100 | 10 | How strong the gravitational pull is |
| `centerForceRadius` | 1-200 | 50 | Dead zone where no force applies |

### Real-Time Bridge Control
Controllers can adjust physics parameters live:

```javascript
// Increase tilt sensitivity for more dramatic effect
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "tiltsensitivity", 35]
});

// Make gravity stronger
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "centerforce", 25]
});
```

## 🧪 Testing & Debugging

### Unity Test Methods
```csharp
// Test tilt system in Unity Inspector
[ContextMenu("Test Tilt System")]
public void TestTiltSystem()

// Test full physics playground
[ContextMenu("Test Physics Playground")]  
public void TestPhysicsPlayground()
```

### Debug Logging
The system logs cooperative tilt activity:
```
[SpaceCraft] Cooperative tilt: 2/3 controllers active, combined: (15.2°, -8.7°)
Physics: Tilt input (0.34, -0.19) -> Center offset (6.8, -3.9) by simulator
```

## 🎯 Best Practices

### Controller UX
1. **Clear Enable/Disable Button**: "Start Tilting" / "Stop Tilting"
2. **Calibration on Enable**: Set current orientation as neutral
3. **Visual Feedback**: Show tilt values or tilt indicator
4. **Reasonable Limits**: Clamp tilt angles to ±45° for comfort

### Performance
1. **Throttle Updates**: Send tilt updates at ~10-30 Hz, not on every orientation event
2. **Deadzone**: Ignore tiny movements (<1°) to reduce noise
3. **Auto-Disable**: Consider auto-disabling after inactivity

### Cooperative Design
1. **Additive Fun**: Multiple people tilting together should feel collaborative, not chaotic
2. **Visual Cues**: Show when others are tilting in the UI
3. **Graceful Degradation**: System works with 1 or many controllers

## 🚀 Future Enhancements

- **Terrain Tilting**: Instead of moving gravity, physically tilt the ground plane
- **Shake Detection**: Add phone shake → random impulse forces
- **Tilt History**: Smooth out rapid tilt changes with momentum
- **Regional Tilt**: Different controllers affect different areas of the space
- **Force Visualization**: Show gravity field as visual overlay

---

**Ready for Marble Madness!** 🎱✨ The system transforms book exploration into a physics-based playground where multiple people can cooperatively manipulate the semantic landscape through intuitive phone tilting! 