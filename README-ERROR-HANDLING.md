# Error Handling Strategy

BackSpace uses a consistent exception-based error handling strategy throughout the codebase.

## Core Principles

1. **Throw Exceptions for Errors**: Methods should throw exceptions rather than returning error codes or null values
2. **Use Custom Error Classes**: Specific error types make handling and reporting more precise
3. **Catch at Boundaries**: Catch exceptions at system boundaries (CLI, API, UI) rather than deep in the code
4. **Preserve Context**: Include enough information to understand and possibly correct the error

## Error Types

BackSpace defines several error types in `src/lib/errors.ts`:

- `NotFoundError`: When a requested resource doesn't exist
- `ValidationError`: When input data fails validation
- `DuplicateResourceError`: When attempting to create a resource that already exists
- `FileSystemError`: When file operations fail
- `ConnectorError`: When a connector operation fails
- `ProcessorError`: When a processor operation fails

## Exception Handling Example

```typescript
try {
  // Attempt operation
  const collection = await contentManager.getCollection(id);
  
  // Work with the collection...
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle specifically for not found case
    console.error(`Collection ${id} not found`);
  } else if (error instanceof FileSystemError) {
    // Handle file system errors
    console.error(`File system error: ${error.message}`);
    if (error.path) {
      console.error(`Path: ${error.path}`);
    }
  } else {
    // Handle other errors
    console.error(`Unexpected error: ${error.message}`);
  }
}
```

## When to Create Custom Error Types

Create a new error type when:

1. The error represents a distinct failure category
2. You need to attach specialized metadata to the error
3. You want to handle this type of error differently from others

## Error Logging

Errors should be logged with:

1. The error message
2. Error type 
3. Contextual information about what was being attempted
4. Stack trace in development environments

## API Error Responses

API endpoints should translate errors into appropriate HTTP status codes:

- NotFoundError → 404 Not Found
- ValidationError → 400 Bad Request  
- DuplicateResourceError → 409 Conflict
- Most other errors → 500 Internal Server Error 