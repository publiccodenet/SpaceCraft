/////////////////////////////////////////////////////////////////////////
// MonoPInvokeCallbackAttribute.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.
//
// Attribute that allows static functions to have callbacks (from C) generated AOT.

using UnityEngine;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;


[AttributeUsage(AttributeTargets.Method)]
public sealed class MonoPInvokeCallbackAttribute : Attribute
{
    public MonoPInvokeCallbackAttribute(Type type) {}
}
