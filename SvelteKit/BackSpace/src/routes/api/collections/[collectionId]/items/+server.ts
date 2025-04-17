import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs-extra';
import path from 'path';
import { PATHS } from '$lib/constants';
import { error } from '@sveltejs/kit';

/**
 * GET handler for collection items API
 * Lists all items in a collection
 */
export const GET: RequestHandler = async ({ params, url }) => {
  const { collectionId } = params;
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const skip = parseInt(url.searchParams.get('skip') || '0', 10);
  
  try {
    // Path to collection items directory
    const collectionPath = path.join(PATHS.COLLECTIONS_DIR, collectionId);
    const itemsIndexPath = path.join(collectionPath, 'items-index.json');
    
    if (!fs.existsSync(collectionPath)) {
      throw error(404, { message: `Collection ${collectionId} not found` });
    }
    
    // Get items from index if it exists, otherwise list directory
    let itemIds = [];
    if (fs.existsSync(itemsIndexPath)) {
      itemIds = fs.readJSONSync(itemsIndexPath);
    } else {
      const itemsDir = path.join(collectionPath, 'items');
      if (fs.existsSync(itemsDir)) {
        itemIds = fs.readdirSync(itemsDir)
          .filter(dir => fs.statSync(path.join(itemsDir, dir)).isDirectory());
      }
    }
    
    // Apply pagination
    const paginatedIds = itemIds.slice(skip, skip + limit);
    
    // Load each item
    const items = await Promise.all(paginatedIds.map(async (itemId) => {
      const itemPath = path.join(collectionPath, 'items', itemId, 'item.json');
      if (fs.existsSync(itemPath)) {
        try {
          return fs.readJSON(itemPath);
        } catch (err) {
          console.error(`Error reading item ${itemId}:`, err);
          return { id: itemId, error: 'Error reading item data' };
        }
      }
      return { id: itemId };
    }));
    
    return json({
      collectionId,
      items,
      total: itemIds.length,
      limit,
      skip
    });
  } catch (err) {
    console.error(`Error listing items for collection ${collectionId}:`, err);
    
    if (err.status === 404) {
      throw error(404, { message: `Collection ${collectionId} not found` });
    }
    
    throw error(500, { message: 'Failed to list items' });
  }
};

/**
 * POST handler for collection items API
 * Creates a new item in the collection
 */
export const POST: RequestHandler = async ({ request, params }) => {
  const { collectionId } = params;
  const itemData = await request.json();
  
  try {
    // Validate required fields
    if (!itemData.id) {
      return json({ error: 'Item ID is required' }, { status: 400 });
    }
    
    const itemId = itemData.id;
    const collectionPath = path.join(PATHS.COLLECTIONS_DIR, collectionId);
    const itemsDir = path.join(collectionPath, 'items');
    const itemDir = path.join(itemsDir, itemId);
    
    // Check if collection exists
    if (!fs.existsSync(collectionPath)) {
      return json({ error: `Collection ${collectionId} not found` }, { status: 404 });
    }
    
    // Create items directory if it doesn't exist
    fs.ensureDirSync(itemsDir);
    
    // Check if item already exists
    if (fs.existsSync(itemDir)) {
      return json({ error: `Item with ID ${itemId} already exists` }, { status: 409 });
    }
    
    // Create item directory
    fs.ensureDirSync(itemDir);
    
    // Add metadata to the item
    const newItem = {
      ...itemData,
      collectionId,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Write item file
    const itemFile = path.join(itemDir, 'item.json');
    fs.writeJSONSync(itemFile, newItem, { spaces: 2 });
    
    // Update collection index (if exists)
    const indexPath = path.join(collectionPath, 'items-index.json');
    if (fs.existsSync(indexPath)) {
      const index = fs.readJSONSync(indexPath);
      if (!index.includes(itemId)) {
        index.push(itemId);
        fs.writeJSONSync(indexPath, index, { spaces: 2 });
      }
    }
    
    return json(newItem, { status: 201 });
  } catch (err) {
    console.error(`Error creating item in collection ${collectionId}:`, err);
    return json({ error: 'Error creating item' }, { status: 500 });
  }
}; 