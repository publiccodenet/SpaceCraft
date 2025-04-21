# Bridge Reactive Data Binding System

This document outlines research and development plans for an enhanced reactive data binding system between JavaScript and Unity in the Bridge architecture.

## Overview

The future of Bridge includes a sophisticated, high-performance reactive data binding system that efficiently synchronizes state between JavaScript and Unity. This system draws inspiration from modern reactive frameworks and Unity's networking concepts but reimagines them for the unique JavaScript-Unity Bridge context.

## Current Limitations

While the existing Bridge system provides basic property updates and interests, several limitations exist:

1. Updates are not automatically batched, leading to message overhead
2. No built-in dependency tracking between bound properties
3. Full objects are often serialized instead of deltas
4. Limited support for complex object hierarchies
5. No optimizations for high-frequency updates

## Comparison with Unity Networking Systems

### Unity's Old Networking (UNET/NetworkView)

The Unity Network (UNET) system provided concepts that remain valuable:

**Worth Adopting:**
- **SyncVar Pattern**: Automatic property synchronization with change callbacks
- **NetworkIdentity**: Unique identification and lifetime management
- **State Synchronization**: Periodic updates for continuously changing values
- **Command/RPC Patterns**: Clear delineation between sender and receiver

**Avoid:**
- **Heavy Code Generation**: Excessive boilerplate and generated code
- **Tightly Coupled Components**: Inflexible components requiring inheritance
- **Reflection-Heavy Runtime**: Poor performance or prohibited in IL2CPP builds
- **Limited Data Types**: Restricted set of supported primitive types
- **Lack of Bandwidth Controls**: No priority system or interest management

### Unity's New Networking (Netcode for GameObjects)

The newer Netcode for GameObjects offers improved approaches:

**Worth Adopting:**
- **NetworkVariable<T>**: Type-safe containers with change detection
- **Customizable Serialization**: Serializers for complex types
- **Ownership Model**: Clear authority over object modifications
- **Interest Management**: Network relevancy system

**Avoid:**
- **Complex Setup**: Overengineered object bootstrapping
- **Static Network Manager**: Singleton-based architecture
- **Lack of Fine-Grained Updates**: Still primarily focused on whole-object syncing

### IL2CPP Reflection Considerations

IL2CPP builds face significant limitations with reflection-based systems:

1. **Runtime Type Discovery Limitations**:
   - IL2CPP strips unused methods/types that aren't explicitly preserved
   - Generic method instantiation is restricted at runtime
   - Type metadata is reduced to improve binary size

2. **Performance Impact**:
   - Reflection operations are significantly slower in IL2CPP
   - AOT compilation cannot optimize reflection-heavy code paths

3. **Solutions for Bridge Binding**:
   - **Code Generation**: Pre-generate accessor methods at build time
   - **Type Registration**: Explicit registration system for bindable types
   - **Attribute Processing**: Process [BindableProperty] attributes during build
   - **JIT-Free Design**: Avoid dynamic code generation entirely

### C# Object to JSON Representation

The reactive binding system must address several challenges in object serialization:

1. **Circular References**: Detect and handle circular references
2. **Unity-Specific Types**: Custom serialization for Vector3, Quaternion, etc.
3. **IL2CPP Compatibility**: Avoid techniques that don't work on mobile platforms
4. **Serialization Performance**: Optimize for frequent small updates
5. **Schema Evolution**: Handle changes to object structure gracefully

## Bridge-Specific Architecture

The Bridge system can adopt the best from both networking systems while avoiding their pitfalls:

### Attribute-Based Property Binding

Using attributes to mark bindable properties with appropriate metadata for update frequency, serialization approach, and priorities.

### Field-Level Delta Updates

Unlike Unity networking's focus on whole-component updates, Bridge can implement field-level delta updates with IL2CPP-friendly field tracking.

### Command Pattern Without Reflection

Defining and registering commands at build time to avoid runtime reflection issues.

## Implementation Recommendations

