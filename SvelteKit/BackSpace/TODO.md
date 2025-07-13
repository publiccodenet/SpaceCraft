# SpaceCraft Development TODO

## Overview

This document tracks the development progress of SpaceCraft. The Unity app is now fun to play with, especially with the improved mouse and keyboard controls. Initial layout thrashing has been reduced (except for one corner item), and these issues can be tweaked once the settings controller is implemented.

## Completed Work

### PR #24 Features

#### Controller Unification
- ✅ Unified three controllers (navigator, selector, inspector) into one HTML file
- ✅ Controllers now configured by `type` query parameter
- ✅ HTML files are empty with all content dynamically generated
- ✅ Search input can be optionally enabled by any controller
- ✅ Added search input fields to both selector and navigator

#### Physics and Interaction Improvements
- ✅ Overhauled physics system
- ✅ Added tap animation - items pop bigger then smoothly return
- ✅ Tap effect kicks surrounding items creating space
- ✅ Click in Unity app has same swelling effect as tap on selector
- ✅ Dragging and throwing now works in Unity app
- ✅ Shift+arrows thrust currently selected item in arrow direction
- ✅ Items can be flown around and smashed into others to scatter them

#### Unity Keyboard Controls
- ✅ WASD still pans the camera
- ✅ Q and E now zoom out and in
- ✅ Arrow keys perform selector gestures (north/south/east/west)
- ✅ Space key performs tap action
- ✅ Shift modifier (or caps-lock toggle) enables thrust mode

#### Smart Navigation
- ✅ Smart selector navigation finds nearest item in direction
- ✅ Prefers big items but selects closest small one if no big items in direction
- ✅ Sends gesture dx,dy along with north/south/east/west direction

#### Settings Foundation
- ✅ Organized InputManager properties into categories by tweakability
- ✅ Categories include: physics simulation, physic materials, rigidbody physics, rotation control, magnetic force physics, search scaling physics, remote control UI parameters, navigator pan/zoom, item interaction, tilt controls, keyboard/scroll controls, camera boundaries, UI interaction
- ✅ Added procedural ParameterMetaData property using reflection
- ✅ ParameterMetaData works in WebGL and generates JSON array of property metadata
- ✅ Each property has: component, name, displayName, type, currentValue, canWrite, category, description, min, max, etc.

### Recent Accomplishments (Chronological Order)

#### Git LFS JSON File Recovery
- ✅ Fixed critical JSON file corruption from Git LFS tracking
  - 1496 JSON files were being tracked by Git LFS due to invalid .gitattributes rules
  - Migrated all files out of LFS using `git lfs migrate export`
  - Removed invalid `size=">1M"` syntax from all .gitattributes
  - All JSON files successfully converted from LFS pointers to real JSON

#### Metadata System Implementation
- ✅ Integrated custom metadata pipeline enhancements
  - Support for item-custom.json overlay files
  - Support for cover-custom.jpg custom covers
  - Support for fully custom items (not from IA) with spacecraft_custom_item flag
  - Deep merge of custom data over IA metadata
- ✅ Implemented spacecraft_ prefix convention across entire codebase
  - Migrated from spaceCraftTags to spacecraft_tags
  - All LLM-generated content uses spacecraft_ prefix
  - Updated pipeline to collect spacecraft_tags into keywords array
- ✅ Added spacecraft_custom_url support - Inspector checks for custom URLs first
- ✅ Made spacecraft.js read keywords and share via Supabase state
- ✅ Implemented keyword menu presentation in controllers
  - Added # button with dropdown menu
  - Click to add keywords to search
- ✅ Created comprehensive CUSTOM-METADATA.md documentation
- ✅ Created The Dispossessed as example custom item with full metadata

#### Inspector UI Enhancement
- ✅ Enabled full mouse interaction with Internet Archive iframe
  - Resolved issue where inspector was blocking mouse input to IA pages
  - Updated controller.css to properly handle iframe z-index
  - Modified InspectorController to hide UI elements when iframe loads
  - Shows ONLY iframe content when item is selected

#### Console Spam Cleanup
- ✅ Commented out repetitive console logs that were flooding output:
  - CollectionsView.cs: UpdateDetailPanel spam ("Found highlighted item", "Will display")
  - ItemView.cs: Texture application and BookCoverBox collider update logs
  - BridgeObject.cs: Bridge update event spam
  - spacecraft.js: Presence sync, new client registrations, presences joined/left
- ✅ Console is now much cleaner and easier to debug

#### UI/UX Improvements
- ✅ Fixed detail panel to show SELECTED items only (was incorrectly prioritizing highlighted)
- ✅ Implemented clever debouncing for inspector iframe URL changes:
  - First load happens immediately
  - Rate limiting prevents loading more than once per second
  - Trailing edge debounce waits for 1 second of silence after rapid changes
  - Prevents iframe thrashing while navigating quickly through items

