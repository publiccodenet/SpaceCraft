import { h2, p, Register } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';

@Register
export class TabMagnet extends TabBase {
  changed() {
    this.render([
      h2('Magnet'),
      p('Magnet'),
    ]);
  }
}

export const tabMagnet = function(arg0: TabBaseProps) {
  return TabMagnet.vConstructor(arg0);
};

// class MagnetTab extends BaseTab {
//   constructor(controller) {
//       super(controller);

//       // Cache for HTML sync optimization
//       this.displayedMagnetNames = [];

//       // Gesture tracking for magnets
//       this.magnetGestures = new Map(); // magnetName -> gestureInstanceId

//       // Track which magnets are being deleted
//       this.deletingMagnets = new Set();
//   }

//   createContent() {
//       this.contentElement = document.createElement('div');
//       this.contentElement.className = 'magnet-content';
//       this.contentElement.style.cssText = `
//           display: flex;
//           flex-direction: column;
//           height: 100%;
//       `;

//       const header = document.createElement('div');
//       header.innerHTML = '<h2>Search Magnets</h2><p>Create magnets to attract related items</p>';
//       header.style.cssText = 'flex-shrink: 0;';
//       this.contentElement.appendChild(header);

//       const controls = document.createElement('div');
//       controls.className = 'magnet-controls';

//       const tagInput = document.createElement('input');
//       tagInput.type = 'text';
//       tagInput.id = 'magnet-tag-input';
//       tagInput.className = 'magnet-tag-input';
//       tagInput.placeholder = 'Magnet Search String';

//       const addButton = document.createElement('button');
//       addButton.id = 'add-magnet';
//       addButton.className = 'magnet-add-button';
//       addButton.textContent = 'Add';

//       // Attach event handlers directly
//       addButton.onclick = (e) => {
//           e.stopPropagation(); // Prevent any parent event handling
//           const tag = tagInput.value.trim();
//           if (tag) {
//               this.addMagnet(tag);
//               tagInput.value = '';
//               tagInput.focus(); // Keep focus for easy multiple additions
//           }
//       };

//       tagInput.onkeypress = (e) => {
//           if (e.key === 'Enter') {
//               addButton.click();
//           }
//       };

//       controls.appendChild(tagInput);
//       controls.appendChild(addButton);
//       this.contentElement.appendChild(controls);

//       const magnetsList = document.createElement('div');
//       magnetsList.id = 'magnets-list';
//       magnetsList.className = 'magnets-list';
//       this.contentElement.appendChild(magnetsList);

//       // Initialize magnet list display
//       this.updateMagnetsList();
//   }

//   activate() {
//       // Initialize orientation tracking when magnet tab becomes active
//       if (!this.controller.motionModule.isOrientationActive) {
//           this.controller.motionModule.initializeOrientationTracking().then(success => {
//               if (success) {
//                   console.log('[Magnet] Device orientation tracking initialized');
//               } else {
//                   console.log('[Magnet] Device orientation tracking failed');
//               }
//           });
//       }

//       // Auto-focus the magnet search input field
//       setTimeout(() => {
//           const magnetInput = document.getElementById('magnet-tag-input');
//           if (magnetInput) {
//               magnetInput.focus();
//           }
//       }, 100); // Small delay to ensure DOM is ready

//       this.updateMagnetsList();
//       console.log('Tab', 'MagnetTab activated');
//   }

//   addMagnet(tag) {
//       // Trim the tag (case preserving) but check for duplicates case-insensitively
//       const trimmedTag = tag.trim();
//       if (!trimmedTag) return;

//       // Get current magnets from simulator state
//       const currentMagnets = this.controller.simulatorState.magnets || [];

//       // Check if magnet with same tag already exists (case-insensitive, trimmed comparison)
//       const existingMagnet = currentMagnets.find(magnet => {
//           return magnet.title.trim().toLowerCase() === trimmedTag.toLowerCase();
//       });

//       if (existingMagnet) {
//           console.log(`[Magnet] Duplicate magnet: "${existingMagnet.title}"`);
//           this.highlightExistingMagnet(existingMagnet.title);
//           return;
//       }

//       // Send AddMagnet event to simulator
//       this.controller.sendAddMagnetEvent(trimmedTag);
//       console.log(`[Magnet] Sent AddMagnet command for: ${trimmedTag}`);
//   }

//   highlightExistingMagnet(magnetName) {
//       const list = document.getElementById('magnets-list');
//       const magnetElement = list.querySelector(`[data-magnet-name="${magnetName}"]`);

