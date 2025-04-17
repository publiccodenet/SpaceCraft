<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  // Check if we're pre-filling ID from query param
  let suggestedId = '';
  
  let collection = {
    id: '',
    name: '',
    description: '',
    query: '',
  };
  
  onMount(() => {
    // Check if ID was provided in query string
    const urlParams = new URLSearchParams(window.location.search);
    suggestedId = urlParams.get('id') || '';
    if (suggestedId) {
      collection.id = suggestedId;
    }
  });
  
  function handleSave() {
    // Just a placeholder - would normally save to API
    alert(`Create new collection: ${collection.name} (${collection.id})`);
    goto('/admin/collections');
  }
  
  function handleCancel() {
    goto('/admin/collections');
  }
  
  function generateSlug(text) {
    return text.toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }
  
  function updateId() {
    if (!collection.id || collection.id === suggestedId) {
      collection.id = generateSlug(collection.name);
    }
  }
</script>

<svelte:head>
  <title>Create Collection | BackSpace Admin</title>
</svelte:head>

<div class="create-collection-page">
  <div class="breadcrumbs">
    <a href="/admin">Admin</a> / 
    <a href="/admin/collections">Collections</a> / 
    <span>Create</span>
  </div>
  
  <header>
    <h1>Create New Collection</h1>
  </header>
  
  <form class="edit-form" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
    <div class="form-group">
      <label for="name">Collection Name</label>
      <input 
        type="text" 
        id="name" 
        bind:value={collection.name} 
        oninput={updateId}
        placeholder="Enter collection name" 
        required
      />
    </div>
    
    <div class="form-group">
      <label for="id">Collection ID</label>
      <input 
        type="text" 
        id="id" 
        bind:value={collection.id} 
        placeholder="collection-id"
        required
      />
      <span class="helper-text">Unique identifier used in URLs (auto-generated from name)</span>
    </div>
    
    <div class="form-group">
      <label for="description">Description</label>
      <textarea 
        id="description" 
        bind:value={collection.description} 
        placeholder="Describe this collection"
        rows="4"
      ></textarea>
    </div>
    
    <div class="form-group">
      <label for="query">Internet Archive Query</label>
      <input 
        type="text" 
        id="query" 
        bind:value={collection.query} 
        placeholder="collection:example AND subject:history"
      />
      <span class="helper-text">Query used to fetch items from Internet Archive</span>
    </div>
    
    <div class="form-actions">
      <button type="button" class="secondary-button" onclick={handleCancel}>Cancel</button>
      <button type="submit" class="primary-button">Create Collection</button>
    </div>
  </form>
</div>

<style>
  .create-collection-page {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
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
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 2rem;
    margin: 0;
  }
  
  .edit-form {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
  }
  
  input:focus, textarea:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }
  
  .helper-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.85rem;
    color: #666;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .primary-button {
    background: #4caf50;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .secondary-button {
    background: #f5f5f5;
    color: #333;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    border: 1px solid #ddd;
    cursor: pointer;
    font-size: 1rem;
  }
</style> 