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

## Architecture Notes

### Controller Communication
The system now uses a unified controller.html file with dynamic content generation based on the `type` parameter. Controllers communicate with the Unity app through the spacecraft simulator using Supabase for state synchronization.

### Parameter System
The new ParameterMetaData system provides a complete reflection-based interface to Unity's InputManager properties. This enables dynamic UI generation and runtime parameter tweaking without hardcoding property names or types.

### Search Architecture
The planned search system will aggregate queries from multiple controllers, supporting both freeform text and structured keyword searches. The fuzzy search will handle the combined input intelligently, allowing different users to search for different aspects simultaneously. 