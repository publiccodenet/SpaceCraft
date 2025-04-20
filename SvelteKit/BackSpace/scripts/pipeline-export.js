#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const imageSize = require('image-size');

/**
 * Content Pipeline Export
 * 
 * Exports content from the shared cache to Unity StreamingAssets.
 */
class PipelineExport {
  constructor() {
    this.configsDir = path.resolve(process.cwd(), 'Content/Configs/Exporters/Unity/CraftSpace');
    this.contentCacheDir = path.resolve(process.cwd(), 'Content/collections');
    this.unityDir = path.resolve(process.cwd(), 'Unity/CraftSpace/Assets/StreamingAssets/Content');
    
    // Parse options
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.cleanDestination = process.argv.includes('--clean');
    
    // Stats
    this.stats = {
      collectionsExported: 0,
      itemsExported: 0,
      filesExported: 0,
      errors: 0
    };
  }
  
  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }
  
  async ensureDirectories() {
    await fs.ensureDir(this.unityDir);
    await fs.ensureDir(path.join(this.unityDir, 'collections'));
    
    if (this.cleanDestination) {
      console.log('Cleaning Unity content directory...');
      await fs.emptyDir(this.unityDir);
      await fs.ensureDir(path.join(this.unityDir, 'collections'));
    }
  }
  
  async loadSkeletonConfig() {
    const skeletonPath = path.join(this.configsDir, 'index-deep.json');
    
    if (!fs.existsSync(skeletonPath)) {
      throw new Error(`Skeleton configuration not found at ${skeletonPath}. Run pipeline-bootstrap.js first.`);
    }
    
    try {
      const skeleton = await fs.readJson(skeletonPath);
      this.log(`Loaded skeleton with ${skeleton.collectionsIndex.length} collections`);
      return skeleton;
    } catch (error) {
      throw new Error(`Error loading skeleton: ${error.message}`);
    }
  }
  
  /**
   * Export content from cache to Unity
   */
  async exportToUnity(skeleton) {
    // Create collections-index.json in Unity
    await fs.writeJson(
      path.join(this.unityDir, 'collections-index.json'),
      skeleton.collectionsIndex,
      { spaces: 2 }
    );
    this.stats.filesExported++;
    
    // Initialize enhanced index structure
    const enhancedIndexDeep = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collections: {},
      collectionsIndex: skeleton.collectionsIndex
    };
    
    // Process each collection
    for (const collectionId of skeleton.collectionsIndex) {
      this.log(`Exporting collection: ${collectionId}`);
      
      const collectionConfig = skeleton.collections[collectionId];
      if (!collectionConfig) continue;
      
      // Export the collection
      await this.exportCollection(collectionId, collectionConfig, enhancedIndexDeep);
    }
    
    // Write enhanced index-deep.json to Unity
    await fs.writeJson(
      path.join(this.unityDir, 'index-deep.json'),
      enhancedIndexDeep,
      { spaces: 2 }
    );
    this.stats.filesExported++;
    
    this.log('Export to Unity completed');
  }
  
  /**
   * Export a collection from cache to Unity
   */
  async exportCollection(collectionId, collectionConfig, enhancedIndexDeep) {
    // Create collection directory in Unity
    const unityCollectionDir = path.join(this.unityDir, 'collections', collectionId);
    await fs.ensureDir(unityCollectionDir);
    await fs.ensureDir(path.join(unityCollectionDir, 'items'));
    
    // Read collection.json from cache
    const collectionCachePath = path.join(this.contentCacheDir, collectionId, 'collection.json');
    
    if (fs.existsSync(collectionCachePath)) {
      try {
        // Read collection data from cache
        const collectionData = await fs.readJson(collectionCachePath);
        
        // Write collection.json to Unity
        await fs.writeJson(
          path.join(unityCollectionDir, 'collection.json'),
          collectionData,
          { spaces: 2 }
        );
        this.stats.filesExported++;
        
        // Add to enhanced index
        enhancedIndexDeep.collections[collectionId] = {
          id: collectionId,
          name: collectionData.title || collectionId,
          description: collectionData.description || '',
          collection: collectionData,
          itemsIndex: collectionConfig.itemsIndex || [],
          items: {}
        };
        
        // Write items-index.json to Unity
        await fs.writeJson(
          path.join(unityCollectionDir, 'items-index.json'),
          collectionConfig.itemsIndex || [],
          { spaces: 2 }
        );
        this.stats.filesExported++;
        
        // Export each item
        for (const itemId of collectionConfig.itemsIndex || []) {
          await this.exportItem(collectionId, itemId, enhancedIndexDeep);
        }
        
        this.stats.collectionsExported++;
      } catch (error) {
        console.error(`Error exporting collection ${collectionId}: ${error.message}`);
        this.stats.errors++;
      }
    } else {
      console.error(`Collection ${collectionId} not found in cache`);
      this.stats.errors++;
    }
  }
  
  /**
   * Export an item from cache to Unity
   */
  async exportItem(collectionId, itemId, enhancedIndexDeep) {
    const itemCachePath = path.join(this.contentCacheDir, collectionId, 'Items', itemId, 'item.json');
    const coverCachePath = path.join(this.contentCacheDir, collectionId, 'Items', itemId, 'cover.jpg');
    
    // Create item directory in Unity
    const unityItemDir = path.join(this.unityDir, 'collections', collectionId, 'items', itemId);
    await fs.ensureDir(unityItemDir);
    
    try {
      // Export item.json
      if (fs.existsSync(itemCachePath)) {
        // Read item data from cache
        const itemData = await fs.readJson(itemCachePath);
        
        // Write item.json to Unity
        await fs.writeJson(
          path.join(unityItemDir, 'item.json'),
          itemData,
          { spaces: 2 }
        );
        this.stats.filesExported++;
        
        // Add to enhanced index
        enhancedIndexDeep.collections[collectionId].items[itemId] = {
          id: itemId,
          name: itemData.title || itemId,
          description: Array.isArray(itemData.description) 
            ? itemData.description.join(' ') 
            : (itemData.description || ''),
          item: itemData
        };
      } else {
        throw new Error(`Item ${itemId} not found in cache`);
      }
      
      // Export cover image
      if (fs.existsSync(coverCachePath)) {
        // Copy cover image to Unity
        await fs.copyFile(
          coverCachePath,
          path.join(unityItemDir, 'cover.jpg')
        );
        this.stats.filesExported++;
        
        // Get image dimensions if possible
        try {
          // Note: In a real implementation we'd use a proper image library
          // Here we're assuming the optional 'image-size' package is installed
          // In production, make sure to install it or use another method
          // to get image dimensions
          try {
            const dimensions = imageSize(coverCachePath);
            
            // Add dimensions to enhanced index
            if (enhancedIndexDeep.collections[collectionId].items[itemId]) {
              enhancedIndexDeep.collections[collectionId].items[itemId].coverImage = {
                width: dimensions.width,
                height: dimensions.height,
                fileName: 'cover.jpg'
              };
            }
          } catch (err) {
            // If image-size package isn't available, use fallback dimensions
            if (enhancedIndexDeep.collections[collectionId].items[itemId]) {
              enhancedIndexDeep.collections[collectionId].items[itemId].coverImage = {
                width: 600,  // fallback dimensions
                height: 900, // fallback dimensions
                fileName: 'cover.jpg'
              };
            }
          }
        } catch (sizeError) {
          console.warn(`Warning: Couldn't read image dimensions for ${collectionId}/${itemId}`);
        }
      } else {
        this.log(`No cover image found for ${collectionId}/${itemId}`);
      }
      
      this.stats.itemsExported++;
    } catch (error) {
      console.error(`Error exporting item ${collectionId}/${itemId}: ${error.message}`);
      this.stats.errors++;
    }
  }
  
  async run() {
    console.log('📤 Exporting content from cache to Unity...');
    
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Load skeleton configuration
      const skeleton = await this.loadSkeletonConfig();
      
      // Export content from cache to Unity
      await this.exportToUnity(skeleton);
      
      // Output stats
      console.log('\n📊 Export Statistics:');
      console.log(`Collections exported: ${this.stats.collectionsExported}`);
      console.log(`Items exported: ${this.stats.itemsExported}`);
      console.log(`Files exported: ${this.stats.filesExported}`);
      console.log(`Errors: ${this.stats.errors}`);
      
      console.log('\n✅ Export completed successfully');
      return true;
    } catch (error) {
      console.error(`❌ Export failed: ${error.message}`);
      return false;
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  const exporter = new PipelineExport();
  exporter.run().catch(error => {
    console.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
} 