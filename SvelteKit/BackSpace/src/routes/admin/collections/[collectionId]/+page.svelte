<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  export let data;
  $: collectionId = data.collection?.id || '';
  
  let collection = null;
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
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  function handleCreate() {
    goto(`/admin/collections/create?id=${collectionId}`);
  }
  
  function handleCancel() {
    goto('/admin/collections');
  }
  
  function handleRetry() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>{notFound ? 'Collection Not Found' : (collection ? collection.name : 'Loading Collection')} | BackSpace Admin</title>
</svelte:head>

<div class="collection-page">
  {#if loading}
    <div class="loading">
      <p>Loading collection...</p>
    </div>
  {:else if notFound}
    <div class="not-found">
      <h1>Collection Not Found</h1>
      <p>The collection with ID "{collectionId}" does not exist.</p>
      <div class="action-buttons">
        <button class="primary-button" onclick={handleCreate}>Create</button>
        <button class="secondary-button" onclick={handleCancel}>Cancel</button>
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
      <span>{collection.name}</span>
    </div>
    
    <header>
      <div class="header-content">
        <div>
          <h1>{collection.name}</h1>
          <p class="description">{collection.description || 'No description provided.'}</p>
        </div>
        <div class="header-actions">
          <a href={`/admin/collections/${collectionId}/edit`} class="secondary-button">Edit</a>
          <a href={`/admin/collections/${collectionId}/items`} class="primary-button">View Items</a>
        </div>
      </div>
    </header>
    
    <div class="details-grid">
      <div class="detail-card">
        <h3>Collection Details</h3>
        <div class="detail-item">
          <span class="label">ID:</span>
          <span class="value"><code>{collection.id}</code></span>
        </div>
        <div class="detail-item">
          <span class="label">Items:</span>
          <span class="value">{collection.totalItems || 0}</span>
        </div>
        <div class="detail-item">
          <span class="label">Last Updated:</span>
          <span class="value">{new Date(collection.lastUpdated).toLocaleString()}</span>
        </div>
      </div>
      
      <div class="detail-card">
        <h3>Query Settings</h3>
        <div class="detail-item">
          <span class="label">Query:</span>
          <span class="value query">{collection.query}</span>
        </div>
        <div class="detail-item">
          <span class="label">Sort:</span>
          <span class="value">{collection.sort || 'Default'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Limit:</span>
          <span class="value">{collection.limit || 100}</span>
        </div>
      </div>
    </div>
    
    <h2>Items</h2>
    <p>This collection contains {collection.totalItems || 0} items.</p>
    
    <div class="actions">
      <a href={`/admin/collections/${collectionId}/items`} class="primary-button">Browse Items</a>
      <a href={`/admin/collections/${collectionId}/fetch`} class="secondary-button">Fetch New Items</a>
    </div>
  {/if}
</div>

<style>
  .collection-page {
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
    margin: 2rem 0 1rem 0;
  }
  
  .description {
    color: #666;
    margin: 0;
  }
  
  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .detail-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .detail-card h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
  }
  
  .detail-item {
    display: flex;
    margin-bottom: 0.75rem;
  }
  
  .label {
    font-weight: 500;
    width: 120px;
    color: #666;
  }
  
  .value {
    flex: 1;
  }
  
  .value.query {
    font-family: monospace;
    word-break: break-word;
  }
  
  .actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
  }
</style> 