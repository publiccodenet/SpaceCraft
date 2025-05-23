////////////////////////////////////////////////////////////////////////
// ProCamera.cs
// Copyright (C) 2017 by Don Hopkins, Ground Up Software.


using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;


public enum ProCameraTracking {
    None,
    Drag,
    Orbit,
    Approach,
    Interpolate,
    Tilt,
    Pedestal,
    Zoom,
};


public class ProCamera : BridgeObject {


    ////////////////////////////////////////////////////////////////////////
    // ProCamera properties


    public Camera proCamera;
    public TrackerProxy trackerProxy;
    public float moveSpeed = 60.0f;
    public float yawSpeed = 60.0f;
    public float pitchSpeed = 60.0f;
    public float orbitYawSpeed = 60.0f;
    public float orbitPitchSpeed = 60.0f;
    public float wheelZoomSpeed = 30.0f;
    public float wheelPanSpeed = -30.0f;
    public Vector3 moveVelocity = Vector3.zero;
    public float yawVelocity = 0.0f;
    public float pitchVelocity = 0.0f;
    public float orbitYawVelocity = 0.0f;
    public float orbitPitchVelocity = 0.0f;
    public float wheelZoomVelocity = 0.0f;
    public float wheelPanVelocity = 0.0f;
    public float mouseScrollDeltaMax = 5.0f;
    public Vector3 positionMin = new Vector3(-1000.0f, 1.0f, -1000.0f);
    public Vector3 positionMax = new Vector3(1000.0f, 200.0f, 1000.0f);
    public float pitchMin = -90f;
    public float pitchMax = 90f;
    public bool initialized = false;
    public Vector3 forward;
    public Vector3 initialPosition;
    public Quaternion initialRotation;
    public Vector3 initialEulers;
    public Vector3 zoomDeltaRotated;
    public Vector3 orbitLocation;
    public bool gotInput = false;
    public bool dragging = false;
    public bool wasDragging = false;
    public ProCameraTracking tracking = ProCameraTracking.None;
    public Plane dragPlane = new Plane(Vector3.up, Vector3.zero);
    public Vector3 dragMousePosition;
    public Vector3 dragStartMousePosition;
    public Vector3 dragLastMousePosition;
    public Vector3 dragPlaneNormal = Vector3.up;
    public Vector3 dragPlanePosition = Vector3.zero;
    public float dragStartDistance;
    public Vector3 dragStartPosition;
    public Vector3 dragScreenDistance;
    public float dragDistance;
    public Vector3 dragPosition;
    public float orthographicSizeMin = 1.0f;
    public float orthographicSizeMax = 1000.0f;
    public float orthographicSizeMouseScale = 1.0f;
    public float orthographicSizeWheelScale = 1.0f;
    public float fieldOfViewMax = 120.0f;
    public float fieldOfViewMin = 1.0f;
    public float fieldOfViewScale = -0.2f;
    public float pedestalScale = -0.5f;
    public float orbitScale = 1.0f;
    public Ray approachRay;
    public float approachDistance;
    public float approachScale = 1.0f;
    public float approachMin = 1.0f;
    public float approachMax = 10000.0f;
    public Vector3 orbitOffset;
    public float orbitYaw;
    public float orbitPitch;
    public float tiltMin = 0;
    public float tiltMax = 90;
    public float tiltPitchScale = 0.5f;
    public float tiltYawScale = -0.5f;
    public float tiltPitch;
    public float tiltYaw;
    public int interpolateRows;
    public int interpolateColumns;
    public Vector3[] interpolatePositions;
    public Quaternion[] interpolateRotations;
    public bool animating = false;
    public bool animationStart = false;
    public bool animationCancelsDragging = false;
    public bool animationCanceledByDragging = false;
    public bool animationCancel = false;
    public float animationDuration = 0.5f;
    public float animationDurationMin = 0.1f;
    public float animationStartTime = -100.0f;
    public Vector3 animationStartPosition;
    public Vector3 animationEndPosition;
    public Vector3 animationPosition;
    public Quaternion animationStartRotation;
    public Quaternion animationEndRotation;
    public Quaternion animationRotation;
    public float animationStartOrthographicSize;
    public float animationEndOrthographicSize;
    public float animationOrthographicSize;
    public float animationStartNearClipPlane;
    public float animationEndNearClipPlane;
    public float animationNearClipPlane;
    public float animationStartFarClipPlane;
    public float animationEndFarClipPlane;
    public float animationFarClipPlane;
    public BridgeObject target;
    public bool targetSnap = false;
    public bool targetSnapAlways = false;
    public float targetSnapPadding = 20.0f;
    public float targetSnapDepthPadding = 1f;
    public float minClipDepth = 0.01f;
    public bool targetAnimate = false;
    public float targetDistance = 5000f;
    public float targetSizeMin = 1.0f;
    public float targetSizeScale = 1.05f;
    public Vector3 targetOrientation = new Vector3(30.0f, 0.0f, 0.0f);
    public float targetAnimationDuration = 0.5f;


