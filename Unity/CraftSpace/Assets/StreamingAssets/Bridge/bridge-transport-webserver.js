////////////////////////////////////////////////////////////////////////
// bridge-transport-webserver.js
// Unity3D / JavaScript Bridge
// Don Hopkins, Ground Up Software.


////////////////////////////////////////////////////////////////////////


function InitializeBridgeWebServer()
{
    window.bridge = window.bridge || new Bridge();

    var url = 'ws://localhost:7777/pump_events';

    window.bridge.start("WebServer", null);

    window.mindtwin = new Mindtwin(window.bridge);
}


////////////////////////////////////////////////////////////////////////