//       if (magnetElement && list) {
//           // Scroll to the magnet
//           magnetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

//           // Blink animation
//           const originalBackground = magnetElement.style.background;
//           let blinkCount = 0;
//           const blinkInterval = setInterval(() => {
//               magnetElement.style.background = blinkCount % 2 === 0 ? '#4a4a4a' : originalBackground;
//               blinkCount++;
//               if (blinkCount >= 6) { // 3 full blinks
//                   clearInterval(blinkInterval);
//                   magnetElement.style.background = originalBackground;
//               }
//           }, 200);
//       }
//   }

//   deleteMagnet(magnetName) {
//       // Prevent multiple delete attempts for the same magnet
//       if (this.deletingMagnets.has(magnetName)) {
//           console.log(`[Magnet] Delete already in progress for: ${magnetName}`);
//           return;
//       }

//       // Add to deleting set
//       this.deletingMagnets.add(magnetName);

//       // Find the magnet item and button elements
//       const magnetElement = document.querySelector(`[data-magnet-name="${magnetName}"]`);
//       if (magnetElement) {
//           // Add deleting class to the entire row
//           magnetElement.classList.add('deleting');

//           // Find and disable the delete button
//           const deleteButton = magnetElement.querySelector('.magnet-delete-button');
//           if (deleteButton) {
//               deleteButton.classList.add('deleting');
//               deleteButton.disabled = true;
//           }
//       }

//       // Send DeleteMagnet event to simulator
//       this.controller.sendDeleteMagnetEvent(magnetName);
//       console.log(`[Magnet] Sent DeleteMagnet command for: ${magnetName}`);
//   }

//   updateMagnetsList() {
//       // Don't update if content hasn't been created yet
//       if (!this.contentElement) {
//           return;
//       }

//       const list = document.getElementById('magnets-list');
//       if (!list) {
//           console.error('[MagnetTab] magnets-list element not found');
//           return;
//       }

//       // Get magnets from simulator state
//       const magnets = this.controller.simulatorState.magnets || [];

//       // Extract magnet titles for comparison
//       const magnetTitles = magnets.map(m => m.title);

//       // Compare current magnets to cached displayed magnets
//       const magnetsChanged = !this.arraysEqual(magnetTitles, this.displayedMagnetNames);

//       if (!magnetsChanged) {
//           return;
//       }

//       console.log(`[Magnet] Updating list: ${magnets.length} magnets`);

//       // Tear down and recreate
//       list.innerHTML = '';

//       // Update cache with magnet titles
//       this.displayedMagnetNames = [...magnetTitles];

//       if (magnets.length === 0) {
//           const emptyMsg = document.createElement('div');
//           emptyMsg.className = 'magnet-empty-message';
//           emptyMsg.textContent = 'No magnets created yet';
//           list.appendChild(emptyMsg);
//           return;
//       }

//       magnets.forEach((magnet, index) => {
//           // Handle both old string format and new object format
//           const magnetName = magnet.title;

//           // Create gesture instance for this magnet if not exists
//           if (!this.magnetGestures.has(magnetName)) {
//               this.createMagnetGesture(magnetName);
//           }

//           const item = document.createElement('div');
//           item.className = 'magnet-item';
//           item.dataset.magnetName = magnetName;

//           // Apply deleting state if this magnet is being deleted
//           if (this.deletingMagnets.has(magnetName)) {
//               item.classList.add('deleting');
//           }

//           const nameSpan = document.createElement('span');
//           nameSpan.className = 'magnet-name';
//           nameSpan.textContent = magnetName;

//           // Add touch event handlers to the ENTIRE ROW for dragging (Fitts' Law!)
//           item.addEventListener('touchstart', (e) => this.handleTouchStart(e, magnetName));
//           item.addEventListener('touchmove', (e) => this.handleTouchMove(e));
//           item.addEventListener('touchend', (e) => this.handleTouchEnd(e));
//           item.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));

//           const deleteButton = document.createElement('button');
//           deleteButton.className = 'magnet-delete-button';
//           deleteButton.textContent = 'Delete';

//           // Apply deleting state if this magnet is being deleted
//           if (this.deletingMagnets.has(magnetName)) {
//               deleteButton.classList.add('deleting');
//               deleteButton.disabled = true;
//           }

//           deleteButton.onclick = (e) => {
//               e.stopPropagation(); // Prevent any parent event handling
//               this.deleteMagnet(magnetName);
//           };

//           item.appendChild(nameSpan);
//           item.appendChild(deleteButton);
//           list.appendChild(item);
//       });