    ////////////////////////////////////////////////////////////////////////
    // Instance Methods


    void Update()
    {

        UpdateInitialize();
        UpdateSnap();
        UpdateDragging();
        UpdateInput();
        UpdateAnimation();

    }


    void UpdateInitialize()
    {

        if (initialized) {
            return;
        }

        initialized = true;

        if (proCamera == null) {
            proCamera = gameObject.GetComponent<Camera>();
        }

        initialPosition = transform.position;
        initialRotation = transform.rotation;
        initialEulers = transform.rotation.eulerAngles;

    }


    void UpdateSnap()
    {

        if ((target == null) ||
            (!targetSnapAlways && !targetSnap && !targetAnimate) ||
            (!proCamera.orthographic)) {
            return;
        }
            
        //float startTime = Time.time;
        //Debug.Log("ProCamera.cs: UpdateSnap: targetSnap: begin: target: " + target + " targetSnapAlways: " + targetSnapAlways + " targetSnap: " + targetSnap + " targetAnimate: " + targetAnimate);

        targetSnap = false;

        Vector3 targetPosition = target.transform.position;
        Quaternion targetRotation = Quaternion.Euler(targetOrientation);
        Quaternion targetRotationInverse = Quaternion.Inverse(targetRotation);
        Bounds bounds = new Bounds(targetPosition, Vector3.zero);
        Bounds boundsRotated = new Bounds(targetRotation * targetPosition, Vector3.zero);
        bool first = true;

        foreach (MeshFilter mf in target.transform.GetComponentsInChildren<MeshFilter>()) {

            if ((mf.mesh == null) ||
                !mf.gameObject.activeInHierarchy ||
                mf.gameObject.CompareTag("IgnoreBounds")) {
                continue;
            }

            Transform xform = mf.transform;
            Vector3[] verts = mf.mesh.vertices;

            foreach (Vector3 vert in verts) {

                Vector3 v = xform.TransformPoint(vert);
                Vector3 vRotated = targetRotationInverse * v;

                if (first) {
                    first = false;
                    bounds.center = v;
                    bounds.extents = Vector3.zero;
                    boundsRotated.center = vRotated;
                    boundsRotated.extents = Vector3.zero;
                } else {
                    bounds.Encapsulate(v);
                    boundsRotated.Encapsulate(vRotated);
                }

                //Debug.Log("v: " + v.x + " " + v.y + " " + v.z + " bounds.center: " + bounds.center.x + " " + bounds.center.y + " " + bounds.center.z + " bounds.extent: " + bounds.extents.x + " " + bounds.extents.y + " " + bounds.extents.z + " vRotated: " + vRotated.x + " " + vRotated.y + " " + vRotated.z + " boundsRotated.center: " + boundsRotated.center.x + " " + boundsRotated.center.y + " " + boundsRotated.center.z + " boundsRotated.extent: " + boundsRotated.extents.x + " " + boundsRotated.extents.y + " " + boundsRotated.extents.z);

            }

        }

        Vector3 cameraOffset =
            targetRotation *
            (Vector3.forward * targetDistance);

        //Debug.Log("targetDistance: " + targetDistance + " cameraOffset: " + cameraOffset.x + " " + cameraOffset.y + " " + cameraOffset.z + " magnitude: " + cameraOffset.magnitude);
        //Debug.Log("bounds.center: " + bounds.center.x + " " + bounds.center.y + " " + bounds.center.z + " bounds.extent: " + bounds.extents.x + " " + bounds.extents.y + " " + bounds.extents.z);
        //Debug.Log("boundsRotated.center: " + boundsRotated.center.x + " " + boundsRotated.center.y + " " + boundsRotated.center.z + " boundsRotated.extent: " + boundsRotated.extents.x + " " + boundsRotated.extents.y + " " + boundsRotated.extents.z);

        Vector3 boundsCenter = bounds.center;
        Vector3 cameraPosition = boundsCenter - cameraOffset;

        // Camera orthographic size is height of view volume.
        // Camera aspect ratio is screen width over height.
        // So divide sizeX by camera aspect to get vertical orthographic size.
        float sizeX = 
            targetSizeScale *
            Mathf.Max(
                targetSizeMin,
                boundsRotated.extents.x + targetSnapPadding);
        float sizeY =
            targetSizeScale *
            Mathf.Max(
                targetSizeMin,
                boundsRotated.extents.y + targetSnapPadding);
        float size =
            Mathf.Max(
                sizeX / proCamera.aspect,
                sizeY);

        float nearClipPlane =
            Mathf.Max(
                minClipDepth, 
                targetDistance - boundsRotated.extents.z - targetSnapDepthPadding);
        float farClipPlane =
            targetDistance + boundsRotated.extents.z + targetSnapDepthPadding;

        //Debug.Log("size: " + size + " sizeX: " + sizeX + " sizeY: " + sizeY + " aspect: " + proCamera.aspect + " sizeX/aspect: " + (sizeX / proCamera.aspect) + " cameraPosition: " + cameraPosition.x + " " + cameraPosition.y + " " + cameraPosition.z + " nearClipPlane: " + nearClipPlane + " farClipPlane: " + farClipPlane);

        if (size <= 0.0f) {
            //Debug.Log("ProCamera.cs: UpdateSnap: targetSnap: size zero so not changing camera");
            return;
        }

        if (targetAnimate) {
            targetAnimate = false;
            animationStart = true;
            animationDuration = targetAnimationDuration;
            animationCancelsDragging = false;
            animationCanceledByDragging = false;
            animationEndPosition = cameraPosition;
            animationEndRotation = targetRotation;
            animationEndOrthographicSize = size;
            animationEndNearClipPlane = nearClipPlane;
            animationEndFarClipPlane = farClipPlane;
        } else {
            transform.position = cameraPosition;
            transform.rotation = targetRotation;
            proCamera.orthographicSize = size;
            proCamera.nearClipPlane = nearClipPlane;
            proCamera.farClipPlane = farClipPlane;
        }

        //float endTime = Time.time;
        //Debug.Log("ProCamera.cs: UpdateSnap: targetSnap: end: duration: " + (endTime - startTime));

    }


