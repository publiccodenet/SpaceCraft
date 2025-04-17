<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  export let data;
  $: collectionId = data.collection?.id || '';
  $: itemId = data.item?.id || '';
  
  let collection = null;
  let item = null;
  let loading = true;
  let error = null;
  let notFound = false;
  let collectionNotFound = false;
  
  onMount(async () => {
    try {
      // First check if collection exists
      const collectionResponse = await fetch(`/api/collections/${collectionId}`);
      
      if (collectionResponse.status === 404) {
        collectionNotFound = true;
        loading = false;
        return;
      }
      
      if (!collectionResponse.ok) {
        throw new Error(`Error fetching collection: ${collectionResponse.statusText}`);
      }
      
      collection = await collectionResponse.json();
      
      // Check if the item exists in the collection
      let foundItem = null;
      
      if (collection.itemsArray) {
        foundItem = collection.itemsArray.find(i => i.id === itemId);
      } else if (collection.items && typeof collection.items === 'object') {
        foundItem = collection.items[itemId];
        if (foundItem) {
          foundItem.id = itemId;
        }
      }
      
      if (!foundItem) {
        notFound = true;
        loading = false;
        return;
      }
      
      item = foundItem;
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }
  
  function handleRetry() {
    window.location.reload();
  }
  
  $: titleText = collectionNotFound ? 'Collection Not Found' 
               : notFound ? 'Item Not Found' 
               : `Item: ${item.title} | Collection: ${collection.name}`;
</script>

<svelte:head>
  <title>{titleText}</title>
</svelte:head>

<div class="item-page">
  {#if loading}
    <div class="loading">
      <p>Loading item...</p>
    </div>
  {:else if collectionNotFound}
    <div class="not-found">
      <h1>Collection Not Found</h1>
      <p>The collection with ID "{collectionId}" does not exist.</p>
      <div class="action-buttons">
        <a href="/admin/collections" class="secondary-button">Back to Collections</a>
      </div>
    </div>
  {:else if notFound}
    <div class="not-found">
      <h1>Item Not Found</h1>
      <p>The item with ID "{itemId}" does not exist in this collection.</p>
      <div class="action-buttons">
        <a href={`/admin/collections/${collectionId}/items`} class="secondary-button">Back to Items</a>
        <a href={`/admin/collections/${collectionId}/items/create?id=${itemId}`} class="primary-button">Create Item</a>
      </div>
    </div>
  {:else if error}
    <div class="error-container">
      <h1>Error</h1>
      <p class="error-message">{error}</p>
      <button onclick={handleRetry}>Try Again</button>
    </div>
  {:else}
    <div class="breadcrumbs">
      <a href="/admin">Admin</a> / 
      <a href="/admin/collections">Collections</a> / 
      <a href={`/admin/collections/${collectionId}`}>{collection.name}</a> / 
      <a href={`/admin/collections/${collectionId}/items`}>Items</a> /
      <span>{item.title}</span>
    </div>
    
    <header>
      <div class="header-content">
        <div>
          <h1>{item.title}</h1>
          {#if item.creator}
            <p class="creator">By {item.creator}</p>
          {/if}
        </div>
        <div class="header-actions">
          <a href={`/admin/collections/${collectionId}/items/${itemId}/edit`} class="secondary-button">Edit</a>
          <a href={`/admin/collections/${collectionId}/items/${itemId}/download`} class="primary-button">Download</a>
        </div>
      </div>
    </header>
    
    <div class="item-details">
      <div class="detail-section metadata">
        <h2>Metadata</h2>
        <div class="detail-card">
          <div class="detail-item">
            <span class="label">ID:</span>
            <span class="value"><code>{item.id}</code></span>
          </div>
          
          {#if item.date}
            <div class="detail-item">
              <span class="label">Date:</span>
              <span class="value">{formatDate(item.date)}</span>
            </div>
          {/if}
          
          {#if item.mediatype}
            <div class="detail-item">
              <span class="label">Type:</span>
              <span class="value">{item.mediatype}</span>
            </div>
          {/if}
          
          {#if item.subject}
            <div class="detail-item">
              <span class="label">Subject:</span>
              <span class="value">
                {#if Array.isArray(item.subject)}
                  {item.subject.join(', ')}
                {:else}
                  {item.subject}
                {/if}
              </span>
            </div>
          {/if}
          
          {#if item.source}
            <div class="detail-item">
              <span class="label">Source:</span>
              <span class="value">
                <a href={item.source} class="source-link" target="_blank" rel="noopener noreferrer">
                  {item.source}
                </a>
              </span>
            </div>
          {/if}
        </div>
      </div>
      
      {#if item.description}
        <div class="detail-section description">
          <h2>Description</h2>
          <div class="detail-card">
            <div class="item-description">
              {#if typeof item.description === 'string'}
                <p>{item.description}</p>
              {:else if Array.isArray(item.description)}
                {#each item.description as desc}
                  <p>{desc}</p>
                {/each}
              {/if}
            </div>
          </div>
        </div>
      {/if}
      
      {#if item.files && item.files.length > 0}
        <div class="detail-section files">
          <h2>Files</h2>
          <div class="detail-card">
            <div class="files-table-wrapper">
              <table class="files-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Format</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each item.files as file}
                    <tr>
                      <td>{file.name}</td>
                      <td>{file.size ? formatFileSize(file.size) : 'Unknown'}</td>
                      <td>{file.format || '-'}</td>
                      <td class="col-actions">
                        {#if file.downloaded}
                          <a href={`/api/files/${collectionId}/${itemId}/${file.name}`} class="action-button download" download>Download</a>
                        {:else}
                          <button class="action-button fetch" onclick={() => handleFetchFile(file)}>Fetch</button>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .item-page {
    width: 100%;
  }
  
  .breadcrumbs {
    margin-bottom: 1.5rem;
    color: #666;
    font-size: 0.9rem;
  }
  
  .breadcrumbs a {
    color: #007bff;
    text-decoration: none;
    margin: 0 0.5rem;
  }
  
  .breadcrumbs a:first-child {
    margin-left: 0;
  }
  
  .breadcrumbs a:hover {
    text-decoration: underline;
  }
  
  .breadcrumbs span {
    color: #333;
    font-weight: 500;
  }
  
  .not-found, .loading, .error-container {
    background: #f8f9fa;
    padding: 3rem;
    text-align: center;
    border-radius: 8px;
    margin-top: 2rem;
  }
  
  .error-message {
    color: #e53935;
    margin-bottom: 1rem;
  }
  
  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .primary-button, .secondary-button {
    padding: 0.7rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    font-size: 1rem;
    text-decoration: none;
  }
  
  .primary-button {
    background: #4caf50;
    color: white;
  }
  
  .secondary-button {
    background: #f1f1f1;
    color: #333;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }
  
  .header-actions {
    display: flex;
    gap: 0.75rem;
  }
  
  h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem 0;
  }
  
  h2 {
    font-size: 1.75rem;
    margin: 1.5rem 0 1rem 0;
  }
  
  .creator {
    color: #666;
    margin: 0;
    font-size: 1.1rem;
  }
  
  .item-details {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .detail-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .detail-item {
    display: flex;
    margin-bottom: 0.75rem;
  }
  
  .label {
    font-weight: 500;
    width: 100px;
    color: #666;
  }
  
  .value {
    flex: 1;
  }
  
  .value code {
    font-family: monospace;
    background: #f0f0f0;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .source-link {
    color: #0066cc;
    text-decoration: none;
    word-break: break-word;
  }
  
  .source-link:hover {
    text-decoration: underline;
  }
  
  .item-description p {
    margin-top: 0;
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  
  .item-description p:last-child {
    margin-bottom: 0;
  }
  
  .files-table-wrapper {
    overflow-x: auto;
  }
  
  .files-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }
  
  .files-table th,
  .files-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  .files-table th {
    background: #f5f5f5;
    font-weight: 600;
  }
  
  .files-table tr:last-child td {
    border-bottom: none;
  }
  
  .action-button {
    padding: 0.35rem 0.6rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    text-decoration: none;
    display: inline-block;
  }
  
  .action-button.download {
    background: #2196f3;
    color: white;
  }
  
  .action-button.fetch {
    background: #673ab7;
    color: white;
  }
</style> 