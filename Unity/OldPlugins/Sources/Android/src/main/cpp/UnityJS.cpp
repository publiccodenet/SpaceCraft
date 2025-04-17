////////////////////////////////////////////////////////////////////////
// Bridge.cpp
// JNI code for CBridgePlugin.
// Copyright (C) 2017 by Don Hopkins, Ground Up Software.


////////////////////////////////////////////////////////////////////////
// Includes.


#include <jni.h>
#include <assert.h>
#include <android/log.h>
#include "IUnityGraphics.h"


////////////////////////////////////////////////////////////////////////
// Macro definitions.


#define trace(fmt, ...) __android_log_print(ANDROID_LOG_DEBUG, "Bridge", "trace: %s (%i) " fmt, __FUNCTION__, __LINE__, __VA_ARGS__)


////////////////////////////////////////////////////////////////////////
// Function declarations.


static void UNITY_INTERFACE_API OnGraphicsDeviceEvent(UnityGfxDeviceEventType eventType);
static void UNITY_INTERFACE_API RenderEventFunc(int eventId);


////////////////////////////////////////////////////////////////////////
// Globals.


static JavaVM *java_vm;
static JNIEnv *jni_env;
static IUnityInterfaces *unity_interfaces;
static IUnityGraphics *unity_graphics;
static UnityGfxRenderer unity_renderer_type = kUnityGfxRendererNull;
typedef void (*UnitySendMessageCallback)(const char *target, const char *method, const char *message);
static UnitySendMessageCallback unitySendMessageCallback;


////////////////////////////////////////////////////////////////////////
// Functions.


// This gets loaded when Java loads this library.
extern "C" jint JNI_OnLoad(
    JavaVM *vm,
    void *reserved)
{
    //trace("Bridge.cpp: JNI_OnLoad: vm: %d reserved: %d", (int)vm, (int)reserved);

    java_vm = vm;

    vm->AttachCurrentThread(&jni_env, 0);
    //trace("Bridge.cpp: JNI_OnLoad: jni_env: %d", (int)jni_env);

    return JNI_VERSION_1_6;
}


// NOTE: This never gets called on Android.
extern "C" void UNITY_INTERFACE_EXPORT UNITY_INTERFACE_API UnityPluginLoad(
    IUnityInterfaces *unityInterfaces)
{
    //trace("Bridge.cpp: UnityPluginLoad: unityInterfaces: %d", (int)unityInterfaces);
    unity_interfaces = unityInterfaces;
    unity_graphics = unityInterfaces->Get<IUnityGraphics>();
    //trace("Bridge.cpp: UnityPluginLoad: unity_graphics: %d", (int)unity_graphics);
    unity_graphics->RegisterDeviceEventCallback(OnGraphicsDeviceEvent);
    OnGraphicsDeviceEvent(kUnityGfxDeviceEventInitialize);
}


// NOTE: This never gets called on Android.
extern "C" void UNITY_INTERFACE_EXPORT UNITY_INTERFACE_API UnityPluginUnload()
{
    //trace("Bridge.cpp: UnityPluginUnload: %d", 0);
    unity_graphics->UnregisterDeviceEventCallback(OnGraphicsDeviceEvent);
}


// NOTE: This never gets called on Android.
static void UNITY_INTERFACE_API OnGraphicsDeviceEvent(
    UnityGfxDeviceEventType eventType)
{
    //trace("Bridge.cpp: OnGraphicsDeviceEvent: eventType: %d", (int)eventType);
    switch (eventType) {
        case kUnityGfxDeviceEventInitialize:
        {
            unity_renderer_type = unity_graphics->GetRenderer();
            //trace("Bridge.cpp: OnGraphicsDeviceEvent: kUnityGfxDeviceEventInitialize: unity_renderer_type: %d", (int)unity_renderer_type);
            //TODO: user initialization code
            break;
        }
        case kUnityGfxDeviceEventShutdown:
        {
            unity_renderer_type = kUnityGfxRendererNull;
            //TODO: user shutdown code
            break;
        }
        case kUnityGfxDeviceEventBeforeReset:
        {
            //TODO: user Direct3D 9 code
            break;
        }
        case kUnityGfxDeviceEventAfterReset:
        {
            //TODO: user Direct3D 9 code
            break;
        }
    };
}