    void UpdateDragging()
    {

        // Animation can override dragging.
        if (animating || animationStart) {
            if (animationCancelsDragging && dragging) {
                dragging = false;
            }
        }

        gotInput = false;

        if (dragging) {

            if (wasDragging) {

                // Stop dragging.
                //Debug.Log("ProCamera: UpdateDragging: StopDragging");

            } else {

                // Not dragging.

            }

            wasDragging = true;

            return;
        }

        gotInput = true; // Continuously generating input while dragging.

        dragMousePosition = Input.mousePosition;

        if (!wasDragging) {

            // Start dragging.
            //Debug.Log("ProCamera: UpdateDragging: StartDragging: tracking: " + tracking);

            dragStartMousePosition = dragMousePosition;
            dragLastMousePosition = dragMousePosition;

            dragPlane.SetNormalAndPosition(
                dragPlaneNormal,
                dragPlanePosition);

            Ray startRay =
                proCamera.ScreenPointToRay(
                    dragMousePosition);
            dragStartDistance = 0.0f;
            if (!dragPlane.Raycast(startRay, out dragStartDistance)) {
                //Debug.Log("ProCamera: UpdateDragging: startRay doesn't hit");
            }
            dragStartPosition = startRay.GetPoint(dragStartDistance);
            //Debug.Log("ProCamera: UpdateDragging: dragStartDistance: " + dragStartDistance + " dragStartPosition: " + dragStartPosition.x + " " + dragStartPosition.y + " " + dragStartPosition.z);

            dragScreenDistance = Vector3.zero;
            dragDistance = 0.0f;
            dragPosition = Vector3.zero;

            switch (tracking) {

                case ProCameraTracking.Drag: {
                    break;
                }

                case ProCameraTracking.Orbit: {

                    Vector3 orbitCameraDirection =
                        transform.rotation * Vector3.forward;

                    orbitYaw =
                        Mathf.Rad2Deg *
                        Mathf.Atan2(
                            orbitCameraDirection.x,
                            orbitCameraDirection.z);

                    Vector3 unrotatedOrbitCameraDirection =
                        Quaternion.Euler(0.0f, -orbitYaw, 0.0f) *
                        orbitCameraDirection;

                    orbitPitch =
                        Mathf.Rad2Deg *
                        Mathf.Atan2(
                            -unrotatedOrbitCameraDirection.y,
                            unrotatedOrbitCameraDirection.z);

                    Vector3 offset = 
                        dragStartPosition - transform.position;
                    orbitOffset =
                        Quaternion.Euler(0.0f, -orbitYaw, 0.0f) *
                        offset;

                    //Debug.Log("ProCamera: UpdateDragging: Start Orbit: orbitCameraDirection: " + orbitCameraDirection.x + " " + orbitCameraDirection.y + " " + orbitCameraDirection.z + " orbitYaw: " + orbitYaw + " orbitPitch: " + orbitPitch + " dragMousePosition: " + dragMousePosition.x + " " + dragMousePosition.y + " " + dragMousePosition.z + " dragStartPosition: " + dragStartPosition.x + " " + dragStartPosition.y + " " + dragStartPosition.z + " transform.position: " + transform.position.x + " " + transform.position.y + " " + transform.position.z + " offset: " + offset.x + " " + offset.y + " " + offset.z + " orbitOffset: " + orbitOffset.x + " " + orbitOffset.y + " " + orbitOffset.z);

                    break;
                }

                case ProCameraTracking.Approach: {
                    approachRay = new Ray(dragStartPosition, -startRay.direction);
                    approachDistance = dragStartDistance;
                    break;
                }

                case ProCameraTracking.Interpolate: {
                    break;
                }

                case ProCameraTracking.Pedestal: {
                    break;
                }

                case ProCameraTracking.Tilt: {

                    Vector3 rotatedDirection =
                        transform.rotation * Vector3.forward;

                    tiltYaw =
                        Mathf.Rad2Deg *
                        Mathf.Atan2(
                            rotatedDirection.x,
                            rotatedDirection.z);

                    Vector3 unrotatedDirection =
                        Quaternion.Euler(0.0f, -tiltYaw, 0.0f) *
                        rotatedDirection;

                    tiltPitch =
                        Mathf.Rad2Deg *
                        Mathf.Atan2(
                            -unrotatedDirection.y,
                            unrotatedDirection.z);

                    //Debug.Log("ProCamera: UpdateDragging: Start Tilt: rotatedDirection: " + rotatedDirection.x + " " + rotatedDirection.y + " " + rotatedDirection.z + " tiltYaw: " + tiltYaw + " unrotatedDirection: " + unrotatedDirection.x + " " + unrotatedDirection.y + " " + unrotatedDirection.z + " tiltPitch: " + tiltPitch);

                    break;
                }

                case ProCameraTracking.Zoom: {
                    break;
                }

            }

        } else {

            // Keep dragging.
            //Debug.Log("ProCamera: UpdateDragging: KeepDragging");

            dragScreenDistance =
                dragMousePosition - dragLastMousePosition;

            if ((dragScreenDistance.x != 0.0f) ||
                (dragScreenDistance.y != 0.0f)) {

                //Debug.Log("ProCamera: UpdateDragging: dragScreenDistance: " + dragScreenDistance.x + " " + dragScreenDistance.y);

                switch (tracking) {

                    case ProCameraTracking.Drag: {

                        Ray lastDragRay =
                            proCamera.ScreenPointToRay(
                                dragLastMousePosition);
                        float lastDragDistance = 0.0f;
                        if (!dragPlane.Raycast(lastDragRay, out lastDragDistance)) {
                            //Debug.Log("ProCamera: UpdateDragging: lastDragRay doesn't hit");
                        }
                        Vector3 lastDragPosition = lastDragRay.GetPoint(lastDragDistance);
                        //Debug.Log("ProCamera: UpdateDragging: Drag: lastDragDistance: " + lastDragDistance + " lastDragPosition: " + lastDragPosition.x + " " + lastDragPosition.y + " " + lastDragPosition.z);

                        Ray dragRay =
                            proCamera.ScreenPointToRay(
                                dragMousePosition);
                        dragDistance = 0.0f;
                        if (!dragPlane.Raycast(dragRay, out dragDistance)) {
                            //Debug.Log("ProCamera: UpdateDragging: dragRay doesn't hit");
                        }
                        dragPosition = dragRay.GetPoint(dragDistance);
                        //Debug.Log("ProCamera: UpdateDragging: Drag: dragDistance: " + dragDistance + " dragPosition: " + dragPosition.x + " " + dragPosition.y + " " + dragPosition.z);

                        Vector3 offset = dragPosition - lastDragPosition;
                        if (offset != Vector3.zero) {
                            transform.position -= offset;
                            //Debug.Log("ProCamera: UpdateDragging: Drag: offset: " + offset.x + " " + offset.y + " " + offset.z);
                        }

                        break;
                    }

                    case ProCameraTracking.Orbit: {

                        float turn =
                            dragScreenDistance.x * orbitScale;

                        orbitYaw += turn;

                        transform.rotation =
                            Quaternion.Euler(orbitPitch, orbitYaw, 0.0f);

                        Vector3 rotatedOffset =
                            Quaternion.Euler(0.0f, orbitYaw, 0.0f) *
                            orbitOffset;

                        Vector3 orbitPosition =
                            dragStartPosition -
                            rotatedOffset;

                        if (orbitPosition != transform.position) {
                            //Debug.Log("ProCamera: UpdateDragging: Orbit: turn: " + turn + " orbitPitch: " + orbitPitch + " orbitYaw: " + orbitYaw + " dragStartPosition: " + dragStartPosition.x + " " + dragStartPosition.y + " "  + dragStartPosition.z + " orbitOffset: " + orbitOffset.x + " " + orbitOffset.y + " " + orbitOffset.z + " rotatedOffset: " + rotatedOffset.x + " " + rotatedOffset.y + " " + rotatedOffset.z + " orbitPosition: " + orbitPosition.x + " " + orbitPosition.y + " " + orbitPosition.z);
                            transform.position = orbitPosition;
                        }

                        break;
                    }

                    case ProCameraTracking.Approach: {

                        float change =
                            approachScale *
                            (dragMousePosition.y - dragStartMousePosition.y);

                        approachDistance =
                            Mathf.Max(
                                approachMin,
                                Mathf.Min(
                                    approachMax,
                                    (approachDistance +
                                     change)));

                        Vector3 position =
                            approachRay.GetPoint(approachDistance);

                        if (transform.position != position) {
                            //Debug.Log("ProCamera: UpdateDragging: Approach: approachDistance: " + approachDistance + " position: " + position.x + " " + position.y + " " + position.z);
                            transform.position = position;
                        }

                        break;
                    }

                    case ProCameraTracking.Tilt: {

                        float pitchChange =
                            tiltPitchScale *
                            (dragMousePosition.y - dragStartMousePosition.y);

                        float pitch =
                            Mathf.Max(
                                tiltMin,
                                Mathf.Min(
                                    tiltMax,
                                    (tiltPitch +
                                     pitchChange)));

                        float yawChange =
                            tiltYawScale *
                            (dragMousePosition.x - dragStartMousePosition.x);

                        float yaw =
                            tiltYaw + yawChange;

                        //Debug.Log("ProCamera: UpdateDragging: Tilt: pitch: " + pitch + " pitchChange: " + pitchChange + " tiltYaw: " + tiltYaw + " yaw: " + yaw);

                        transform.rotation =
                            Quaternion.Euler(pitch, yaw, 0.0f);

                        break;
                    }

                    case ProCameraTracking.Interpolate: {

                        //Debug.Log("ProCamera: UpdateDragging: Interpolate: interpolateRows: " + interpolateRows + " interpolateColumns: " + interpolateColumns + " mouse: " + dragMousePosition.x + " " + dragMousePosition.y);

                        float x = 
                            Mathf.Clamp(
                                (float)dragMousePosition.x / (float)Screen.width,
                                0.0f,
                                1.0f);
                        float xColumn = x * interpolateColumns;
                        int column0 = (int)Mathf.Floor(xColumn);
                        float columnFactor = xColumn - column0;
                        if (column0 < 0) column0 = 0;
                        if (column0 >= interpolateColumns) column0 = interpolateColumns - 1;
                        int column1 = column0 + 1;
                        if (column1 >= interpolateColumns) column1 = interpolateColumns - 1;

                        float y = 
                            Mathf.Clamp(
                                (float)dragMousePosition.y / (float)Screen.height,
                                0.0f,
                                1.0f);
                        float yRow = y * interpolateRows;
                        int row0 = (int)Mathf.Floor(yRow);
                        float rowFactor = yRow - row0;
                        if (row0 < 0) row0 = 0;
                        if (row0 >= interpolateRows) row0 = interpolateRows - 1;
                        int row1 = row0 + 1;
                        if (row1 >= interpolateRows) row1 = interpolateRows - 1;

                        //Debug.Log("ProCamera: UpdateDragging: Interpolate: x: " + x + " columns: " + column0 + " " + column1 + " factor: " + columnFactor);
                        //Debug.Log("ProCamera: UpdateDragging: Interpolate: y: " + y + " rows: " + row0 + " " + row1 + " factor: " + rowFactor);

                        Vector3 position0 = 
                            Vector3.Lerp(
                                interpolatePositions[column0 + (row0 * interpolateColumns)],
                                interpolatePositions[column1 + (row0 * interpolateColumns)],
                                columnFactor);
                        Vector3 position1 = 
                            Vector3.Lerp(
                                interpolatePositions[column0 + (row1 * interpolateColumns)],
                                interpolatePositions[column1 + (row1 * interpolateColumns)],
                                columnFactor);
                        Vector3 pos =
                            Vector3.Lerp(
                                position0,
                                position1,
                                rowFactor);

                        if (transform.position != pos) {
                            transform.position = pos;
                        }

                        Quaternion rotation0 = 
                            Quaternion.Slerp(
                                interpolateRotations[column0 + (row0 * interpolateColumns)],
                                interpolateRotations[column1 + (row0 * interpolateColumns)],
                                columnFactor);
                        Quaternion rotation1 = 
                            Quaternion.Slerp(
                                interpolateRotations[column0 + (row1 * interpolateColumns)],
                                interpolateRotations[column1 + (row1 * interpolateColumns)],
                                columnFactor);
                        Quaternion rot =
                            Quaternion.Slerp(
                                rotation0,
                                rotation1,
                                rowFactor);

                        transform.rotation = rot;

                        break;
                    }

                    case ProCameraTracking.Pedestal: {

                        float height = transform.position.y;
                        height =
                            Mathf.Max(
                                positionMin.y,
                                Mathf.Min(
                                    positionMax.y,
                                    (height +
                                     (dragScreenDistance.y * pedestalScale))));
                        Vector3 pos =
                            new Vector3(
                                transform.position.x,
                                height,
                                transform.position.z);

                        if (transform.position != pos) {
                            transform.position = pos;
                        }

                        break;
                    }

                    case ProCameraTracking.Zoom: {

                        if (proCamera.orthographic) {

                            float orthographicSize = proCamera.orthographicSize;
                            orthographicSize =
                                Mathf.Max(
                                    orthographicSizeMin,
                                    Mathf.Min(
                                        orthographicSizeMax,
                                        (orthographicSize +
                                         (dragScreenDistance.y * orthographicSizeMouseScale))));
                            if (proCamera.orthographicSize != orthographicSize) {
                                proCamera.orthographicSize = orthographicSize;
                            }

                        } else {

                            float fov = proCamera.fieldOfView;
                            fov = 
                                Mathf.Max(
                                    fieldOfViewMin,
                                    Mathf.Min(
                                        fieldOfViewMax,
                                        (fov +
                                         (dragScreenDistance.y * fieldOfViewScale))));
                            if (proCamera.fieldOfView != fov) {
                                proCamera.fieldOfView = fov;
                            }

                        }

                        break;
                    }

                }

                dragLastMousePosition = dragMousePosition;

            }

        }

        wasDragging = dragging;
    }


