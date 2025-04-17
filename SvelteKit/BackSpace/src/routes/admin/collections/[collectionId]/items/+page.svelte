<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  const collectionId = $page.params.collectionId;
  
  let collection = null;
  let items = [];
  let loading = true;
  let error = null;
  let notFound = false;
  
  onMount(async () => {
    try {
      const response = await fetch(`/api/collections/${collectionId}`);
      
      if (response.status === 404) {
        notFound = true;
        loading = false;
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Error fetching collection: ${response.statusText}`);
      }
      
      collection = await response.json();
      
      // Extract items from the collection
      if (collection.itemsArray) {
        items = collection.itemsArray;
      } else if (collection.items && typeof collection.items === 'object') {
        items = Object.keys(collection.items).map(key => ({
          id: key,
          ...collection.items[key]
        }));
      } else {
        items = [];
      }
      
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
  
  // Add reactive title text 
  $: titleText = notFound 
     ? 'Collection Not Found'
     : collection 
     ? `Items in ${collection.name}`
     : 'Loading Collection';
</script>

<svelte:head>
  <title>{titleText} | BackSpace Admin</title>
</svelte:head>

<div class="items-page">
  {#if loading}
    <div class="loading">
      <p>Loading items...</p>
    </div>
  {:else if notFound}
    <div class="not-found">
      <h1>Collection Not Found</h1>
      <p>The collection with ID "{collectionId}" does not exist.</p>
      <div class="action-buttons">
        <a href="/admin/collections" class="secondary-button">Back to Collections</a>
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
      <span>Items</span>
    </div>
    
    <header>
      <div class="header-content">
        <div>
          <h1>Items in {collection.name}</h1>
          <p class="description">
            {collection.totalItems || items.length} items in this collection
          </p>
        </div>
        <div class="header-actions">
          <a href={`/admin/collections/${collectionId}/items/create`} class="primary-button">Add Item</a>
          <a href={`/admin/collections/${collectionId}/fetch`} class="secondary-button">Fetch Items</a>
        </div>
      </div>
    </header>
    
    {#if items.length === 0}
      <div class="empty-state">
        <p>No items found in this collection.</p>
        <div class="action-buttons">
          <a href={`/admin/collections/${collectionId}/items/create`} class="primary-button">Add Item</a>
          <a href={`/admin/collections/${collectionId}/fetch`} class="secondary-button">Fetch Items</a>
        </div>
      </div>
    {:else}
      <div class="items-grid">
        {#each items as item}
          <a href={`/admin/collections/${collectionId}/items/${item.id}`} class="item-card">
            <div class="item-title">
              <h3>{item.title}</h3>
              <span class="item-id">{item.id}</span>
            </div>
            
            <div class="item-metadata">
              {#if item.creator}
                <div class="metadata-item">
                  <span class="label">By:</span>
                  <span class="value">{item.creator}</span>
                </div>
              {/if}
              
              {#if item.date}
                <div class="metadata-item">
                  <span class="label">Date:</span>
                  <span class="value">{formatDate(item.date)}</span>
                </div>
              {/if}
              
              {#if item.mediatype}
                <div class="metadata-item">
                  <span class="label">Type:</span>
                  <span class="value">{item.mediatype}</span>
                </div>
              {/if}
            </div>
            
            {#if item.description}
              <div class="item-description">
                {#if typeof item.description === 'string'}
                  {item.description.substring(0, 120)}{item.description.length > 120 ? '...' : ''}
                {:else if Array.isArray(item.description) && item.description.length > 0}
                  {item.description[0].substring(0, 120)}{item.description[0].length > 120 ? '...' : ''}
                {/if}
              </div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .items-page {
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
  
  .not-found, .loading, .error-container, .empty-state {
    background: #f9f9f9;
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
  
  .description {
    color: #666;
    margin: 0;
  }
  
  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .item-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
  }
  
  .item-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .item-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  
  .item-title h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #333;
  }
  
  .item-id {
    color: #999;
    font-size: 0.8rem;
    font-family: monospace;
  }
  
  .item-metadata {
    margin-bottom: 1rem;
  }
  
  .metadata-item {
    display: flex;
    margin-bottom: 0.4rem;
  }
  
  .label {
    font-weight: 500;
    width: 50px;
    color: #666;
  }
  
  .value {
    flex: 1;
  }
  
  .item-description {
    color: #666;
    font-size: 0.9rem;
    line-height: 1.4;
  }
</style> 