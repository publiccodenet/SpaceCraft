import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs-extra';
import path from 'path';
import { PATHS } from '$lib/constants';

/**
 * GET handler for collections API
 * Lists all collections
 */
export const GET: RequestHandler = async () => {
    try {
        const collectionsDir = PATHS.COLLECTIONS_DIR;
        
        console.log('Collections directory path:', collectionsDir);
        console.log('Directory exists:', fs.existsSync(collectionsDir));
        
        // If directory doesn't exist, create it
        if (!fs.existsSync(collectionsDir)) {
            fs.mkdirSync(collectionsDir, { recursive: true });
            console.log('Created collections directory');
            return json({ collections: [] });
        }
        
        // Get all subdirectories in the collections directory
        const collections = fs.readdirSync(collectionsDir)
            .filter(item => {
                const itemPath = path.join(collectionsDir, item);
                return fs.statSync(itemPath).isDirectory();
            })
            .map(collectionId => {
                // Path to collection.json
                const configPath = path.join(collectionsDir, collectionId, 'collection.json');
                
                if (fs.existsSync(configPath)) {
                    try {
                        // Read collection data
                        const collectionData = fs.readJSONSync(configPath);
                        return {
                            id: collectionId,
                            ...collectionData
                        };
                    } catch (error) {
                        console.error(`Error reading collection ${collectionId}:`, error);
                        return {
                            id: collectionId,
                            name: collectionId,
                            error: 'Error reading collection data'
                        };
                    }
                } else {
                    return {
                        id: collectionId,
                        name: collectionId
                    };
                }
            });
        
        return json(collections);
    } catch (error) {
        console.error('Error listing collections:', error);
        return json({ error: 'Error listing collections', details: error.message }, { status: 500 });
    }
}; 