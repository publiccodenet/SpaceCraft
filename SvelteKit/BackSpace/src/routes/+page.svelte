<script lang="ts">
  import SpaceCraft from '$lib/components/SpaceCraft.svelte';
</script>

<svelte:head>
  <title>SpaceCraft</title>
  <meta name="description" content="BackSpace interactive content explorer for Internet Archive collections" />
</svelte:head>

<SpaceCraft 
  appName="spacecraft"
  fullPage={true}
  backgroundColor="var(--color-background)"
/>
