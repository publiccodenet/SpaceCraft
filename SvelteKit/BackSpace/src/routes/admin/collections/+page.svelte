<script>
  import { onMount } from 'svelte';
  
  let collections = [];
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      const response = await fetch('/api/collections');
      if (!response.ok) {
        throw new Error(`Error fetching collections: ${response.statusText}`);
      }
      
      const data = await response.json();
      collections = data.collections || [];
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  // Format date in a readable way
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
</script>

<svelte:head>
  <title>Collections Management | BackSpace Admin</title>
</svelte:head>

<div class="collections-container">
  <div class="breadcrumbs">
    <a href="/admin">Admin</a> / 
    <span>Collections</span>
  </div>
  
  <header>
    <h1>Collections Management</h1>
    <div class="actions">
      <a href="/admin/collections/create" class="primary-button">Create New Collection</a>
    </div>
  </header>
  
  {#if loading}
    <div class="loading">
      <p>Loading collections...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <p class="error-message">Error: {error}</p>
      <button onclick={handleRetry}>Try Again</button>
    </div>
  {:else if collections.length === 0}
    <div class="empty-state">
      <p>No collections found</p>
    </div>
  {:else}
    <div class="collections-table-wrapper">
      <table class="collections-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Items</th>
            <th>Last Updated</th>
            <th>Query</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each collections as collection}
            <tr>
              <td class="col-name">{collection.name}</td>
              <td class="col-id"><code>{collection.id}</code></td>
              <td>{collection.totalItems || 0}</td>
              <td>{formatDate(collection.lastUpdated)}</td>
              <td class="col-query">
                <div class="query-truncate" title={collection.query}>
                  {collection.query}
                </div>
              </td>
              <td class="col-actions">
                <div class="action-buttons">
                  <a href={`/admin/collections/${collection.id}`} class="action-button view">View</a>
                  <a href={`/admin/collections/${collection.id}/edit`} class="action-button edit">Edit</a>
                  <a href={`/admin/collections/${collection.id}/fetch`} class="action-button fetch">Fetch</a>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .collections-container {
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
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 2.5rem;
    margin: 0;
  }
  
  .actions {
    display: flex;
    gap: 1rem;
  }
  
  .primary-button {
    background: #4caf50;
    color: white;
    padding: 0.7rem 1.5rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 500;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    text-decoration: none;
  }
  
  .loading, .error-container, .empty-state {
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
  
  .collections-table-wrapper {
    overflow-x: auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .collections-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }
  
  .collections-table th,
  .collections-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  .collections-table th {
    background: #f5f5f5;
    font-weight: 600;
  }
  
  .collections-table tr:last-child td {
    border-bottom: none;
  }
  
  .col-name {
    font-weight: 500;
  }
  
  .col-id code {
    font-family: monospace;
    background: #f0f0f0;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .col-query {
    max-width: 20rem;
  }
  
  .query-truncate {
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 20rem;
    font-size: 0.85rem;
    color: #0066cc;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.5rem;
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
  
  .action-button.view {
    background: #2196f3;
    color: white;
  }
  
  .action-button.edit {
    background: #ff9800;
    color: white;
  }
  
  .action-button.fetch {
    background: #673ab7;
    color: white;
  }
</style> 