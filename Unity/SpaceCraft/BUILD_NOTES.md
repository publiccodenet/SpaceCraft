# SpaceCraft Unity Build Notes

## Content Loading Issues

### Missing Items in Collection Registry

**Issue**: During runtime, you may see warnings like:
```
[Collection:scifi] Failed to retrieve Item with ID 'thedispossessed0000legu' from registry.
```

**Cause**: This occurs when an item ID is listed in a collection's `itemsIndex` array but the corresponding item data is missing from the `items` section of the content JSON.

**Solutions**:
1. **Verify Content Data**: Check that your `StreamingAssets/Content/index-deep.json` file has consistent data between `itemsIndex` arrays and `items` objects.
2. **Check Symlinks**: The build process removes symlinks that might cause issues. Ensure your content files are actual files, not symlinks.
3. **Regenerate Content**: If using automated content generation, regenerate your content data to ensure consistency.

**Troubleshooting**:
- The application will continue to work but will skip missing items
- Check Unity console for detailed warnings about missing items
- Brewster will log a summary of missing items for each collection

### Symlink Removal During Build

The build process automatically removes symbolic links from the build directory to prevent WebGL build issues. This is normal behavior and helps ensure content files are properly included in the build.

## Build Process

- Use `SpaceCraft > WebGL Development Build` for development builds
- Use `SpaceCraft > WebGL Production Build` for release builds
- Both builds automatically clean symlinks and force the correct WebGL template

## Performance Notes

- The application loads all content at startup
- Large collections may take longer to initialize
- Missing items are handled gracefully but may impact performance during enumeration 