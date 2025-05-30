////////////////////////////////////////////////////////////////////////
// Tile.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.


using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;


public class Tile: MonoBehaviour {


    ////////////////////////////////////////////////////////////////////////
    // Instance Variables


    public MeshRenderer meshRenderer;

    public Vector2 textureOffset = Vector2.zero;
    public Vector2 textureScale = Vector2.one;
    public bool grid = false;
    public int gridRows = 1;
    public int gridColumns = 1;
    public int gridCell = 0;
    public int gridCellLast = -1;
    public int gridCellCount = 0;
    public bool gridAnimation = false;
    public bool gridAnimationRandom = false;
    public float gridAnimationStartTime = 0.0f;
    public float gridAnimationCellsPerSecond = 8.0f;
    public bool worldTexture = false;
    public Vector2 worldTextureScale = Vector2.one;
    public Vector2 worldTextureOffset = Vector2.zero;
    public Vector2 worldTexturePin = Vector2.zero;

    public string textureName;
    public string textureURL;
    public Texture2D texture;

    public bool updateTexture = false;
    public bool updateMaterial = false;
    public bool updateMaterialAlways = false;


    ////////////////////////////////////////////////////////////////////////
    // Instance Methods


    void Start()
    {
        updateTexture = true;
        updateMaterial = true;
    }


    void Update()
    {
        if (updateTexture) {

            updateTexture = false;
            updateMaterial = true;

            if (!string.IsNullOrEmpty(textureName)) {
                texture = (Texture2D)Resources.Load(textureName);
                Debug.Log("Tile: Loaded texture from Resources: " + textureName);
            } else if (!string.IsNullOrEmpty(textureURL)) {
                StartCoroutine(LoadTexture(textureURL));
            }

        }

        if (grid) {

            if (gridAnimation && 
                (gridAnimationCellsPerSecond > 0) &&
                (Time.time >= (gridAnimationStartTime + (1.0f / gridAnimationCellsPerSecond)))) {

                gridAnimationStartTime = Time.time;

                if (gridAnimationRandom) {
                    gridCell = UnityEngine.Random.Range(0, gridCellCount);
                } else {
                    gridCell = (gridCell + 1) % ((gridCellCount < 1) ? 1 : gridCellCount);
                }

                gridAnimationStartTime = Time.time;

            }

            if (gridCellLast != gridCell) {
                gridCellLast = gridCell;
                updateMaterial = true;
            }

        } else if (worldTexture) {

            float width = 
                transform.localScale.x / worldTextureScale.x;
            float height = 
                transform.localScale.y / worldTextureScale.y;
            textureScale =
                new Vector2(
                    width, 
                    height);
            textureOffset =
                new Vector2(
                    worldTextureOffset.x - (worldTexturePin.x * width),
                    worldTextureOffset.y - (worldTexturePin.y * height));

        }

        if (updateMaterial || updateMaterialAlways) {

            updateMaterial = false;

            if (grid) {
                int column = gridCell % gridColumns;
                int row = (gridRows - 1) - (gridCell / gridColumns);
                float w = 1.0f / gridColumns;
                float h = 1.0f / gridRows;
                float x = column * w;
                float y = row * h;

                textureOffset = new Vector2(x, y);
                textureScale = new Vector2(w, h);
            }

            if (texture != null) {
                meshRenderer.material.mainTexture = texture;
            }

            meshRenderer.material.mainTextureOffset = textureOffset;
            meshRenderer.material.mainTextureScale = textureScale;
        }

    }


    IEnumerator LoadTexture(string url)
    {
        // Use Brewster's centralized texture loading instead of direct web request
        // Define a callback that will run when the texture is loaded
        Action<Texture2D> onTextureLoaded = (texture) => {
            if (texture != null) {
                meshRenderer.material.mainTexture = texture;
                updateMaterial = true;
                Debug.Log("Tile: Loaded texture: " + url);
            } else {
                Debug.LogError("Tile: Failed to load texture: " + url);
            }
        };
        
        // Request texture through Brewster (now using path as the cache key)
        Brewster.Instance.LoadTexture(url, onTextureLoaded);
        
        // No need to actually yield anything since Brewster handles the async loading
        yield break;
    }


}
