export async function GET({ params }) {
  const collectionId = params.collectionId;

  const collection = await getCollection(collectionId);

  // Rest of the handler
} 