    void UpdateInput()
    {
        //float deltaTime = Time.deltaTime;
        float deltaTime = Time.smoothDeltaTime; // Try smoothing!
        Vector3 moveDelta = moveVelocity * deltaTime;
        float yawDelta = yawVelocity * deltaTime;
        float pitchDelta = pitchVelocity * deltaTime;
        float orbitYawDelta = orbitYawVelocity * deltaTime;
        float orbitPitchDelta = orbitPitchVelocity * deltaTime;
        float wheelZoomDelta = wheelZoomVelocity * deltaTime;
        float wheelPanDelta = wheelPanVelocity * deltaTime;

        if (Input.GetKey("w")) {
            moveDelta.z += moveSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("s")) {
            moveDelta.z -= moveSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("a")) {
            moveDelta.x -= moveSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("d")) {
            moveDelta.x += moveSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("z")) {
            moveDelta.y -= moveSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("x")) {
            moveDelta.y += moveSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("q")) {
            yawDelta -= yawSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("e")) {
            yawDelta += yawSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("r")) {
            pitchDelta -= pitchSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("f")) {
            pitchDelta += pitchSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("i")) {
            orbitYawDelta += orbitYawSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("m")) {
            orbitYawDelta -= orbitYawSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("j")) {
            orbitPitchDelta += orbitPitchSpeed * deltaTime;
            gotInput = true;
        }

        if (Input.GetKey("k")) {
            orbitPitchDelta -= orbitPitchSpeed * deltaTime;
            gotInput = true;
        }

        if ((yawDelta != 0.0f) || 
            (pitchDelta != 0.0f)) {

            Vector3 forward = 
                transform.rotation * Vector3.forward;

            float yaw =
                Mathf.Atan2(forward.x, forward.z) *
                Mathf.Rad2Deg;

            Quaternion q = Quaternion.identity;

            if (pitchDelta != 0.0f) {
                q *= Quaternion.AngleAxis(
                    pitchDelta, 
                    Quaternion.AngleAxis(yaw, Vector3.up) * Vector3.right);
                gotInput = true;
            }

            if (yawDelta != 0.0f) {
                q *= Quaternion.AngleAxis(
                    yawDelta, 
                    Vector3.up);
                gotInput = true;
            }

            transform.rotation = 
                q *
                transform.rotation;
        }

        if (moveDelta != Vector3.zero) {

            gotInput = true;

            Vector3 forward = 
                transform.rotation * Vector3.forward;
            float yaw =
                Mathf.Atan2(forward.x, forward.z) *
                Mathf.Rad2Deg;
            Vector3 moveDeltaRotated =
                Quaternion.Euler(0.0f, yaw, 0.0f) *
                moveDelta;
            Vector3 pos =
                transform.position + moveDeltaRotated;

            pos = 
                new Vector3(
                    Mathf.Clamp(pos.x, positionMin.x, positionMax.x),
                    Mathf.Clamp(pos.y, positionMin.y, positionMax.y),
                    Mathf.Clamp(pos.z, positionMin.z, positionMax.z));

            if (transform.position != pos) {
                transform.position = pos;
            }
        }

        float scrollX =
            Mathf.Clamp(Input.mouseScrollDelta.x, -mouseScrollDeltaMax, mouseScrollDeltaMax);
        float scrollY = 
            Mathf.Clamp(Input.mouseScrollDelta.y, -mouseScrollDeltaMax, mouseScrollDeltaMax);

        wheelZoomDelta += scrollY * wheelZoomSpeed * deltaTime;
        wheelPanDelta += scrollX * wheelPanSpeed * deltaTime;

        if (wheelZoomDelta != 0.0f) {

            if (proCamera.orthographic) {

                float orthographicSize = proCamera.orthographicSize;
                orthographicSize =
                    Mathf.Max(
                        orthographicSizeMin,
                        Mathf.Min(
                            orthographicSizeMax,
                            (orthographicSize +
                             (wheelZoomDelta * orthographicSizeWheelScale))));
                if (proCamera.orthographicSize != orthographicSize) {
                    proCamera.orthographicSize = orthographicSize;
                }

            } else {

                zoomDeltaRotated =
                    transform.rotation *
                    (Vector3.forward * wheelZoomDelta * wheelZoomSpeed);

                Vector3 pos =
                    transform.position + zoomDeltaRotated;

                pos = 
                    new Vector3(
                        Mathf.Clamp(pos.x, positionMin.x, positionMax.x),
                        Mathf.Clamp(pos.y, positionMin.y, positionMax.y),
                        Mathf.Clamp(pos.z, positionMin.z, positionMax.z));

                if (transform.position != pos) {
                    //Debug.Log("ProCamera: UpdateDragging: Zoom: wheelZoomDelta: " + wheelZoomDelta + " zoomDeltaRotated: " + zoomDeltaRotated.x + " " + zoomDeltaRotated.y + " " + zoomDeltaRotated.z + " pos: " + pos.x + " " + pos.y + " " + pos.z + " transform.position: " + transform.position.x + " " + transform.position.y + " " + transform.position.z + " delta: " + (pos.x - transform.position.z) + " " + (pos.y - transform.position.y) + " " + (pos.z - transform.position.z));
                    transform.position = pos;
                }

            }

            gotInput = true;

        }
    }
    

