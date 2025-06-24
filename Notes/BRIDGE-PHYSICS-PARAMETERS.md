# 🎛️ Bridge Physics Parameters Reference

## 🌟 Complete Real-Time Control System
**Every physics parameter is now controllable via Bridge!** Controllers can adjust everything from curve types to rigidbody damping in real-time.

## 🎯 **Curve Control Methods**

### **SetCurveType**
Change the neural network curve used for search scaling:
```javascript
bridge.updateObject(spaceCraft, {
    "method:SetCurveType": [clientId, clientName, curveType]
});
```

**Available Curve Types:**
- `"Sigmoid"` - S-curve with clear boundaries
- `"Swish"` - Smooth neural network activation  
- `"Tanh"` - Gentler S-curve
- `"GELU"` - Transformer-style activation
- `"PowerLaw"` - Natural hierarchies (Zipf-like)
- `"LogPerceptual"` - Human perception-based
- `"Pareto"` - 80/20 rule (dramatic)
- `"Linear"` - Simple linear mapping

### **SetCurveParameter** 
Adjust curve shape parameters:
```javascript
bridge.updateObject(spaceCraft, {
    "method:SetCurveParameter": [clientId, clientName, parameterName, value]
});
```

**Curve Parameters:**
| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `"intensity"` | 0.1-10 | 6 | Curve steepness/sharpness |
| `"power"` | 0.2-5 | 2 | Power law exponent |
| `"alpha"` | 0.5-3 | 1.16 | Pareto/shape parameter |
| `"minscale"` | 0.01-1 | 0.1 | Smallest book size (pebbles) |
| `"maxscale"` | 1-10 | 3 | Largest book size (mountains) |
| `"animationspeed"` | 0.1-10 | 2 | How fast books change size |

## 🧲 **Physics Force Control**

### **SetPhysicsParameter**
Control all physics behavior:
```javascript
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, parameterName, value]
});
```

### **Gravity & Center Force:**
| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `"centerforce"` | 0-100 | 10 | Strength pulling books to center |
| `"centerradius"` | 1-200 | 50 | Dead zone radius (no force) |
| `"tiltsensitivity"` | 0-50 | 20 | How much tilt moves gravity center |
| `"gravity"` | 0-5 | 1 | Global gravity multiplier |

### **Material Properties:**
| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `"friction"` | 0-2 | 0.6 | Surface friction (0=ice, 1=rubber) |
| `"bounciness"` | 0-1 | 0.3 | How much books bounce |

### **Rigidbody Behavior:**
| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `"drag"` | 0-10 | 2 | Air resistance (higher = slower) |
| `"angulardrag"` | 0-20 | 10 | Rotation resistance |
| `"sleepthreshold"` | 0.01-1 | 0.1 | Velocity to stop physics |
| `"freezerotation"` | 0/1 | 1 | Lock rotation (billboard effect) |
| `"continuousdetection"` | 0/1 | 1 | Continuous collision detection |

## 🎮 **Tilt Control**

### **PushTiltInput**
Send cooperative tilt data:
```javascript
bridge.updateObject(spaceCraft, {
    "method:PushTiltInput": [clientId, clientName, normalizedTiltX, normalizedTiltZ]
});
```

**Parameters:**
- `normalizedTiltX`: -1 to +1 (left/right tilt)
- `normalizedTiltZ`: -1 to +1 (forward/back tilt)

## 🔥 **Real-Time Usage Examples**

### **Controller UI Sliders:**
```javascript
// Curve intensity slider (1-10)
function onCurveIntensitySlider(value) {
    bridge.updateObject(spaceCraft, {
        "method:SetCurveParameter": [clientId, clientName, "intensity", value]
    });
}

// Physics drag slider (0-10)  
function onDragSlider(value) {
    bridge.updateObject(spaceCraft, {
        "method:SetPhysicsParameter": [clientId, clientName, "drag", value]
    });
}

// Gravity strength slider (0-5)
function onGravitySlider(value) {
    bridge.updateObject(spaceCraft, {
        "method:SetPhysicsParameter": [clientId, clientName, "gravity", value]
    });
}
```

