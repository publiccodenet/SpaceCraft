<script>
  // No need to import anything here as this is already handled in the layout
</script>

<div class="dashboard">
  <h1>Welcome to BackSpace Admin</h1>
  <p class="subtitle">Secret administration tools for content management</p>
  
  <div class="dashboard-grid">
    <div class="dashboard-card">
      <h3>Welcome</h3>
      <p>Welcome to the BackSpace administration interface.</p>
      <p>This interface provides tools for managing content, collections, and system settings.</p>
    </div>
    
    <div class="dashboard-card">
      <h3>System Status</h3>
      <div class="status-item">
        <span class="status-label">Environment:</span>
        <span class="status-value">{import.meta.env.MODE}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Server Time:</span>
        <span class="status-value">{new Date().toLocaleString()}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard {
    width: 100%;
  }
  
  h1 {
    font-size: 2rem;
    margin: 0;
    margin-bottom: 0.5rem;
  }
  
  .subtitle {
    color: #666;
    font-size: 1rem;
    margin-bottom: 2rem;
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  
  .dashboard-card {
    background: #f9f9f9;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .dashboard-card h3 {
    margin-top: 0;
    font-size: 1.2rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
  }
  
  .status-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  
  .status-label {
    font-weight: 500;
    color: #555;
  }
  
  .status-value {
    font-family: monospace;
  }
</style> 