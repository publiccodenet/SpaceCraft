////////////////////////////////////////////////////////////////////////
// mindtwin.js
// Unity3D / JavaScript Bridge to Mindtwin
// Don Hopkins, Ground Up Software.


"use strict";


////////////////////////////////////////////////////////////////////////
// Mindtwin


class Mindtwin {


    constructor(bridge)
    {
        console.log("Mindtwin.constructor: this:", this, "bridge:", bridge);
        this.bridge = bridge;
        this.start();
    }


    start()
    {
        var bridge = this.bridge;
        var world = this.bridge.world;

        world.eventSystem = bridge.createObject({
            prefab: 'Prefabs/EventSystem',
        });

        world.leanTweenBridge = bridge.createObject({
            "prefab": "Prefabs/LeanTweenBridge",
            "update": {
                "maxTweens": 10000
            },
        });

        world.keyboardTracker = bridge.createObject({
            prefab: 'Prefabs/KeyboardTracker', 
            update: {
                tracking: true,
                inputStringTracking: true,
                keyEventTracking: true
            },
            interests: {
                InputString: {
                    query: {
                        inputString: "inputString"
                    },
                    handler: (obj, results) => {
                        console.log("KeyboardTracker: InputString: inputString: " + results.inputString);
                        //TrackInputString(results.inputString);
                    }
                },
                KeyEvent: {
                    query: {
                        character: "keyEvent/character",
                        keyCode: "keyEvent/keyCode",
                        type: "keyEvent/type/method:ToString",
                        modifiers: "keyEvent/modifiers",
                        mousePosition: "keyEvent/mousePosition"
                    },
                    handler: (obj, results) => {
                        // Remember modifiers for other code to check.
                        obj.modifiers = {};
                        if (results.modifiers) {
                            results.modifiers.split(",").forEach((token) => {
                                token = token.trim();
                                obj.modifiers[token] = true;
                            });
                        }

                        console.log("KeyboardTracker: KeyEvent: results: " + JSON.stringify(results), "modifiers:", JSON.stringify(obj.modifiers));

                        //TrackKeyEvent(results);
                    },
                },
            },
        });

        world.textOverlays = bridge.createObject({
            prefab: 'Prefabs/TextOverlays',
            obj: {
                canvasWidth: 0,
                canvasHeight: 0,
                infoPanelCache: { name: 'infoPanelCache' },
                sidePanelVisible: false,
                sidePanelDrawer: null,
                sidePanelCache: { name: 'sidePanelCache' },
            },
            interests: {
                ResizeCanvas: {
                    query: {
                        canvasWidth: 'canvasWidth',
                        canvasHeight: 'canvasHeight',
                    },
                    handler: (obj, results) => {
                        //console.log("TextOverlays ResizeCanvas", JSON.stringify(results));
                        world.textOverlays.canvasWidth = results.canvasWidth;
                        world.textOverlays.canvasHeight = results.canvasHeight;
                    },
                },
            },
        });

        world.tile = bridge.createObject({
            prefab: 'Prefabs/Tile',
            component: 'Tracker',
            obj: {
                textOverlay: world.textOverlay,
            },
            update: {
                "gameObject/layer": 17,
                "transform/localPosition": { x: 8, y: 25, z: 18 },
                "transform/localScale": { x: 12, y: 3, z: 1 },
                "transform/rotation": { yaw: 180 },
                "component:MeshRenderer/material/color": { r: 0.5, g: 1, b: 0.5 }
            },
            interests: {
                MouseDown: {
                    query: {
                        screenPosition: 'screenPosition',
                        screenSize: 'screenSize',
                        shiftKey: 'shiftKey',
                        controlKey: 'controlKey',
                        altKey: 'altKey',
                    },
                    handler: (obj, results) => {
                        console.log("Tile: MouseDown: results:", results);
                    }
                }
            },
        });
        
        this.showPopupText("Hello, world!", 'object:' + world.tile.id + '/transform');

        //this.getSkeleton();

        console.log("bridge:", bridge, "world:", world);

    }

    showPopupText(text, xform)
    {
        var bridge = this.bridge;
        var world = bridge.world;

        if (!world.popupText) {
            world.popupText = bridge.createObject({
                prefab: 'Prefabs/OverlayText',
                parent: 'object:' + world.textOverlays.id + '/overlay',
                update: {
                    'textMesh/fontSize': 80,
                    'textMesh/color': { r: 0, g: 0, b: 0 },
                    'textMesh/alignment': 'center',
                    'component:RectTransform/pivot': { x: 0.5, y: 0.5 },
                    'screenOffset': { x: 0, y: 0 },
                },
            });
        }

        bridge.updateObject(world.popupText, {
            'textMesh/text': text,
            'trackPosition': 'Transform',
            'transformPosition!': xform,
            'gameObject/method:SetActive': [true],
        });
    }


    hidePopupText()
    {
        var bridge = this.bridge;
        var world = bridge.world;

        if (!world.popupText) {
            return;
        }

        bridge.updateObject(world.popupText, {
            'trackPosition': 'Hidden',
        });

    }


    getSkeleton()
    {
        var bridge = this.bridge
        var world = bridge.world;

        var mindtwin_path = "targetTransform/component:MindtwinManager/Packages/index:0";

        bridge.queryObject(bridge, {
            mindtwin_id: mindtwin_path + "/id:",
            root_transform_id: mindtwin_path + "/Face/FaceGeo/transform/id:",
        }, results => {
            var outstanding = 1; // Count the original query for the root.
            var root_node = null;
            console.log('Mindtwin.getSkeleton: results:', results);
            function getNode(path) {
                var node = {
                    path: path,
                    children: [],
                };
                bridge.queryObject(bridge, {
                    id: path + '/id:',
                    name: path + '/gameObject/name',
                    childCount: path + '/childCount',
                    localPosition: path + '/localPosition',
                    localRotation: path + '/localRotation',
                    localScale: path + '/localScale',
                }, results => {
                    Object.assign(node, results);
                    var childCount = results.childCount;
                    childCount = Math.min(childCount, 10); // woah there!
                    for (var i = 0; i < childCount; i++) {
                        var subNode = getNode('object:' + results.id + '/transform:' + i);
                        node.children.push(subNode);
                        outstanding++; // Add any additional queries for children.
                    }
                    outstanding--;
                    //console.log("outstanding", outstanding);
                    if (outstanding == 0) {
                        console.log("DONE! root_node:", root_node);
                        console.log(JSON.stringify(root_node, null, 4));
                    }
                });
                console.log("node", node);
                return node;
            }
            root_node = getNode('object:' + results.root_transform_id);
            self.skeleton = root_node;
            console.log("ROOT node", root_node);
        });

    }


}


////////////////////////////////////////////////////////////////////////
