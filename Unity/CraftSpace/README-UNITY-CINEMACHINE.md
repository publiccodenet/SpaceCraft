# Cinemachine Camera System

## Cinemachine Overview

CraftSpace uses Unity's Cinemachine to create dynamic, responsive camera behaviors that enhance the exploration of digital collections. This powerful camera system enables:

- **Procedural Camera Movement**: Algorithm-driven camera positioning and movement
- **Smooth Transitions**: Polished blending between different camera views
- **Context-Aware Framing**: Smart composition based on content
- **Device-Controlled Navigation**: Mobile devices as camera controllers
- **Multi-User Camera Orchestration**: Coordinated views across devices

## Camera Design Philosophy

Our camera system follows these principles:

1. **Embodied Navigation**: Camera movement feels physical and intuitive
2. **Content-Aware Framing**: Camera positions emphasize important content
3. **Cinematic Language**: Using film techniques for effective storytelling
4. **Responsive Feel**: Camera reacts immediately to user input
5. **Spatial Awareness**: Maintaining user's sense of location within the collection

## Core Camera Types

CraftSpace implements several virtual camera types:

### 1. Overview Camera
- High-level view of entire collection
- Provides context and orientation
- Smooth orbiting capability

### 2. Browse Camera
- Mid-level view for browsing multiple items
- Tracks along content "shelves" or "walls"
- Maintains consistent framing of browsable content

### 3. Detail Camera
- Close-up view of individual items
- Smart framing to highlight details
- Subtle motion to maintain visual interest

### 4. Magic Carpet Camera
- User-controlled "flying" camera
- Physics-based movement with momentum
- Tilt/lean control from mobile devices

## Device Motion Integration

Cinemachine integrates with device motion sensors:

```csharp
// Example of device tilt controlling camera
void Update()
{
    // Get device orientation
    Vector3 acceleration = Input.acceleration;
    
    // Apply to camera using Cinemachine
    var composer = virtualCamera.GetCinemachineComponent<CinemachineComposer>();
    composer.m_TrackedObjectOffset = new Vector3(
        acceleration.x * tiltFactor,
        acceleration.y * tiltFactor,
        0
    );
    
    // Add shake detection
    if (IsShaking(acceleration, accelerationThreshold))
    {
        CinemachineImpulseManager.Instance.GenerateImpulse(shakeForce);
    }
}
```

## Magic Carpet Mode

The signature "Magic Carpet" camera mode creates an embodied flying experience:

- **Device Tilt**: Lean phone to steer
- **Movement Physics**: Acceleration and momentum
- **Altitude Control**: Vertical movement options
- **Context Awareness**: Smart obstacle avoidance
- **Visual Feedback**: Environmental effects based on speed/height

## Collaborative Camera Control

For multi-user experiences:

- **Input Blending**: Combines input from multiple users
- **Intention Reconciliation**: Resolves conflicting navigation goals 
- **Collaborative Boosts**: Speed increases when users work together
- **Shared Focus**: Special "look at this" highlighting feature
- **Teacher/Student Mode**: One user can guide others' views

## Camera Effects

Cinemachine provides sophisticated camera effects:

- **Impulse System**: Camera shake and reactions
- **Noise Profiles**: Natural handheld-style motion
- **Dynamic Composition**: Rule-of-thirds framing
- **Follow Damping**: Smooth tracking with variable lag
- **Extension Methods**: Custom behaviors for specific needs

## Performance Considerations

Optimizations for WebGL and multi-device scenarios:

- **LOD Integration**: Camera distance affects detail level
- **Culling Optimization**: Only render what's in view
- **Smoothing Simplification**: Reduced computation in WebGL
- **Network Synchronization**: Efficient camera state sharing
- **Priority Adjustments**: Dynamic quality based on performance 

## Resolution-Aware Zoom Dynamics

CraftSpace implements an innovative "spring-loaded" zoom system that enhances the browsing experience:

