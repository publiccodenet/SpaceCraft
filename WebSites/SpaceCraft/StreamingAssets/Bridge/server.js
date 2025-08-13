////////////////////////////////////////////////////////////////////////
// index.js
// Unity3D / JavaScript Bridge
// Don Hopkins, Ground Up Software.

"use strict";


////////////////////////////////////////////////////////////////////////
// Requirements


const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const bridge = require('./bridge.js')


////////////////////////////////////////////////////////////////////////
// Constants


var port = process.env.PORT || 3000;
var secret = '568c3c9jgwyx8vis';
var staticDirectory = 'static';
var indexFileName = '/static/index.html';
var pingInterval = 10000;
var pingTimeout = 5000;


////////////////////////////////////////////////////////////////////////
// Globals


var engines = [];


////////////////////////////////////////////////////////////////////////
// Servers


var app = express();
app.use(cookieParser());
//app.use(session({secret: secret}));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(staticDirectory));

var httpServer = http.Server(app);

var io = socketio(httpServer, {
    pingInterval: pingInterval,
    pingTimeout: pingTimeout,
    binary: true,
    cookie: false
});


////////////////////////////////////////////////////////////////////////
// HTTP Handlers


app.get('/', function(req, res) {

    //console.log('__dirname:', __dirname, 'app:', req.app, 'baseUrl:', req.baseUrl, 'body:', req.body, 'cookies:', req.cookies, 'hostname:', req.hostname, 'ip:', req.ip, 'method:', req.method, 'params:', req.params, 'path:', req.path, 'protocol:', req.protocol, 'query:', req.query, 'secure:', req.secure, 'signedCookies:', req.signedCookies, 'xhr:', req.xhr);
    //console.log('get /index.html');

    res.sendFile(__dirname + indexFileName);

});


qpp.get('/hello', function(req, res) {
    // TODO
});


////////////////////////////////////////////////////////////////////////
// SocketIO Handlers


io.of('/server').on('connection', function(socket) {

    console.log('connection:', 'socket.id:', socket.id);

    socket.on('disconnect', function (reason) {
        console.log('disconnect:', 'socket.id:', socket.id, 'reason:', reason);

        StopEngine(socket);
    });

    // Hello: *Engine => server
    socket.on('Hello', function(engineType, engineData) {
        console.log('Hello:', 'socket.id:', socket.id, 'engineType:', engineType, 'engineData', engineData);

        StartEngine(socket, engineType, engineData);
    });

    // SendBlob: DisplayEngine => ControlEngine
    socket.on('SendBlob', function(engineType, blobID, blob) {
        console.log('SendBlob:', 'socket.id:', socket.id, 'engineType:', engineType, 'blobID:', blobID, 'blob type:', typeof blob, 'length:', blob.length);

        var engines = socket.friendTypes[engineType];
        if ((engines == null) || (engines.length == 0)) {
            console.log('SendBlob: no', engineType, 'engines', 'socket.id:', socket.id);
            return;
        }

        controlEngines.forEach(controlEngine => 
            controlEngine.binary(true).emit('SendBlob', blobID, blob));
    });

    // SendMessage: *Engine => *Engine
    socket.on('SendMessage', function(engineType, message) {
        console.log('SendMessage:', 'socket.id:', socket.id, 'message:', message, engineType);

        var engines = socket.friendTypes[engineType];
        if ((engines == null) || (engines.length == 0)) {
            console.log('SendEventList: no', engineType, 'engines', 'socket.id:', socket.id);
            return;
        }

        engine.emit('SendMessage', message, engineType);
    });

    console.log('sending Welcome to socket');
    socket.emit('Welcome');
});


////////////////////////////////////////////////////////////////////////
// Utilities


function StartEngine(engine, engineType, engineData)
{
    engine.engineType = engineType;
    engine.engineData = engineData;
    engine.friends = [];
    engine.friendTypes = {};

    engines.push(engine);
    console.log('StartEngine:', 'engines:', engines.length);

    switch (engineType) {

        case 'Display':
            IntroduceEngines(engine, 'Control', true);
            break;

        case 'Control':
            IntroduceEngines(engine, 'Display', true);
            break;

        default:
            console.log('ERROR: Hello: unexpected engineType:', engineType, 'engine.id:', engine.id);
            return;

    }

}


function StopEngine(engine)
{
    console.log('StopEngine:', 'engines:', engines.length);

    var i = engines.indexOf(engine);
    if (i < 0) {
        //console.log('StopEngine: missing engine:', engine);
        return;
    }

    engines.splice(i, 1);

    engines.forEach(function (otherEngine) {
        var i = otherEngine.friends.indexOf(engine);
        if (i < 0) {
            return;
        }
        otherEngine.friends.splice(i, 1);
        var engines = otherEngine.friendTypes[engine.engineType];
        if (engines && engines.length) {
            i = engines.indexOf(Engine);
            if (i >= 0) {
                engines.splice(i, 1);
            }
        }
        otherEngine.emit('RemoveFriend', {
            id: engine.id,
            engineType: engine.engineType
        });
    });
}


function IntroduceEngines(engine, otherEngineType, exclusive)
{
    console.log('IntroduceEngines:', engine.engineType, otherEngineType, engine.id);

    var found = false;

    engines.some(function (otherEngine) {

        if ((otherEngine == engine) ||
            (otherEngine.engineType != otherEngineType) ||
            (exclusive &&
             otherEngine.friendTypes[engine.engineType] &&
             otherEngine.friendTypes[engine.engineType].length)) {
            return false;
        }

        engine.friends.push(otherEngine);
        var engines = engine.friendTypes[otherEngine.engineType];
        if (!engines) {
            engines = engine.friendTypes[otherEngine.engineType] = [];
        }
        engines.push(otherEngine);

        otherEngine.friends.push(engine);
        engines = otherEngine.friendTypes[engine.engineType];
        if (!engines) {
            engines = otherEngine.friendTypes[engine.engineType] = [];
        }
        engines.push(engine);

        found = true;

        console.log('IntroduceEngines: found match:', 'exclusive:', exclusive, 'engine:', engine.id, engine.engineType, 'otherEngine:', otherEngine.id, otherEngine.engineType);

        engine.emit('AddFriend', {
            id: otherEngine.id,
            engineType: otherEngine.engineType,
            engineData: otherEngine.engineData
        });

        otherEngine.emit('AddFriend', {
            id: engine.id,
            engineType: engine.engineType,
            engineData: engine.engineData
        });

        return true;
    });

    if (!found) {
        console.log('IntroduceEngines: no match');
    }
}


////////////////////////////////////////////////////////////////////////
// Start Server


httpServer.listen({
        host: 'localhost',
        port: port
    },
    function() {
        console.log('listening on localhost:' + port);
    });


////////////////////////////////////////////////////////////////////////