//       // Remove gesture instances for magnets that no longer exist
//       for (const [magnetName, gestureInstanceId] of this.magnetGestures.entries()) {
//           const magnetExists = magnets.some(m => {
//               return m.title === magnetName;
//           });

//           if (!magnetExists) {
//               this.removeMagnetGesture(magnetName);
//               // Clean up deleting state when magnet is actually removed
//               this.deletingMagnets.delete(magnetName);
//           }
//       }
//   }

//   onSimulatorStateChange(state) {
//       // Update magnet list when simulator state changes
//       this.updateMagnetsList();
//   }

//   deactivate() {
//       // Deactivate all gesture instances when switching away from magnet tab
//       for (const [magnetName, gestureInstanceId] of this.magnetGestures.entries()) {
//           const gestureInstance = this.controller.gestureService.getGestureInstance(gestureInstanceId);
//           if (gestureInstance && gestureInstance.isActive) {
//               this.controller.gestureService.deactivateTarget();
//           }
//       }

//       console.log('Tab', 'MagnetTab deactivated');
//   }

//   /**
//    * Helper method to compare two arrays for equality
//    */
//   arraysEqual(a, b) {
//       if (a.length !== b.length) return false;
//       for (let i = 0; i < a.length; i++) {
//           if (a[i] !== b[i]) return false;
//       }
//       return true;
//   }

//   /**
//    * Create a gesture instance for a magnet
//    */
//   createMagnetGesture(magnetName) {
//       const gestureInstanceId = `magnet-${magnetName}`;

//       const gestureInstance = new GestureServiceInstance({
//           targetId: gestureInstanceId,
//           propertyName: 'magnetPosition',

//           // Drag configuration for position control
//           dragScaleFactor: 0.01,
//           dragDeadZone: 1.0,

//           // Tilt configuration for continuous movement
//           tiltScaleFactor: 2.0,
//           tiltDeadZoneRadius: 0.1,
//           tiltMaxRadius: 0.5,

//           // Twist configuration for strength control (future)
//           twistScaleFactor: 1.0,
//           twistDeadZoneRadius: 0.05,
//           twistMaxRadius: 1.0,

//           // Callbacks
//           onDrag: (deltaX, deltaZ, touchId) => {
//               this.controller.sendPushMagnetEvent(magnetName, deltaX, deltaZ);
//           },

//           onTilt: (deltaX, deltaZ, touchId) => {
//               this.controller.sendPushMagnetEvent(magnetName, deltaZ, deltaZ);
//           },

//           onTwist: (strengthDelta, direction, touchId) => {
//               // TODO: Future - send magnet strength change command

//           },

//           onSelect: () => {
//               console.log(`[Magnet] Selected: ${magnetName}`);
//           },

//           onDeselect: () => {
//               console.log(`[Magnet] Deselected: ${magnetName}`);
//           }
//       });

//       // Register with gesture service
//       this.controller.gestureService.registerTarget(gestureInstanceId, gestureInstance);
//       this.magnetGestures.set(magnetName, gestureInstanceId);
//   }


//   /**
//    * Remove gesture instance for a magnet
//    */
//   removeMagnetGesture(magnetName) {
//       const gestureInstanceId = this.magnetGestures.get(magnetName);
//       if (gestureInstanceId) {
//           this.controller.gestureService.unregisterTarget(gestureInstanceId);
//           this.magnetGestures.delete(magnetName);
//       }
//   }


//   /**
//    * Handle touch start on magnet - use gesture service
//    */
//   handleTouchStart(e, magnetName) {
//       e.preventDefault();

//       const gestureInstanceId = this.magnetGestures.get(magnetName);
//       if (!gestureInstanceId) {
//           console.error(`[MagnetTab] No gesture instance found for magnet: ${magnetName}`);
//           return;
//       }

//       // Process all touches for this magnet
//       for (let touch of e.changedTouches) {
//           this.controller.gestureService.handleTouchStart(touch, gestureInstanceId);
//       }
//   }


//   /**
//    * Handle touch move - use gesture service
//    */
//   handleTouchMove(e) {
//       e.preventDefault();

//       for (let touch of e.changedTouches) {
//           this.controller.gestureService.handleTouchMove(touch);
//       }
//   }


//   /**
//    * Handle touch end - use gesture service
//    */
//   handleTouchEnd(e) {
//       for (let touch of e.changedTouches) {
//           this.controller.gestureService.handleTouchEnd(touch);
//       }
//   }
// }