////////////////////////////////////////////////////////////////////////
// BridgeWebServer.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.

#if USE_BRIDGEWEBSERVER

using UnityEngine;
using System.Collections.Generic;
using System.IO;
using System;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UniWebServer;
using System.Threading.Tasks;


public class BridgeWebServer : MonoBehaviour {

    public static BridgeWebServer bridgeWebServer;

    public bool startOnAwake = true;
    public int port = 7777;
    public int workerThreads = 1;
    public bool processRequestsInMainThread = true;
    public bool logRequests = true;
    public WebServer server;
    public Bridge bridge;
    public BridgeTransportWebServer transport;

    void Start()
    {
        if (bridgeWebServer == null) {
            bridgeWebServer = this;
        }
        else {
            Debug.Log("BridgeWebServer: Start: there should only be one!");
        }

        if (processRequestsInMainThread) {
            Application.runInBackground = true;
        }

        server = new WebServer(port, workerThreads, processRequestsInMainThread);
        server.logRequests = logRequests;
        server.HandleRequest += HandleRequest;

        if (startOnAwake) {
            server.Start();
        }
    }

    void OnApplicationQuit()
    {
        server.Dispose();
    }

    void Update() {
        if (server.processRequestsInMainThread) {
            server.ProcessRequests();
        }
    }

    void HandleRequest(Request request, Response response)
    {
        string path = request.uri.LocalPath;

        //JArray evList = JArray.Parse(json);
        //JObject obj = JObject.Parse(json);

        //Debug.Log("BridgeWebServer: HandleRequest: path: " + path + " request method: " + request.method + " fragment: " + request.fragment + " query: " + request.query + " stream: " + request.stream + " headers: " + request.headers + " body: " + request.body);

        string[] path_names = path.Trim('/').Split('/');

        if (path_names.Length == 0) {
            path_names = new string[] {""};
        }

        string name = path_names[0];

        if (name == "") {
            name = "index";
        }
        
        switch (name) {

            case "index":

                ReturnFile(response, "/index.html");
                break;
            
            case "hello":

                JObject hello_response = new JObject();

                hello_response["hello"] = "world";
                
                JToken favorite_color = null;
                BridgeJsonConverter.ConvertFromType(Color.green, ref favorite_color);
                hello_response["favorite_color"] = favorite_color;

                ReturnJson(response, hello_response);
                break;

            case "receive_events":

                string receive_events_response = "[" + transport.ReceiveUnityToBridgeEvents() + "]";

                ReturnJson(response, receive_events_response);
                break;

            case "send_events":

                JArray send_events;
                if (!GetBodyJsonArray(request, out send_events)) {
                    return;
                }

                foreach (JObject ev in send_events) {
                    bridge.DistributeUnityEvent(ev);
                }

                ReturnSuccess(response, "sent " + send_events.Count + " event" + ((send_events.Count == 1) ? "" : "s"));
                break;

            case "pump_events":

                JArray pump_events;
                if (!GetBodyJsonArray(request, out pump_events)) {
                    return;
                }

                foreach (JObject ev in pump_events) {
                    bridge.DistributeUnityEvent(ev);
                }

                string pump_events_response = "[" + transport.ReceiveUnityToBridgeEvents() + "]";

                ReturnJson(response, pump_events_response);
                break;

            default:

                ReturnFile(response, request.uri.LocalPath);
                break;

        }
        
    }

    bool GetBodyJsonObject(Request request, out JObject o) {
        JToken token = null;

        if (!GetBodyJsonToken(request, out token)) {
            o = null;
            return false;
        }

        o = token as JObject;

        if (o == null) {
            Debug.Log("BridgeWebServer: GetBodyJsonObject: expected an object.");
            return false;
        }

        return true;
    }

    bool GetBodyJsonArray(Request request, out JArray a) {
        JToken token = null;
        
        if (!GetBodyJsonToken(request, out token)) {
            a = null;
            return false;
        }

        a = token as JArray;

        if (a == null) {
            Debug.Log("BridgeWebServer: GetBodyJsonArray: expected an array.");
            return false;
        }

        return true;
    }

    bool GetBodyJsonToken(Request request, out JToken token) {
        token = null;

        if (String.IsNullOrEmpty(request.body)) {
            Debug.Log("BridgeWebServer: GetBodyJsonToken: empty json request body.");
            return false;
        }

        try {
            token = JToken.Parse(request.body);
        }
        catch (Exception ex) {
            Debug.Log("BridgeWebServer: GetBodyJsonToken: error parsing json request body: " + request.body);
            return false;
        }

        if (token == null) {
            Debug.Log("BridgeWebServer: GetBodyJsonToken: null json request body: " + request.body);
            return false;
        }

        return true;
    }

    
    void ReturnSuccess(Response response, string message="ok")
    {
        JObject success = new JObject();
        success["error"] = false;
        success["message"] = message;

        ReturnJson(response, success);
    }
        

    void ReturnError(Response response, string message)
    {
        JObject error = new JObject();
        error["error"] = true;
        error["message"] = message;

        ReturnJson(response, error);
    }
        

    void ReturnJson(Response response, JToken token)
    {
        ReturnJson(response, token.ToString());
    }
        

    void ReturnJson(Response response, string json)
    {
        ReturnContent(response, json, "application/json");
    }
        

    void ReturnContent(Response response, string content, string content_type)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(content);
        response.statusCode = 200;
        response.message = "OK";
        response.headers.Add("Content-Type", content_type);
        response.headers.Add("Content-Length", bytes.Length.ToString());
        response.SetBytes(bytes);
    }


    void ReturnFile(Response response, string path, string content_type = null)
    {
        string folderRoot = Application.streamingAssetsPath + "/Bridge";
        string fullPath = folderRoot + Uri.UnescapeDataString(path);

        if (!File.Exists(fullPath)) {
            response.statusCode = 404;
            response.message = "Not Found";
            return;
        }

        if (content_type == null) {
            string fileExt = Path.GetExtension(fullPath);
            content_type = MimeTypeMap.GetMimeType(fileExt);
        }

        response.headers.Add("Content-Type", content_type);
        response.statusCode = 200;
        response.message = "OK";

        using (FileStream fs = File.OpenRead(fullPath))
        {
            int length = (int)fs.Length;
            byte[] buffer;

            response.headers.Add("Content-Length", length.ToString());

            using (BinaryReader br = new BinaryReader(fs))
            {
                buffer = br.ReadBytes(length);
            }
            response.SetBytes(buffer);
        }


    }

}

#endif
