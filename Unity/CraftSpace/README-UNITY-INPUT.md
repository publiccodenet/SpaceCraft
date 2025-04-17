# Unity Input System

## Multi-Platform Input Architecture

CraftSpace uses Unity's new Input System to provide a consistent experience across:

- Desktop (mouse/keyboard)
- Mobile (touch)
- Tablets (touch/pencil)
- WebGL (browser-specific inputs)
- Installation contexts (multiple devices)

This input architecture abstracts physical inputs into logical actions, allowing the same core functionality across all platforms.

## Input Actions

The system is built around semantic actions rather than device-specific inputs:

| Action       | Desktop         | Mobile           | Multi-User      |
|--------------|-----------------|------------------|-----------------|
| Navigate     | WASD/Arrows     | Touch drag       | Device tilt     |
| Select       | Mouse click     | Tap              | Tap             |
| Zoom         | Mouse wheel     | Pinch            | Move device     |
| Rotate       | Right-drag      | Two-finger twist | Device rotation |
| Context Menu | Right-click     | Long press       | Two-finger tap  |
| Quick Action | Space           | Quick flick      | Device shake    |

## Gesture Recognition

The input system recognizes complex gestures:

- **Swipe**: Quick directional movement
- **Pinch/Spread**: Two-finger zoom
- **Rotate**: Two-finger rotation
- **Flick**: Quick swipe with release
- **Shake**: Rapid device movement
- **Tilt**: Device orientation change

Implementation:
```csharp
// Example of gesture detection
public class GestureDetector : MonoBehaviour
{
    // Configurable thresholds
    public float swipeThreshold = 50f;
    public float flickSpeedThreshold = 1000f;
    
    // Event callbacks
    public UnityEvent<Vector2> onSwipe;
    public UnityEvent<Vector2, float> onPinch;
    
    // Input action references
    private InputAction touchPositionAction;
    private InputAction touchPhaseAction;
    
    // Process touch input for gestures
    private void ProcessTouchGestures()
    {
        // Implementation details...
    }
}
```

## Motion Controls

For mobile and installation contexts, device motion is leveraged:

- **Accelerometer**: Detect movement intensity and direction
- **Gyroscope**: Track device orientation
- **Compass**: Determine real-world orientation
- **Fusion**: Combine sensors for accurate tracking

## Accessibility Features

The input system includes accessibility considerations:

- **Adjustable Sensitivity**: Customizable response curves
- **Alternative Input Methods**: Support for assistive devices
- **Simplified Controls**: Optional reduced complexity mode
- **Visual Feedback**: Clear indication of input recognition
- **Remapping**: User-definable input bindings

## Multi-User Input

For collaborative experiences:

- **Input Identification**: Track which user provided input
- **Input Merging**: Combine inputs from multiple users
- **Conflict Resolution**: Handle contradictory inputs
- **Synchronized Feedback**: Show each user's input to others

## WebGL-Specific Optimizations

For the primary WebGL context:

- **Polling Optimization**: Efficient input sampling
- **Touch Handling**: Proper touch event capture
- **Browser Gestures**: Preventing browser interference
- **Fallbacks**: Graceful degradation for unsupported features

## Input Debugging

Tools for testing and debugging input:

- **Visual Input Display**: On-screen input visualization
- **Input Recording**: Capture and replay input sequences
- **Input Simulation**: Test touch/motion without devices
- **Analytics**: Collect usage patterns for refinement

## Game Controller & Sensor Support

The New Input System provides rich support for external devices:

### Game Controllers

```csharp
// Controller binding example
playerControls.Gameplay.Navigate.AddCompositeBinding("Dpad")
    .With("Up", "<Gamepad>/dpad/up")
    .With("Down", "<Gamepad>/dpad/down")
    .With("Left", "<Gamepad>/dpad/left")
    .With("Right", "<Gamepad>/dpad/right");
```

- **Cross-Platform Controller Support**: Xbox, PlayStation, generic controllers
- **Bluetooth Controllers**: Works with mobile-connected controllers
- **Adaptive Bindings**: Controller type detected and bindings adjusted
- **Fallback Support**: Graceful degradation when controllers disconnect

### Device Sensors

The Input System provides unified access to mobile device sensors:

- **Accelerometer**: Movement detection with gravity compensation
- **Gyroscope**: Precise rotation tracking
- **Attitude Sensors**: Device orientation in space
- **User Acceleration**: Movement without gravity component
- **Rotation Rate**: Angular velocity tracking

These can be combined for sophisticated motion controls:

```csharp
// Example: Combined sensor input for magic carpet control
void Update()
{
    // Get user acceleration (movement without gravity)
    Vector3 acceleration = InputSystem.GetDevice<Accelerometer>().acceleration.ReadValue();
    
    // Get device orientation
    Quaternion attitude = InputSystem.GetDevice<AttitudeSensor>().attitude.ReadValue();
    
    // Combine into movement intent
    Vector3 moveIntent = attitude * acceleration * sensitivityFactor;
    
    // Apply to magic carpet movement
    carpetController.ApplyMovement(moveIntent);
}
``` 