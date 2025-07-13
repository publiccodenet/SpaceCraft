# SpaceCraft Development TODO

## Overview

This document tracks the development progress of SpaceCraft, documenting completed features from PR #24 and outlining remaining work. The Unity app is now fun to play with, especially with the improved mouse and keyboard controls. Initial layout thrashing has been reduced (except for one corner item), and these issues can be tweaked once the settings controller is implemented.

## PR #24 Accomplishments

### Controller Unification
- ✅ Unified three controllers (navigator, selector, inspector) into one HTML file
- ✅ Controllers now configured by `type` query parameter
- ✅ HTML files are empty with all content dynamically generated
- ✅ Search input can be optionally enabled by any controller
- ✅ Added search input fields to both selector and navigator

### Physics and Interaction Improvements
- ✅ Overhauled physics system
- ✅ Added tap animation - items pop bigger then smoothly return
- ✅ Tap effect kicks surrounding items creating space
- ✅ Click in Unity app has same swelling effect as tap on selector
- ✅ Dragging and throwing now works in Unity app
- ✅ Shift+arrows thrust currently selected item in arrow direction
- ✅ Items can be flown around and smashed into others to scatter them

### Unity Keyboard Controls
- ✅ WASD still pans the camera
- ✅ Q and E now zoom out and in
- ✅ Arrow keys perform selector gestures (north/south/east/west)
- ✅ Space key performs tap action
- ✅ Shift modifier (or caps-lock toggle) enables thrust mode

### Smart Navigation
- ✅ Smart selector navigation finds nearest item in direction
- ✅ Prefers big items but selects closest small one if no big items in direction
- ✅ Sends gesture dx,dy along with north/south/east/west direction

### Settings Foundation
- ✅ Organized InputManager properties into categories by tweakability
- ✅ Categories: physics simulation, physic materials, rigidbody physics, rotation control, magnetic force physics, search scaling physics, remote control UI parameters, navigator pan/zoom, item interaction, tilt controls, search string, Unity UI desktop controls, mouse controls, camera control, item dragging, keyboard/scroll controls, keyboard physics, camera boundaries, UI interaction
- ✅ Added procedural ParameterMetaData property using reflection
- ✅ ParameterMetaData works in WebGL and generates JSON array of property metadata
- ✅ Each property has: component, name, displayName, type, currentValue, canWrite, category, description, min, max, etc.

## 🐛 Critical Bug to Fix

### Inspector Iframe Mouse Input Blocking
- **Issue**: Inspector disables all mouse input to the Internet Archive page iframe
- **Impact**: Users cannot interact with the web page content
- **Fix**: Remove CSS `pointer-events: none` or similar blocking
- **See**: INSPECTOR-BUG-FIX.md for detailed solution

## Remaining Tasks (Priority Order)

### 1. Search System Enhancement
- [ ] Join multiple controller search strings together with spaces
- [ ] Implement fuzzy search to handle combined queries
- [ ] Support `#keyword` prefix for direct keyword matches
- [ ] Add magic search commands for hidden features (sound, shake, tilt, speech)

### 2. Settings Controller Implementation
- [ ] Create Settings controller UI that reads ParameterMetaData
- [ ] Make spacecraft simulator put ParameterMetaData into Supabase state
- [ ] Enable all controllers to see parameter metadata
- [ ] Implement bridge.update() message passing for parameter changes
- [ ] Add parameter querying support

### 3. Metadata Integration
- [ ] Integrate custom metadata pipeline improvements
- [ ] Include clean keyword list in index-deep.json
- [ ] Make spacecraft simulator.js read keywords and share via Supabase
- [ ] Implement keyword menu presentation in controllers

### 4. Gesture Improvements
- [ ] Real-time gesture tracking preview (hop-pie menus concept)
- [ ] Show target item while dragging gesture
- [ ] Allow drag around to reselect different items before release
- [ ] Base selection on nearest item in precise dx,dy direction

### 5. Motion Controls
- [ ] Hook up tilt controls to selector/other controllers
- [ ] Implement shake-to-tweak functionality
- [ ] Add tilt-to-thrust feature

### 6. Layout and Polish
- [ ] Fix remaining layout thrashing for corner items
- [ ] Fine-tune physics parameters once settings controller works
- [ ] Optimize initial item placement

## Migration from don-searcher Branch

### Phase 1: Custom Metadata System (High Priority)
- [ ] Integrate pipeline.js enhancements
  - [ ] Support for item-custom.json overlay files
  - [ ] Support for cover-custom.jpg custom covers
  - [ ] Support for fully custom items (not from IA)
  - [ ] Deep merge of custom data over IA metadata
- [ ] Copy existing custom metadata files:
  - [ ] doandroidsdreamo00dick_0/item-custom.json
  - [ ] fulgrim_202211/item-custom.json
  - [ ] gigant-manga/item-custom.json
- [ ] Copy existing custom cover:
  - [ ] thedispossessed0000legu/cover.jpg
- [ ] Create custom metadata for top 20 sci-fi books
- [ ] Test pipeline with custom content
- [ ] **See**: CUSTOM-METADATA-GUIDE.md for implementation details

### Phase 2: Tab System Architecture (High Priority)
- [ ] Migrate from type-based to tab-based controller architecture
- [ ] Implement base Tab class
- [ ] Create tab implementations:
  - [ ] AboutTab - Welcome and help
  - [ ] NavigateTab - Pan and zoom
  - [ ] SelectTab - Item selection
  - [ ] InspectTab - Item details (fix mouse input!)
  - [ ] AdjustTab - Settings
- [ ] Update controller.html for tabbed interface
- [ ] Update controller.css for tab styling
- [ ] **See**: TAB-ARCHITECTURE.md for migration guide

### Phase 3: Unity Search Panel (Medium Priority)
- [ ] Integrate SearchPanel.cs component
- [ ] Add search UI to Unity scene
- [ ] Wire up to existing search system
- [ ] Sync search state with controllers
- [ ] Test prefab changes carefully

### Phase 4: Controller Features (Medium Priority)
- [ ] Port anonymous name generation improvements
- [ ] Enhance search query handling (integrates with task #1)
- [ ] Add keyword prefix support (#keyword)
- [ ] Implement magic search commands
- [ ] Join multiple controller search strings

### Phase 5: Build System (Low Priority)
- [ ] Apply Build.cs debug logging improvements
- [ ] Add BUILD_NOTES.md to Unity directory
- [ ] Test symlink removal messages

## Implementation Notes

### DO NOT CHANGE
- ❌ Physics system (keep don-demo physics as-is - do not apply don-searcher physics changes)
- ❌ InputManager.cs (preserve ALL don-demo improvements - don-searcher simplified it too much)
- ❌ WebSites directory (read-only, ignore completely)

### PRESERVE CAREFULLY
- ✅ All InputManager.cs reorganization and improvements
- ✅ Current physics behavior and feel
- ✅ Existing controller connection logic
- ✅ ParameterMetaData system

## Architecture Notes

### Controller Communication
The system now uses a unified controller.html file with dynamic content generation based on the `type` parameter. Controllers communicate with the Unity app through the spacecraft simulator using Supabase for state synchronization.

### Parameter System
The new ParameterMetaData system provides a complete reflection-based interface to Unity's InputManager properties. This enables dynamic UI generation and runtime parameter tweaking without hardcoding property names or types.

### Search Architecture
The planned search system will aggregate queries from multiple controllers, supporting both freeform text and structured keyword searches. The fuzzy search will handle the combined input intelligently, allowing different users to search for different aspects simultaneously. 