// This gets called by CBridgePlugin.SetUnitySendMessageCallback.
extern "C" void Java_com_ground_up_software_bridge_CBridgePlugin_SetUnitySendMessageCallback(
    JNIEnv *env,
    jobject thisObject,
    long unitySendMessageCallback_)
{
    //trace("Bridge.cpp: Java_com_ground_up_software_bridge_CBridgePlugin_SetUnitySendMessageCallback: env: %ld thisObject: %ld sendMessageCallback: %ld", (long)env, (long)thisObject, (long)unitySendMessageCallback_);
    unitySendMessageCallback = (UnitySendMessageCallback)unitySendMessageCallback_;
}


// This gets called by CBridgePlugin.UnitySendMessage.
extern "C" void Java_com_ground_up_software_bridge_CBridgePlugin_UnitySendMessage(
    JNIEnv *env,
    jobject thisObject,
    jstring targetString,
    jstring methodString,
    jstring messageString)
{
    if (unitySendMessageCallback == 0) {
        trace("Bridge.cpp: Java_com_ground_up_software_bridge_CBridgePlugin_GetRenderEventFunc: called without unitySendMessageCallback: %d", 0);
        return;
    }

    const char *target = env->GetStringUTFChars(targetString, 0);
    const char *method = env->GetStringUTFChars(methodString, 0);
    const char *message = env->GetStringUTFChars(messageString, 0);

    //trace("Bridge.cpp: Java_com_ground_up_software_bridge_CBridgePlugin_UnitySendMessage: env: %d thisObject: %d target: %s method: %s message: %s", (int)env, (int)thisObject, target, method, message);

    unitySendMessageCallback(target, method, message);

    env->ReleaseStringUTFChars(targetString, target);
    env->ReleaseStringUTFChars(methodString, method);
    env->ReleaseStringUTFChars(messageString, message);
}


// This gets called by CBridgePlugin.GetRenderEventFunc.
extern "C" long Java_com_ground_up_software_bridge_CBridgePlugin_GetRenderEventFunc(
    JNIEnv *env,
    jobject thisObject)
{
    //trace("Bridge.cpp: Java_com_ground_up_software_bridge_CBridgePlugin_GetRenderEventFunc: env: %d thisObject: %d RenderEventFunc: %d", (int)env, (int)thisObject, (int)RenderEventFunc);
    return (long)RenderEventFunc;
}


static void UNITY_INTERFACE_API RenderEventFunc(
    int eventId)
{
    //trace("Bridge.cpp: RenderEventFunc: eventId: %d", (int)eventId);

    switch (eventId) {

        case 0: {
            //trace("Bridge.cpp: RenderEventFunc: StartUp: eventId: %d", (int)eventId);
            break;
        }

        case 1: {
            //trace("Bridge.cpp: RenderEventFunc: ShutDown: eventId: %d", (int)eventId);
            break;
        }

        case 2: {
            //trace("Bridge.cpp: RenderEventFunc: RenderUpdateBridgePlugins: eventID: %d", (int)eventId);

            // TODO: cache in global
            jclass class_CBridgePlugin = jni_env->FindClass("com/ground_up_software/bridge/CBridgePlugin");
            //trace("Bridge.cpp: RenderEventFunc: class_CBridgePlugin: %d", (int)class_CBridgePlugin);

            // TODO: cache in global
            jmethodID method_CBridgePlugin_RenderUpdateBridgePlugins = jni_env->GetStaticMethodID(class_CBridgePlugin, "RenderUpdateBridgePlugins", "()V");
            //trace("Bridge.cpp: RenderEventFunc: method_CBridgePlugin_RenderUpdateBridgePlugins: %d", (int)method_CBridgePlugin_RenderUpdateBridgePlugins);

            jni_env->CallStaticVoidMethod(class_CBridgePlugin, method_CBridgePlugin_RenderUpdateBridgePlugins);

            break;
        }

        default: {
            break;
        }

    }

    //trace("Bridge.cpp: RenderEventFunc: end. %d", 0);
}


////////////////////////////////////////////////////////////////////////
