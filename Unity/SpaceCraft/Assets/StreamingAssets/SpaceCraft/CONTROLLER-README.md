# SpaceCraft Unified Controller System

## Overview

The SpaceCraft Unified Controller is a web-based remote control interface that combines navigation, selection, inspection, and settings into a beautiful tabbed interface. It connects to Unity-based SpaceCraft simulators via Supabase real-time channels.

## Architecture

### Core Classes

1. **BaseController** - Abstract base class with all shared functionality
   - Connection management (Supabase)
   - Command parsing and execution
   - Sound effects and speech synthesis
   - Motion/shake detection
   - Tilt tracking
   - Name management
   - Debug features

2. **Tab** - Abstract base class for all tab implementations
   - Lifecycle management (initialize, activate, deactivate)
   - UI update hooks
   - Reference to parent controller

3. **UnifiedController** - Extends BaseController, manages tabs
   - Creates and manages Tab instances
   - Handles tab switching
   - Delegates UI updates to tabs

### Tab Classes

1. **AboutTab** - Welcome screen and help
   - Displays greeting message
   - Shows ship name (clickable to speak)
   - Provides quick help and gesture guide

2. **NavigateTab** - Pan and zoom controls
   - Touch/mouse input for panning
   - Pinch/wheel for zooming
   - Search box with command support

3. **SelectTab** - Item selection
   - Tap to select
   - Swipe gestures for directional selection
   - Shows selected item info

4. **InspectTab** - Item details
   - Archive.org iframe for selected items
   - JSON view of item metadata

5. **AdjustTab** - Settings and configuration
   - Pan/zoom sensitivity sliders
   - Theme selection (future)
   - Debug mode toggle

### Files

- **controller.html** - The unified controller with tabbed interface
- **controller.js** - All JavaScript classes and logic
- **controller.css** - Unified styling
- **navigator.html** - Standalone navigator (legacy)
- **selector.html** - Standalone selector (legacy)

## Architecture Benefits

### Separation of Concerns
- **BaseController** handles all core functionality
- **UnifiedController** only manages tabs
- **Tab classes** only handle their specific UI
- No duplicate code between tabs

### Extensibility
- Easy to add new tabs
- Tabs are self-contained
- Core functionality is reusable

### Maintainability
- Clear class hierarchy
- Single responsibility principle
- UI logic separated from business logic

## Command System

The controller supports secret text commands in the search box:

### Debug Commands
- `xyzzy`, `plugh`, `sudo` - Enable debug mode
- `debug yes/no` - Toggle debug with parameters

### Navigation
- `reset`, `home`, `center` - Reset view to origin

### Speech (Secret!)
- `hal`, `hello computer` - Enable speech synthesis
- `speak`, `voice` - Alternative speech activation

### Boolean Values (MIT LOGO inspired)
- YES: `yes`, `y`, `t`, `true`, `right`, `1`
- NO: `no`, `n`, `nil`, `f`, `false`, `wrong`, `0`

## Gesture System

All tabs that need gesture input have their own handlers:

### Navigate Tab
- **Drag**: Pan the view
- **Pinch/Scroll**: Zoom in/out
- **Shake**: Directional pan

### Select Tab
- **Tap**: Select item
- **Swipe**: Directional selection
- **Shake**: Same as swipe

## Sound Effects

Comprehensive sound feedback system:
- UI interactions (clicks, toggles)
- Touch feedback (down/up)
- Gesture completion
- Command execution
- State changes

## Adding a New Tab

1. Create a new class extending `Tab`:
```javascript
class MyTab extends Tab {
    constructor(controller) {
        super(controller, 'mytab');
    }
    
    async initialize() {
        await super.initialize();
        // Set up event handlers
    }
    
    updateFromState() {
        // Update UI from controller state
    }
}
```

2. Add HTML for the tab:
```html
<button class="tab-button" data-tab="mytab">My Tab</button>
<div id="mytab-tab" class="tab-pane">
    <!-- Tab content -->
</div>
```

3. Register in UnifiedController:
```javascript
this.tabs = {
    // ... existing tabs
    mytab: new MyTab(this)
};
```

## Best Practices

1. **Keep tabs lightweight** - Only UI logic
2. **Use controller methods** - Don't duplicate functionality
3. **Update through state** - Use `updateFromState()` for UI updates
4. **Handle cleanup** - Use `onDeactivate()` for cleanup
5. **Lazy initialization** - Heavy setup in `initialize()`, not constructor

## Event Flow

1. User interacts with tab UI
2. Tab handler processes input
3. Tab calls controller method
4. Controller updates state/sends to Unity
5. State change triggers `updateUIFromState()`
6. All tabs update via `updateFromState()`

This architecture ensures clean separation between UI and logic, making the system maintainable and extensible. 