1. **Build Time Processing**: Generate binding code during build to avoid IL2CPP issues
2. **Explicit Registration**: Require explicit registration of bindable types
3. **Field-Level Tracking**: Track changes at the individual field level
4. **Type-Safe Commands**: Pre-generate command handlers for type safety
5. **Binary Transport Option**: Provide both JSON and binary serialization
6. **Interest Management**: Implement relevancy system from Netcode but with finer granularity
7. **Batching System**: Frame-based collection of changes with priority sorting
8. **Dependency Tracking**: Property relationships for efficient updates

The new binding system should combine the clear conceptual model of Unity's networking systems with the efficiency and flexibility needed for JavaScript-Unity communication.

## Proposed Enhancements

### Smart Change Detection and Batching

- **Delta-based Updates**: Only transmit what has changed between updates
- **Update Frequency Control**:
  - Throttling/debouncing for high-frequency changes
  - Frame-based batching (collect all changes in 16ms windows)
  - Priority-based update scheduling
- **Hierarchical Change Propagation**:
  - Track dependencies between bound properties
  - Avoid redundant child updates when parent objects change

### Optimized Message Transport

- **Binary Protocol Option**: Offer alternative serialization formats for performance-critical applications
- **Shared Memory Structures**: Utilize shared ArrayBuffers in WebGL builds for zero-copy updates
- **Path Compression**: Use path aliases or IDs to reduce message size
- **Custom Type Handlers**: Specialized handlers for common Unity types (Vector3, Quaternion, etc.)

### Advanced Subscription Model

- **Selective Binding**:
  - Fine-grained property binding with path expressions
  - Wildcard and pattern-based subscriptions
- **Automatic Binding Lifecycle**:
  - Visibility-based binding activation/deactivation
  - Bind/unbind based on game state and object lifecycle
- **Interest Groups**:
  - Categorize bindings into logical units
  - Enable/disable entire subscription sets

### Network-Inspired Architecture

Adopting concepts from networking while eliminating overhead:

- **SyncVars Reimagined**:
  - Declarative property binding without manual dirty flags
  - Automatic serialization and type conversion
  - Change-detection based updates
- **Command Pattern**:
  - JavaScript → Unity method calls with automatic parameter mapping
  - Command batching and prioritization
  - Type-safe interface without codegen
- **Client RPC Equivalent**:
  - Unity → JavaScript callbacks
  - Promise/async support
  - Event completion tracking
- **State Synchronization**:
  - Partial object updates
  - Interest management
  - Bandwidth-aware synchronization

### Performance Optimizations

- **Worker Thread Processing**: Offload serialization/deserialization
- **Structural Sharing**: Minimize memory allocation with immutable data structures
- **Value Caching**: Cache computed values
- **Update Coalescing**: Combine multiple property changes on the same object
- **Adaptive Timing**: Adjust update frequencies based on performance metrics

## Implementation Approach

### Phase 1: Enhanced Binding System

1. Implement a reactive property wrapper system in Unity
2. Create JavaScript proxy-based binding framework
3. Develop efficient serialization and change detection

### Phase 2: Batching and Transport

1. Implement frame-based update batching
2. Develop delta encoding for common Unity types
3. Create shared memory transport for WebGL builds
4. Add worker thread support for serialization

### Phase 3: Advanced Features

1. Implement dependency tracking between bound properties
2. Add subscription groups and lifecycle management
3. Develop debugging and visualization tools
4. Create performance monitoring and adaptive optimizations

## Real-Time Collaboration Features

Beyond internal data binding, the Bridge system can integrate with external real-time databases and APIs to create collaborative multi-user experiences:

### Push and Pull Synchronization Models

The binding system should support both push and pull data synchronization models:

- **Push Constraints**:
  - Server-driven updates pushed to clients
  - Authority-based conflict resolution
  - Throttling and rate limiting for busy channels
  - Differential sync for large datasets

