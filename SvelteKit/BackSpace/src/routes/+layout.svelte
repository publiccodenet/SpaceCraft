<script lang="ts">
  import "../app.css";
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  // Theme and state management
  let theme = $state(getInitialTheme());
  let isMenuOpen = $state(false);
  let isLoading = $state(true);
  
  function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = localStorage?.getItem('theme');
    return savedTheme || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage?.setItem('theme', theme);
  }
  
  // Mobile handlers
  onMount(() => {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    setTimeout(() => { isLoading = false; }, 500);
  });
  
  // Handle keyboard navigation
  function handleKeyDown(e) {
    if (e.key === 'Escape' && isMenuOpen) isMenuOpen = false;
  }
  
  // Determine if we should show UI elements - using $derived instead of $:
  let isFullscreenPage = $derived($page.url.pathname === '/');
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isLoading}
  <div class="splash-screen">Loading...</div>
{:else}
  <div class="app-container">
    {#if !isFullscreenPage}
      <header class="app-header">
        <div class="header-content">
          <a href="/" class="logo">BackSpace</a>
          <button onclick={() => toggleTheme()}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
    {/if}

    <!-- Main content area with no slot syntax at all -->
    <main id="main-content" class:full-unity={isFullscreenPage}>
      <slot />
    </main>
    
    <!-- Footer - hidden on fullscreen pages -->
    {#if !isFullscreenPage}
      <footer class="app-footer">
        <div class="footer-content">© 2023 BackSpace</div>
      </footer>
    {/if}
  </div>
{/if}

<style>
  /* Simple styles for basic layout */
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .app-header {
    background-color: #f5f5f5;
    padding: 1rem;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .logo {
    font-weight: bold;
    color: #ff3e00;
    text-decoration: none;
  }
  
  main {
    flex: 1;
    padding: 1rem;
  }
  
  main.full-unity {
    padding: 0;
    height: 100vh;
  }
  
  .app-footer {
    background-color: #f5f5f5;
    padding: 1rem;
    text-align: center;
  }
  
  .splash-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: white;
  }
</style>
