import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Try a more robust import approach
let InternetArchiveSDK: any;
try {
  const mod = await import("internetarchive-sdk-js");
  // Handle different export possibilities
  InternetArchiveSDK = mod.default || mod.InternetArchiveSDK || mod;
} catch (err) {
  console.error("Error importing Internet Archive SDK:", err);
  // Provide a fallback/mock if needed
  InternetArchiveSDK = class MockSDK {
    constructor() {}
    async search(): Promise<{response: {docs: any[], numFound: number}}> { 
      return { response: { docs: [], numFound: 0 } }; 
    }
  };
}

const ia = new InternetArchiveSDK();

/**
 * GET handler for the /api/openlibrary endpoint
 */
export const GET: RequestHandler = async ({ url }) => {
    try {
        const query = url.searchParams.get('q') || '';
        const subject = url.searchParams.get('subject') || 'Science fiction';
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        
        // Build search query combining user query, subject and collection
        let searchQuery = `collection:openlibrary AND mediatype:texts`;
        
        if (subject) {
            searchQuery += ` AND subject:"${subject}"`;
        }
        
        if (query) {
            searchQuery += ` AND (title:"${query}" OR creator:"${query}")`;
        }
        
        // Search for books based on query
        const response = await ia.search({
            query: searchQuery,
            fields: [
                'identifier', 'title', 'creator', 'description', 
                'subject', 'publisher', 'date', 'language',
                'isbn', 'oclc', 'lccn', 'cover_image'
            ],
            rows: limit,
            page: page,
            sort: ['title asc']
        });
        
        return json({
            results: response.response.docs,
            total: response.response.numFound,
            page,
            limit
        });
    } catch (error) {
        console.error('Error fetching OpenLibrary data:', error);
        return json({ error: 'Failed to fetch OpenLibrary data' }, { status: 500 });
    }
}; 