- **Pull Constraints**:
  - Client-initiated data requests
  - Polling with exponential backoff
  - Query-based subscriptions
  - Cache invalidation strategies

### Event Distribution Systems

- **PubSub (Publish-Subscribe)**:
  - Topic-based message distribution
  - Message filtering and transformation
  - Delivery guarantees (at-least-once, exactly-once)
  - Store-and-forward for offline clients

- **Broadcast Channels**:
  - One-to-many communication
  - Channel-based filtering
  - Selective broadcasting based on relevance
  - Priority-based message ordering

### Collaborative Features

- **Room-Based Collaboration**:
  - Virtual rooms for context-specific data sharing
  - Room joining/leaving lifecycle events
  - Room-specific state synchronization
  - Hierarchical room structures

- **Presence System**:
  - Real-time user status tracking
  - Activity indicators
  - Typing indicators
  - Away/offline status propagation
  - Last-active timestamps

### Implementation Considerations

When integrating with external real-time systems:

1. **Connection Management**:
   - Automatic reconnection with exponential backoff
   - Connection state monitoring and UI feedback
   - Graceful degradation during connectivity issues

2. **Conflict Resolution**:
   - Timestamp-based Last-Write-Wins (LWW)
   - Operational Transform for concurrent edits
   - Custom merge functions for complex data types
   - Transaction-based atomic updates

3. **Security**:
   - Row-Level Security (RLS) with Supabase
   - Permission checking before state propagation
   - Sanitization of incoming data
   - Rate limiting and abuse protection

4. **Scalability**:
   - Channel multiplexing
   - Message batching and compression
   - Selective presence updates
   - Connection sharing across binding instances

This integration enables powerful collaborative applications where Unity experiences can leverage cloud databases while maintaining high performance local interactivity through the Bridge system.

## Schema-Driven Object System

For projects with complex, polymorphic data like the Internet Archive integration, a schema-driven approach provides maximum flexibility:

### Flexible JSON Pass-Through

The binding system should support flexible JSON objects with:

- **Extra Property Retention**: Preserve unknown properties through serialization cycles
- **Polymorphic Field Support**: Handle fields that can be null, undefined, string, array, etc.
- **Dynamic Property Access**: Access methods for properties not known at compile time
- **Schema Validation**: Runtime validation without performance penalties

### Schema Pipeline Architecture

A comprehensive schema pipeline enables shared types between JavaScript and C#, with Zod as the single source of truth:

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Zod Schema   │────▶│  JSON Schema  │────▶│   TypeScript  │
│  Definition   │     │               │     │     Types     │
└───────────────┘     └───────┬───────┘     └───────────────┘
                              │
                              ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│Unity-Specific │◀────│    C# Code    │◀────│  Schema Code  │
│   Subclasses  │     │   Generator   │     │   Generator   │
└───────────────┘     └───────────────┘     └───────────────┘
```

#### Zod as the Single Source of Truth

[Zod](https://github.com/colinhacks/zod) serves as the foundation of the schema pipeline because it provides:

1. **Runtime Validation**: JavaScript validation with detailed error messages
2. **TypeScript Integration**: Automatic TypeScript type inference
3. **Composable API**: Building complex schemas through composition
4. **Transformations**: Data transformations and normalization

#### Benefits of This Approach

1. **Single Source of Truth**: Define schema once, use everywhere
2. **Type Safety**: End-to-end type checking from SvelteKit to Unity
3. **Validation**: Consistent validation rules across platforms
4. **Tooling**: Rich ecosystem of tools for JSON Schema
5. **Documentation**: Self-documenting API with schema definitions

## Conclusion

The enhanced reactive data binding system will significantly improve the Bridge architecture's performance, usability, and flexibility. By drawing inspiration from both modern web frameworks and Unity's networking concepts, we can create a seamless, high-performance integration between JavaScript and Unity that minimizes overhead while maximizing developer productivity.

This system will be particularly valuable for complex applications with frequent state changes, large data structures, and performance-critical requirements. 