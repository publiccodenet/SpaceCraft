import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs-extra';
import path from 'path';
import { PATHS } from '$lib/constants';

/**
 * GET handler for a specific item
 */
export const GET: RequestHandler = async ({ params }) => {
  const { collectionId, itemId } = params;

  try {
    const result = await getItem(collectionId, itemId);
    return json(result);
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 });
  }
};

/**
 * PUT handler for updating a specific item
 */
export const PUT: RequestHandler = async ({ request, params }) => {
  const { collectionId, itemId } = params;
  const updates = await request.json();

  try {
    // Get the existing item first
    const existingItem = await getItem(collectionId, itemId);
    
    // Merge updates with existing item
    const updatedItem = {
      ...existingItem,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    // Preserve original ID and collection ID
    updatedItem.id = itemId;
    updatedItem.collectionId = collectionId;
    
    // Save updated item
    const itemPath = path.join(PATHS.COLLECTIONS_DIR, collectionId, 'items', itemId, 'item.json');
    fs.writeJSONSync(itemPath, updatedItem, { spaces: 2 });
    
    return json(updatedItem);
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 500 });
  }
};

/**
 * DELETE handler for removing a specific item
 */
export const DELETE: RequestHandler = async ({ params }) => {
  const { collectionId, itemId } = params;

  try {
    // Check if item exists
    const itemPath = path.join(PATHS.COLLECTIONS_DIR, collectionId, 'items', itemId);
    if (!fs.existsSync(itemPath)) {
      return json({ error: `Item ${itemId} not found` }, { status: 404 });
    }
    
    // Remove item directory
    await fs.remove(itemPath);
    
    // Update collection index (if exists)
    const indexPath = path.join(PATHS.COLLECTIONS_DIR, collectionId, 'items-index.json');
    if (fs.existsSync(indexPath)) {
      const index = fs.readJSONSync(indexPath);
      const updatedIndex = index.filter(id => id !== itemId);
      fs.writeJSONSync(indexPath, updatedIndex, { spaces: 2 });
    }
    
    return json({ success: true, message: `Item ${itemId} deleted` });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

// Helper function to get an item
async function getItem(collectionId: string, itemId: string) {
  const itemPath = path.join(PATHS.COLLECTIONS_DIR, collectionId, 'items', itemId, 'item.json');
  
  if (!fs.existsSync(itemPath)) {
    const error = new Error(`Item ${itemId} not found in collection ${collectionId}`);
    error['status'] = 404;
    throw error;
  }
  
  return fs.readJSON(itemPath);
} 