### Optimal Viewing Distance Snapping

- **Resolution-Matched Distances**: Camera naturally settles at distances optimal for each resolution tier
- **Spring Physics**: Zoom momentum gradually slows and snaps to predetermined viewing distances
- **Crisp Visualization**: Ensures content is always viewed at distances where it appears sharpest
- **Subtle Guidance**: Gently guides users to ideal viewing distances without forcing them

```
Distance Tiers:
┌───────────────────┐
│ Ultra-Distant     │ → Single pixel (1×1) color representation
├───────────────────┤
│ Very Distant      │ → Ultra-low resolution (2×3, 4×6) fingerprint
├───────────────────┤
│ Distant           │ → BlurHash (8×8, 16×16) representation
├───────────────────┤
│ Browsing Distance │ → Texture atlas thumbnails
├───────────────────┤
│ Close Viewing     │ → Standard resolution
├───────────────────┤
│ Detailed Viewing  │ → High-resolution individual  
├───────────────────┤
│ Immersive Viewing │ → Ultra-high resolution (tile pyramids)
└───────────────────┘
```

### Projection Blending

- **Dynamic Projection**: Smooth transition between perspective and orthographic projection
- **Distant View**: Perspective projection when viewing collections from above/distance
- **Mid-Range View**: Blended projection during browsing and navigation
- **Close-Up View**: Orthographic projection for detailed examination of content
- **Google Earth-Style**: Similar to the seamless transition from globe to map to street view

### Navigation Mode Transitions

The camera system automatically adjusts interaction mode based on zoom level:

1. **Flying Mode**: At distant views, camera moves with fluid, flight-like controls
2. **Browsing Mode**: At mid-range, movement follows shelves and organizational structures
3. **Walking Mode**: At close zoom levels, switches to first-person-like navigation
4. **Inspection Mode**: At very close range, orbits around specific items

### Implementation Approach

The spring dynamics use a carefully tuned physical system:

- **Dampened Springs**: Camera distance uses spring physics with configurable damping
- **Target Zones**: Predefined optimal viewing distances for each resolution tier
- **Attractive Forces**: Increasing attractive force as camera approaches an optimal distance
- **Override Control**: Users can still manually control exact position if desired
- **Scroll Sensitivity**: Dynamic scroll wheel sensitivity based on current zoom level

This approach ensures that the transition between different resolution representations feels natural and content is always viewed at its best possible quality.

### Motion-Based Zoom Control

On mobile devices, users can control zoom intuitively through physical movement:

- **Distance Control**: Moving the device closer to or further from the user's body controls zoom level
- **Screen-Normal Movement**: System tracks movement perpendicular to the screen plane
- **Inertial Dampening**: Physical movements use the same spring physics as scroll wheel
- **Resolution Snapping**: Physical movements still benefit from optimal distance settling
- **Natural Interaction**: Mimics the natural behavior of moving closer to see details

This creates an embodied zoom experience where users physically move closer to inspect items of interest, just as they would in the physical world. The system still applies the spring-loaded snapping to ensure optimal viewing at each resolution tier, while allowing the intuitive physical control.

```
┌─────────────┐              ┌─────────────┐
│             │ Move device  │             │
│    Zoom     │ away from    │ Ultra-      │
│    Out      │ user         │ Distant     │
│             │◄─────────────│             │
└─────────────┘              └─────────────┘
                                   ▲
                                   │
                                   │
                              ┌────┴────┐
                              │         │
                              │  User   │
                              │         │
                              └────┬────┘
                                   │
                                   │
                                   ▼
┌─────────────┐              ┌─────────────┐
│             │ Move device  │             │
│    Zoom     │ toward       │ Detailed    │
│    In       │ user         │ View        │
│             │◄─────────────│             │
└─────────────┘              └─────────────┘
```

Combined with device tilt for navigation direction, this motion-based zoom control creates a comprehensive embodied control system where physical movements directly and intuitively map to virtual camera behaviors. 