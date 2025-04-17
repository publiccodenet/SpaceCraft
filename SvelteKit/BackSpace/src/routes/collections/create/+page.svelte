<script lang="ts">
  import { CollectionCreateSchema, type CollectionCreate } from '$lib/schemas';
  import { createForm } from 'felte';
  
  const { form, errors, data } = createForm<CollectionCreate>({
    validate: (values) => {
      const result = CollectionCreateSchema.safeParse(values);
      if (!result.success) {
        // Convert Zod errors to form errors
        return result.error.format();
      }
      return {};
    },
    onSubmit: async (values) => {
      // Submit to API
      const response = await fetch('/api/collections', {
        method: 'POST',
        body: JSON.stringify(values),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      return data;
    }
  });
</script>

<form use:form>
  <label>
    Collection ID
    <input name="collectionId" required />
    {#if $errors.collectionId}
      <span class="error">{$errors.collectionId}</span>
    {/if}
  </label>
  
  <label>
    Name
    <input name="name" required />
    {#if $errors.name}
      <span class="error">{$errors.name}</span>
    {/if}
  </label>
  
  <label>
    Query
    <input name="query" />
  </label>
  
  <button type="submit">Create Collection</button>
</form> 