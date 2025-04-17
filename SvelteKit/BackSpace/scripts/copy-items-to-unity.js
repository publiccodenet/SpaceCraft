import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

// Get the directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to recursively create directories
const ensureDirSync = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Helper function to delete a directory recursively
const deleteDirSync = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`Deleted existing directory: ${dirPath}`);
  }
};

// Helper function to copy directories recursively
const copyDirSync = (src, dest) => {
  // Create destination directory
  ensureDirSync(dest);
  
  // Read source directory contents
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // Process each entry
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirSync(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// Helper function to download a file
const downloadFile = (url, destination) => {
  return new Promise((resolve, reject) => {
    // Ensure the directory exists
    ensureDirSync(path.dirname(destination));
    
    // Create a write stream
    const file = fs.createWriteStream(destination);
    
    // Make the request
    https.get(url, (response) => {
      // Check for redirect
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          // Follow the redirect
          console.log(`Following redirect to: ${response.headers.location}`);
          downloadFile(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
          return;
        }
      }
      
      // Check if the request was successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}. Status code: ${response.statusCode}`));
        return;
      }
      
      // Pipe the response to the file
      response.pipe(file);
      
      // Handle errors
      response.on('error', (err) => {
        file.close();
        fs.unlink(destination, () => {}); // Delete the file on error
        reject(err);
      });
      
      // When the download is complete
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      // Handle write errors
      file.on('error', (err) => {
        file.close();
        fs.unlink(destination, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {}); // Delete the file on error
      reject(err);
    });
  });
};

// Generate archive.org image URL from itemId
const getArchiveImageUrl = (itemId) => {
  return `https://archive.org/services/img/${itemId}`;
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node copy-items-to-unity.js COLLECTION_ID ITEM_ID1 [ITEM_ID2 ...]');
  process.exit(1);
}

const collectionId = args[0];
const itemIds = args.slice(1);

console.log(`Processing collection ${collectionId} with ${itemIds.length} items`);

// Define paths with correct structure as specified
const projectRoot = path.resolve(__dirname, '../../..');
const contentBasePath = path.join(projectRoot, 'Content/collections');
const unityBasePath = path.join(projectRoot, 'Unity/CraftSpace/Assets/Resources/Content/collections');

console.log(`Content base path: ${contentBasePath}`);
console.log(`Unity base path: ${unityBasePath}`);

// Ensure the collection directory exists
ensureDirSync(path.join(unityBasePath, collectionId, 'items'));

// Process each item (copy and download)
(async () => {
  for (const itemId of itemIds) {
    const sourcePath = path.join(contentBasePath, collectionId, 'items', itemId);
    const destPath = path.join(unityBasePath, collectionId, 'items', itemId);
    
    try {
      // Delete the destination directory if it exists for a clean start
      deleteDirSync(destPath);
      
      // Create the item directory
      ensureDirSync(destPath);
      
      // Copy item content if it exists
      if (fs.existsSync(sourcePath)) {
        copyDirSync(sourcePath, destPath);
        console.log(`Copied item ${itemId} to Unity`);
      } else {
        console.warn(`Warning: Source item not found: ${sourcePath}`);
      }
      
      // Download the cover image from archive.org
      const imageUrl = getArchiveImageUrl(itemId);
      const imageDest = path.join(destPath, 'cover.jpg');
      
      try {
        console.log(`Downloading cover for ${itemId}...`);
        await downloadFile(imageUrl, imageDest);
        console.log(`Downloaded cover for ${itemId}`);
        
        // Also create a simple title file with the item ID as content
        fs.writeFileSync(path.join(destPath, 'title'), itemId.replace(/-/g, ' ').replace(/_.*$/, ''));
      } catch (err) {
        console.error(`Error downloading cover for ${itemId}:`, err.message);
      }
    } catch (err) {
      console.error(`Error processing item ${itemId}:`, err);
    }
  }
  
  // Scan the destination directory to create the items index
  const itemsPath = path.join(unityBasePath, collectionId, 'items');
  const indexPath = path.join(unityBasePath, collectionId, 'items-index.json');
  
  try {
    // Get all immediate subdirectories of the items directory
    const allItemIds = fs.readdirSync(itemsPath)
      .filter(file => fs.statSync(path.join(itemsPath, file)).isDirectory());
    
    // Write the index file
    fs.writeFileSync(indexPath, JSON.stringify(allItemIds, null, 2));
    console.log(`Updated index with ${allItemIds.length} items at: ${indexPath}`);
  } catch (err) {
    console.error('Error creating items index:', err);
  }
})(); 