### **Preset Configurations:**
```javascript
// ICE WORLD - Super slippery
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "friction", 0.1]
});
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "drag", 0.5]
});

// STICKY WORLD - High friction
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "friction", 1.5]
});
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "drag", 8]
});

// BOUNCY WORLD - Trampoline effect
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "bounciness", 0.9]
});
bridge.updateObject(spaceCraft, {
    "method:SetPhysicsParameter": [clientId, clientName, "gravity", 0.5]
});
```

### **Curve Morphing:**
```javascript
// Dramatic landscape (few giants, many pebbles)
bridge.updateObject(spaceCraft, {
    "method:SetCurveType": [clientId, clientName, "Pareto"]
});
bridge.updateObject(spaceCraft, {
    "method:SetCurveParameter": [clientId, clientName, "alpha", 1.0]
});

// Smooth landscape (gentle hills)
bridge.updateObject(spaceCraft, {
    "method:SetCurveType": [clientId, clientName, "GELU"]
});
bridge.updateObject(spaceCraft, {
    "method:SetCurveParameter": [clientId, clientName, "intensity", 3]
});
```

## 🧪 **Testing**

### **Unity Context Menu:**
```csharp
// In Unity Inspector on InputManager:
[ContextMenu("Test All Physics Parameters")]
public void TestAllPhysicsParameters()
```

### **Controller Test Sequence:**
```javascript
// Test rapid parameter changes
setTimeout(() => {
    bridge.updateObject(spaceCraft, {
        "method:SetPhysicsParameter": [clientId, clientName, "drag", 8]
    });
}, 1000);

setTimeout(() => {
    bridge.updateObject(spaceCraft, {
        "method:SetCurveType": [clientId, clientName, "PowerLaw"]
    });
}, 2000);

setTimeout(() => {
    bridge.updateObject(spaceCraft, {
        "method:PushTiltInput": [clientId, clientName, 0.7, 0.3]
    });
}, 3000);
```

## 🎯 **Architecture Benefits**

### **✅ Zero Hardcoded Values:**
- All physics behavior controlled by InputManager parameters
- ItemView code contains NO hardcoded physics values
- Complete separation of behavior and structure

### **✅ Real-Time Responsiveness:**
- Parameter changes apply immediately to all books
- Smooth transitions between settings
- No restart required for physics experiments

### **✅ Bridge Integration:**
- All methods follow standard Bridge pattern
- Consistent parameter naming convention
- Full logging and error handling

### **✅ Multi-Controller Support:**
- Multiple controllers can adjust different parameters
- Cooperative tilt input averaging
- Parameter changes are broadcast to all clients

## 🚀 **Use Cases**

### **🎮 Gaming Modes:**
- **Marble Madness**: Low friction, high tilt sensitivity
- **Sticky Books**: High friction, low bounce
- **Zero Gravity**: Low gravity, high air resistance
- **Chaos Mode**: High bounce, low drag, dramatic curves

### **🎨 Artistic Exploration:**
- **Smooth Landscapes**: GELU curves, gentle parameters
- **Dramatic Valleys**: Pareto curves, extreme scale ranges
- **Dynamic Sculptures**: Real-time parameter morphing
- **Collaborative Art**: Multiple people controlling parameters

### **🔬 Physics Education:**
- **Friction Demos**: Ice vs rubber surfaces
- **Gravity Experiments**: Different planetary conditions
- **Curve Mathematics**: Visual neural network functions
- **Cooperative Physics**: Multi-user force interactions

## 🌟 **Ready for Infinite Experimentation!**

**Every aspect of the physics playground is now live-controllable!**
- **Search curves** morph the semantic landscape
- **Physics parameters** change the rules of interaction
- **Tilt controls** stir the gravitational field
- **Material properties** transform surface behavior

**The marble madness physics playground is complete!** 🎱✨🚀

---

**Controllers have total control over the physics universe!** 🌍⚡ 