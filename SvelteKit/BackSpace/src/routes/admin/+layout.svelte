<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // Get current path to determine active tab
  $: path = $page.url.pathname;
  
  // Determine which tab is active
  $: activeTab = 
    path === '/' ? 'craftspace' :
    path === '/admin' ? 'dashboard' :
    path.startsWith('/admin/collections') ? 'collections' :
    'dashboard';
  
  // Handle tab click
  function handleTabClick(tabId) {
    switch(tabId) {
      case 'craftspace':
        goto('/');
        break;
      case 'dashboard':
        goto('/admin');
        break;
      case 'collections':
        goto('/admin/collections');
        break;
    }
  }
</script>

<div class="admin-layout">
  <div class="admin-header">
    <div class="brand">
      <a href="/admin">BackSpace Admin</a>
    </div>
    
    <nav class="tab-navigation">
      <button 
        class:active={activeTab === 'craftspace'} 
        onclick={() => handleTabClick('craftspace')}
      >
        CraftSpace
      </button>
      <button 
        class:active={activeTab === 'dashboard'} 
        onclick={() => handleTabClick('dashboard')}
      >
        Dashboard
      </button>
      <button 
        class:active={activeTab === 'collections'} 
        onclick={() => handleTabClick('collections')}
      >
        Collections
      </button>
    </nav>
  </div>
  
  <main class="admin-content">
    <slot />
  </main>
</div>

<style>
  .admin-layout {
    background-color: #f8f9fa;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .admin-header {
    background-color: #343a40;
    color: white;
    padding: 0.5rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .brand a {
    color: white;
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .tab-navigation {
    display: flex;
    gap: 0.25rem;
  }
  
  .tab-navigation button {
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .tab-navigation button:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
  
  .tab-navigation button.active {
    color: white;
    background: rgba(255, 255, 255, 0.2);
  }
  
  .admin-content {
    flex: 1;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }
</style> 