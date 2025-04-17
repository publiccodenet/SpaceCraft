<script lang="ts">
  import CraftSpace from '$lib/components/CraftSpace.svelte';
</script>

<svelte:head>
  <title>CraftSpace</title>
  <meta name="description" content="BackSpace interactive content explorer for Internet Archive collections" />
</svelte:head>

<CraftSpace 
  appName="craftspace"
  fullPage={true}
  backgroundColor="var(--color-background)"
/>
