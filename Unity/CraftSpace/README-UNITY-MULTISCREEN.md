# Multi-Screen Unity Architecture

## Multi-Screen Experience Overview

CraftSpace supports sophisticated multi-screen installations where:

- **Coordinated Displays**: Multiple screens showing complementary views
- **Device Handoff**: Content can move between screens
- **Spatial Awareness**: Screens "know" their physical relationship to each other
- **Role-Based Views**: Different screens serve different functions
- **Synchronized Exploration**: Cohesive experience across displays

## Physical Configuration Types

The system supports various physical arrangements:

### 1. Wall Array
- Linear or grid arrangement of displays
- Continuous visual space across screens
- Parallax effects as users move

### 2. Immersive Surround
- Displays surrounding users (180° or 360°)
- Peripheral awareness with focused center
- Spatial audio tied to visual position

### 3. Table + Vertical Displays
- Horizontal touch surface for overview/control
- Vertical displays for detailed content
- Physical/digital interaction blend

### 4. Mobile + Fixed Displays
- Personal devices paired with large displays
- Private/public information separation
- Personal controls affecting shared views

## Unity Implementation Approach

### Screen Coordination System

```csharp
// Screen manager handling multi-display coordination
public class ScreenOrchestrator : MonoBehaviour
{
    // Registered displays
    private Dictionary<string, DisplayNode> displays = new Dictionary<string, DisplayNode>();
    
    // Content currently visible on each display
    private Dictionary<string, List<string>> displayContent = new Dictionary<string, List<string>>();
    
    // Register a new display with the system
    public void RegisterDisplay(string displayId, DisplayRole role, Vector3 physicalPosition)
    {
        displays[displayId] = new DisplayNode {
            Id = displayId,
            Role = role,
            PhysicalPosition = physicalPosition,
            IsActive = true
        };
        
        // Initialize content tracking
        displayContent[displayId] = new List<string>();
        
        // Notify other displays of new participant
        BroadcastDisplayChange();
    }
    
    // Move content between displays
    public void TransferContent(string contentId, string sourceDisplayId, string targetDisplayId)
    {
        // Implementation details...
    }
}
```

### Display Types and Roles

Each display can serve different roles:

- **Overview Display**: Shows entire collection context
- **Detail Display**: Shows focused item details
- **Browser Display**: For scrolling through items
- **Control Display**: Primary interaction surface
- **Ambient Display**: Peripheral awareness information

## Content Synchronization

Methods for keeping content synchronized:

- **State Synchronization**: Core state shared across displays
- **Distributed Rendering**: Each view renders appropriate perspective
- **Client-Server Model**: Central coordinator for consistency
- **Event Broadcasting**: Key events propagated to all displays

## User Identification and Tracking

Identifying and tracking users across displays:

- **Device Association**: Linking mobile devices to users
- **Proximity Detection**: Using Bluetooth/NFC for presence
- **Session Persistence**: Maintaining user context across displays
- **Handoff Protocols**: Smooth transition between devices

## Special Interactions

Unique multi-screen interactions:

- **Throw/Catch**: Flick content from one screen to another
- **Expand/Contract**: Content flowing between overview and detail screens
- **Shadow Play**: Actions on one screen casting shadows on others
- **Reveal**: Using personal device as "magic lens" to reveal hidden content

## Network Architecture

Networking considerations:

- **Connection Management**: Robust handling of device joining/leaving
- **Bandwidth Optimization**: Efficient message passing
- **Latency Compensation**: Techniques to hide network delays
- **Fault Tolerance**: Graceful handling of connection issues

## Installation Guide

Key considerations for physical installation:

- **Hardware Requirements**: Recommended specs for each display type
- **Network Setup**: Optimal configuration for synchronization
- **Physical Layout**: Guidelines for spatial arrangement
- **Calibration Tools**: Aligning physical and digital space
- **Testing Protocols**: Validation procedures 