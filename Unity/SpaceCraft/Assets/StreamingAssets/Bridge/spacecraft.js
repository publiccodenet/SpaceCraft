'use strict';

// spacecraft.js - Application-specific Bridge logic for SpaceCraft

console.log("[SpacecraftBridge] spacecraft.js Script start");

// Make bridge globally accessible (simple approach)
window.bridge = null;

function InitializeSpacecraftBridge() {
    console.log("[SpacecraftBridge] InitializeSpacecraftBridge called");
    if (window.bridge) {
        console.warn("[SpacecraftBridge] Bridge already initialized.");
        return;
    }

    // Check if the Bridge class is available (loaded from bridge.js)
    if (typeof Bridge === 'undefined') {
         console.error("[SpacecraftBridge] Bridge class not found. Make sure bridge.js is loaded before spacecraft.js");
         return;
    }

    console.log("[SpacecraftBridge] Creating Bridge instance...");
    try {
        window.bridge = new Bridge();
        console.log("[SpacecraftBridge] Bridge instance created.");

        // IMPORTANT: The bridge is usually fully started by a call from Unity 
        // using SendMessage('Bridge', 'StartFromUnity', '{...config...}') 
        // once the Unity side is ready.
        // We don't call bridge.start() here.

        // --- Define functions callable FROM Unity via bridge.evaluateJS or direct JS calls ---
        
        // Example function callable from Unity:
        window.bridge.ShowSimplePopup = function(text) {
            console.log(`[SpacecraftBridge] Unity called ShowSimplePopup with text: ${text}`);
            // Replace alert with more sophisticated UI later if needed
            alert(`Message from Unity: ${text}`); 
        }

        // Add more SpaceCraft-specific bridge functions here...
        
        console.log("[SpacecraftBridge] Initialization complete. Waiting for Unity...");

    } catch (error) {
        console.error("[SpacecraftBridge] Error initializing Bridge:", error);
    }
}

// Make the init function global so index.html can call it
window.InitializeSpacecraftBridge = InitializeSpacecraftBridge;

console.log("[SpacecraftBridge] InitializeSpacecraftBridge function assigned to window.");

// --- IMPORTANT --- 
// Do NOT try to use window.bridge immediately after this script loads.
// It only gets created when InitializeSpacecraftBridge() is called from index.html
// AFTER the Unity instance is being created.

console.log("[SpacecraftBridge] spacecraft.js Script end"); 