#### Custom Metadata Migration from don-searcher
- ✅ Migrated and properly formatted custom metadata files from don-searcher branch
  - doandroidsdreamo00dick_0 (Do Androids Dream of Electric Sheep?) - converted to spacecraft_custom_item
  - fulgrim_202211 (Fulgrim: The Palatine Phoenix) - converted to spacecraft_custom_item
  - gigant-manga (GIGANT manga) - converted to spacecraft_custom_item
  - thedispossessed0000legu (The Dispossessed) - verified already correctly formatted
  - All items now follow documented pattern: item.json with spacecraft_custom_item + item-custom.json overlay

## Remaining Work

### High Priority

#### Create Custom Metadata for Top Sci-Fi Books
- [ ] Create custom metadata for top 20 sci-fi books (4 done, 16 to go)
- [ ] Follow established pattern: item.json with spacecraft_custom_item + item-custom.json overlay
- [ ] Add spacecraft_tags for genre classification
- [ ] Keep descriptions concise and engaging
- [ ] Add spacecraft_custom_url for items with good external resources

#### Tab System Architecture
- [ ] Migrate from type-based to tab-based controller architecture
- [ ] Implement base Tab class
- [ ] Create tab implementations:
  - [ ] AboutTab - Welcome and help
  - [ ] NavigateTab - Pan and zoom
  - [ ] SelectTab - Item selection
  - [ ] InspectTab - Item details
  - [ ] AdjustTab - Settings
- [ ] Update controller.html for tabbed interface
- [ ] Update controller.css for tab styling
- [ ] **See**: TAB-ARCHITECTURE.md for migration guide

#### Settings Controller Implementation
- [ ] Create Settings controller UI that reads ParameterMetaData
- [ ] Make spacecraft simulator put ParameterMetaData into Supabase state
- [ ] Enable all controllers to see parameter metadata
- [ ] Implement bridge.update() message passing for parameter changes
- [ ] Add parameter querying support

### Medium Priority

#### Search System Enhancement
- [ ] Join multiple controller search strings together with spaces
- [ ] Implement fuzzy search to handle combined queries
- [ ] Support `#keyword` prefix for direct keyword matches
- [ ] Add magic search commands for hidden features (sound, shake, tilt, speech)
- [ ] Port anonymous name generation improvements

#### Unity Search Panel
- [ ] Integrate SearchPanel.cs component
- [ ] Add search UI to Unity scene
- [ ] Wire up to existing search system
- [ ] Sync search state with controllers
- [ ] Test prefab changes carefully

#### Gesture Improvements
- [ ] Real-time gesture tracking preview (hop-pie menus concept)
- [ ] Show target item while dragging gesture
- [ ] Allow drag around to reselect different items before release
- [ ] Base selection on nearest item in precise dx,dy direction

#### Motion Controls
- [ ] Hook up tilt controls to selector/other controllers
- [ ] Implement shake-to-tweak functionality
- [ ] Add tilt-to-thrust feature

### Low Priority

#### Layout and Polish
- [ ] Fix remaining layout thrashing for corner items
- [ ] Fine-tune physics parameters once settings controller works
- [ ] Optimize initial item placement

#### Build System
- [ ] Apply Build.cs debug logging improvements
- [ ] Add BUILD_NOTES.md to Unity directory
- [ ] Test symlink removal messages

## Technical Documentation

### Implementation Guidelines

#### DO NOT CHANGE
- ❌ Physics system (keep don-demo physics as-is - do not apply don-searcher physics changes)
- ❌ InputManager.cs (preserve ALL don-demo improvements)
- ❌ WebSites directory (read-only, ignore completely)

#### PRESERVE CAREFULLY
- ✅ All InputManager.cs reorganization and improvements
- ✅ Current physics behavior and feel
- ✅ Existing controller connection logic
- ✅ ParameterMetaData system

### Architecture Notes

#### Controller Communication
The system uses a unified controller.html file with dynamic content generation based on the `type` parameter. Controllers communicate with the Unity app through the spacecraft simulator using Supabase for state synchronization.

#### Parameter System
The ParameterMetaData system provides a complete reflection-based interface to Unity's InputManager properties. This enables dynamic UI generation and runtime parameter tweaking without hardcoding property names or types.

#### Search Architecture
The planned search system will aggregate queries from multiple controllers, supporting both freeform text and structured keyword searches. The fuzzy search will handle the combined input intelligently, allowing different users to search for different aspects simultaneously.

#### Custom Metadata System
All custom metadata uses the spacecraft_ prefix convention to avoid namespace collisions. LLM-generated content goes in item-custom.json files which are merged with base metadata at pipeline time. The UI prefers spacecraft_ fields when available (e.g., spacecraft_description over description). 