    void UpdateAnimation()
    {

        // Dragging and input can override animation.
        if (animating || animationStart) {
            if (animationCanceledByDragging && gotInput) {
                //Debug.Log("ProCamera: UpdateAnimation: animation canceled by input!");
                animationCancel = true;
            }
        }

        if (animationCancel) {

            //Debug.Log("ProCamera: UpdateAnimation: animation canceled");
            animationCancel = false;
            animationStart = false;
            if (animating) {
                animating = false;
            }

        } else if (animationStart) {

            //Debug.Log("ProCamera: UpdateAnimation: animation started");
            animationStart = false;
            animating = true;
            animationStartTime = Time.time;
            animationStartPosition = transform.position;
            animationStartRotation = transform.rotation;
            animationStartOrthographicSize = proCamera.orthographicSize;
            animationStartNearClipPlane = proCamera.nearClipPlane;
            animationStartFarClipPlane = proCamera.farClipPlane;

        }

        if (!animating) {
           return;
       }

        //Debug.Log("ProCamera: UpdateAnimation: animating! animationStart: " + animationStart + " animationCancel: " + animationCancel);

        float t = 
            (Time.time - animationStartTime) / 
            animationDuration;

        if (t < 1.0f) {

            animationPosition =
                Vector3.Lerp(
                    animationStartPosition, 
                    animationEndPosition,
                    t);
            animationRotation =
                Quaternion.Slerp(
                    animationStartRotation, 
                    animationEndRotation,
                    t);
            animationOrthographicSize =
                Mathf.Lerp(
                    animationStartOrthographicSize, 
                    animationEndOrthographicSize,
                    t);
            animationNearClipPlane =
                Mathf.Lerp(
                    animationStartNearClipPlane, 
                    animationEndNearClipPlane,
                    t);
            animationFarClipPlane =
                Mathf.Lerp(
                    animationStartFarClipPlane, 
                    animationEndFarClipPlane,
                    t);

        } else {

            //Debug.Log("ProCamera: UpdateAnimation: animation finished");

            animating = false;
            animationPosition = animationEndPosition;
            animationRotation = animationEndRotation;
            animationOrthographicSize = animationEndOrthographicSize;
            animationNearClipPlane = animationEndNearClipPlane;
            animationFarClipPlane = animationEndFarClipPlane;

        }

        transform.position = animationPosition;
        transform.rotation = animationRotation;
        proCamera.orthographicSize = animationOrthographicSize;
        proCamera.nearClipPlane = animationNearClipPlane;
        proCamera.farClipPlane = animationFarClipPlane;

    }


}
