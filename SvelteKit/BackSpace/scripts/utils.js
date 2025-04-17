function getCollectionPath(collectionId) {
  return path.join(collectionsDir, collectionId);
}

function getItemPath(collectionId, itemId) {
  return path.join(collectionsDir, collectionId, 'items', itemId);
} 