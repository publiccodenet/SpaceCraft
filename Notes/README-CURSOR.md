# BackSpace Design Philosophy & Conventions

**Note: This document exists to remind AI assistants (like Claude) of the design philosophy and conventions for this project, not to instruct humans on how to set up Cursor. For Cursor setup, please refer to the [official Cursor documentation](https://cursor.sh/docs).**

### Core Architecture Principles

#### Modern Development Approach
- **Green Field Development**: No backward compatibility constraints
- **TypeScript Everywhere**: Strong typing throughout the codebase
- **Svelte 5 Forward**: Use signals/runes over older store patterns
- **ESM Modules**: Modern JavaScript module system
- **Zod for Schemas**: Single source of truth for data validation and TypeScript types

#### Cross-Platform Type Safety
- **Server-Client-Unity Type Safety**: Seamless type definitions across all platforms
- **Unity C# Integration**: Using JSON.net library for C# deserialization
- **JSON Schema Bridge**: Export Zod schemas to JSON Schema, then to C# classes
- **WebAssembly Communication**: JSON messages between web client and Unity app
- **Single Source of Truth**: Schema definitions flow from one source to all platforms

#### Data Management Philosophy
- **File System as Source of Truth**: Directory/file structure mirrors data model
- **Regenerate, Don't Migrate**: Content always regenerable from Internet Archive
- **JSON Configuration**: Human-readable, editable configuration files
- **Idempotent Operations**: Commands should be safely rerunnable

### Directory Structure Conventions

### ID and Naming Conventions

- **Type-Specific IDs**: Use `collectionId`, `itemId` instead of generic `id`, except in models that correspond to JSON Schema that just use `id`
- **Naming Convention for IDs**: 
  - In JSON models/properties: Use `id` (not `collectionId` or `itemId`)
  - In function signatures, variables: Use camelCase `collectionId`, `itemId` for clarity
  - In directory names: Use kebab-case `my-collection`
- **Directory = ID**: Directory names must match object IDs 
- **Use `id` in model properties to align with JSON structure**
- **Use consistent property names across formats (e.g., the same property name in JSON, JavaScript, and database)**
- **In API URLs, route parameters and JavaScript variables, use camelCase: `collectionId`, `itemId`**

### Schema-Driven Development

We use a schema-first approach with Zod as the single source of truth. Our schemas:

- Define all data structures in the system
- Generate TypeScript types automatically
- Export to JSON Schema for cross-platform use
- Drive C# class generation for Unity/JSON.NET
- Ensure consistent validation across platforms

For details on our schema system, see [README-SCHEMAS.md](./README-SCHEMAS.md).

### Related Documentation

- [Schema System](./README-SCHEMAS.md) - Details on schema definitions and cross-platform integration
- [Internet Archive Integration](./README-IA-INTEGRATION.md) - Interaction with Internet Archive APIs
- [BackSpace Application](./README-BACKSPACE.md) - SvelteKit application architecture
- [Unity Integration](./README-UNITY.md) - Unity client integration 