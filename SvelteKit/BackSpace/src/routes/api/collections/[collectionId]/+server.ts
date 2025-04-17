import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs-extra';
import path from 'path';
import { PATHS } from '$lib/constants';

/**
 * GET handler for single collection API
 * Returns details about a specific collection
 */
export const GET: RequestHandler = async ({ params }) => {
    try {
        const { collectionId } = params;
        const collectionPath = path.join(PATHS.COLLECTIONS_DIR, collectionId);
        const collectionFile = path.join(collectionPath, 'collection.json');
        
        if (!fs.existsSync(collectionFile)) {
            return json({ error: `Collection ${collectionId} not found` }, { status: 404 });
        }
        
        const collection = fs.readJSONSync(collectionFile);
        return json(collection);
    } catch (error) {
        console.error(`Error fetching collection:`, error);
        return json({ error: 'Error fetching collection' }, { status: 500 });
    }
};

/**
 * PUT handler for single collection API
 * Updates a collection
 */
export const PUT: RequestHandler = async ({ request, params }) => {
    try {
        const { collectionId } = params;
        const collectionPath = path.join(PATHS.COLLECTIONS_DIR, collectionId);
        const collectionFile = path.join(collectionPath, 'collection.json');
        
        if (!fs.existsSync(collectionFile)) {
            return json({ error: `Collection ${collectionId} not found` }, { status: 404 });
        }
        
        // Read existing collection
        const existingCollection = fs.readJSONSync(collectionFile);
        
        // Get update data
        const updates = await request.json();
        
        // Merge updates with existing data
        const updatedCollection = {
            ...existingCollection,
            ...updates,
            lastUpdated: new Date().toISOString()
        };
        
        // Save updated collection
        fs.writeJSONSync(collectionFile, updatedCollection, { spaces: 2 });
        
        return json(updatedCollection);
    } catch (error) {
        console.error(`Error updating collection:`, error);
        return json({ error: 'Error updating collection' }, { status: 500 });
    }
};

/**
 * DELETE handler for single collection API
 * Deletes a collection
 */
export const DELETE: RequestHandler = async ({ params }) => {
    try {
        const { collectionId } = params;
        const collectionPath = path.join(PATHS.COLLECTIONS_DIR, collectionId);
        
        if (!fs.existsSync(collectionPath)) {
            return json({ error: `Collection ${collectionId} not found` }, { status: 404 });
        }
        
        // Delete collection directory
        await fs.remove(collectionPath);
        
        return json({ success: true, message: `Collection ${collectionId} deleted` });
    } catch (error) {
        console.error(`Error deleting collection:`, error);
        return json({ error: 'Error deleting collection' }, { status: 500 });
    }
}; 