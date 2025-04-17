# Internet Archive SDK for JavaScript

A Node.js/TypeScript SDK for interacting with the Internet Archive's APIs.

## Overview

The `internetarchive-sdk-js` package provides a convenient interface to interact with Internet Archive's APIs for searching, retrieving, uploading, and managing digital content. This SDK simplifies the process of working with the Internet Archive programmatically.

## Installation

You can install the SDK using npm, yarn, or pnpm:

```bash
# Using npm
npm install internetarchive-sdk-js

# Using yarn
yarn add internetarchive-sdk-js

# Using pnpm
pnpm install internetarchive-sdk-js
```

## Authentication

Many operations require authentication using an Internet Archive S3-like API key. You can obtain your API credentials from [Internet Archive's developer page](https://archive.org/account/s3.php).

The API key should be formatted as `accesskey:secretkey`.

## Basic Usage

```javascript
import InternetArchive from 'internetarchive-sdk-js';

// For public access (search and retrieval only)
const ia = new InternetArchive();

// For authenticated access (required for uploads, updates, deletion)
const ia = new InternetArchive('YOUR_ACCESS_KEY:YOUR_SECRET_KEY', {
  // Optional settings
  testmode: false,   // Set to true to use the test collection (items auto-delete after 30 days)
  setScanner: true   // Add scanner metadata for tracking
});
```

## Core Concepts

Internet Archive organizes content into "items" which can contain multiple files. Each item has:

- A unique identifier
- Metadata (title, creator, date, etc.)
- One or more files
- A media type (texts, movies, audio, etc.)

This SDK provides methods to interact with these items and their metadata.

## API Reference

### Searching Items

#### `getItems(params)`

Search for items in the Internet Archive based on filters like collection, creator, or subject.

**Parameters:**
- `params`: Object containing:
  - `filters`: Object with properties like `collection`, `creator`, `subject`
  - `options`: Object with properties like `rows` (number of results) and `fields` (specific fields to return)

**Returns:** Promise resolving to a response object with search results

**Example:**
```javascript
import InternetArchive from 'internetarchive-sdk-js';
const ia = new InternetArchive();

// Search for basketball items in the Library of Congress collection
const searchItems = async () => {
  const filters = {
    collection: 'library_of_congress',
    subject: 'basketball'
  };
  const options = {
    rows: 10,
    fields: 'identifier,title,mediatype'
  };
  
  try {
    const result = await ia.getItems({ filters, options });
    console.log(result.response.docs);
  } catch (error) {
    console.error('Search failed:', error);
  }
};

searchItems();
```

### Getting a Specific Item

#### `getItem(identifier)`

Retrieve metadata and file information for a specific item.

**Parameters:**
- `identifier`: The unique identifier of the item

**Returns:** Promise resolving to detailed item metadata and file information

**Example:**
```javascript
import InternetArchive from 'internetarchive-sdk-js';
const ia = new InternetArchive();

const getItemDetails = async (itemId) => {
  try {
    const item = await ia.getItem(itemId);
    console.log('Item metadata:', item.metadata);
    console.log('Files:', item.files);
  } catch (error) {
    console.error('Failed to get item:', error);
  }
};

getItemDetails('example_item_identifier');
```

### Creating a New Item

#### `createItem(item)`

Create a new item in the Internet Archive (requires authentication).

**Parameters:**
- `item`: Object containing:
  - `identifier`: Unique identifier for the new item
  - `collection`: Collection the item belongs to
  - `mediatype`: Type of media (e.g., 'texts', 'movies', 'audio')
  - `upload`: FileUpload object with file to be added to the item
  - `metadata`: Optional additional metadata for the item

**Returns:** Promise resolving to response with item identifier and upload info

**Example:**
```javascript
import InternetArchive from 'internetarchive-sdk-js';
import fs from 'fs';

// Authentication required
const ia = new InternetArchive('YOUR_ACCESS_KEY:YOUR_SECRET_KEY');

const createNewItem = async () => {
  const fileData = fs.readFileSync('./example.pdf');
  
  try {
    const response = await ia.createItem({
      identifier: 'unique_item_id_2023',
      collection: 'open_library',
      mediatype: 'texts',
      upload: {
        filename: 'example.pdf',
        data: fileData
      },
      metadata: {
        title: 'Example Document',
        creator: 'John Doe',
        date: '2023-01-01'
      }
    });
    
    console.log('Item created:', response);
  } catch (error) {
    console.error('Failed to create item:', error);
  }
};

createNewItem();
```

### Updating an Item

#### `updateItem(identifier, metadata)`

Update an existing item's metadata (requires authentication).

**Parameters:**
- `identifier`: Unique identifier for the item
- `metadata`: Object containing metadata fields to update

**Returns:** Promise resolving to update response with success status

**Example:**
```javascript
import InternetArchive from 'internetarchive-sdk-js';

// Authentication required
const ia = new InternetArchive('YOUR_ACCESS_KEY:YOUR_SECRET_KEY');

const updateItemMetadata = async () => {
  const itemId = 'unique_item_id_2023';
  
  try {
    const response = await ia.updateItem(itemId, {
      title: 'Updated Example Document',
      description: 'This document has been updated with new metadata',
      subject: ['example', 'documentation']
    });
    
    console.log('Update successful:', response.success);
    if (response.task_id) {
      console.log('Task ID:', response.task_id);
    }
  } catch (error) {
    console.error('Failed to update item:', error);
  }
};

updateItemMetadata();
```

### Uploading a File to an Existing Item

#### `uploadFile(upload)`

Upload a file to an existing item (requires authentication).

**Parameters:**
- `upload`: Object containing:
  - `identifier`: Identifier of the parent item
  - `file`: FileUpload object with filename and file data or path
  - `mediatype`: Type of media being uploaded

**Returns:** Promise that resolves when upload is complete

**Example:**
```javascript
import InternetArchive from 'internetarchive-sdk-js';
import fs from 'fs';

// Authentication required
const ia = new InternetArchive('YOUR_ACCESS_KEY:YOUR_SECRET_KEY');

const uploadFileToItem = async () => {
  const fileData = fs.readFileSync('./additional_document.pdf');
  
  try {
    await ia.uploadFile({
      identifier: 'unique_item_id_2023',
      file: {
        filename: 'additional_document.pdf',
        data: fileData
      },
      mediatype: 'texts'
    });
    
    console.log('File uploaded successfully');
  } catch (error) {
    console.error('Failed to upload file:', error);
  }
};

uploadFileToItem();
```

### Deleting a File

#### `deleteFile(path)`

Delete a file from an item (requires authentication).

**Parameters:**
- `path`: Path in the format `identifier/filename`

**Returns:** Promise that resolves when deletion is complete

**Example:**
```javascript
import InternetArchive from 'internetarchive-sdk-js';

// Authentication required
const ia = new InternetArchive('YOUR_ACCESS_KEY:YOUR_SECRET_KEY');

const deleteFileFromItem = async () => {
  try {
    await ia.deleteFile('unique_item_id_2023/additional_document.pdf');
    console.log('File deleted successfully');
  } catch (error) {
    console.error('Failed to delete file:', error);
  }
};

deleteFileFromItem();
```

### Retrieving Item Tasks

#### `getItemTasks(identifier, criteria)`

Get information about tasks associated with an item (requires authentication).

**Parameters:**
- `identifier`: The unique identifier of the item
- `criteria`: Optional object with task filtering criteria:
  - `task_id`: Filter by task ID
  - `server`: Filter by server
  - `args`: Filter by arguments
  - `submitter`: Filter by submitter
  - `priority`: Filter by priority
  - `wait_admin`: Filter by wait admin status
  - `cmd`: Filter by command

**Returns:** Promise resolving to task information

**Example:**
```javascript
import InternetArchive from 'internetarchive-sdk-js';

// Authentication required
const ia = new InternetArchive('YOUR_ACCESS_KEY:YOUR_SECRET_KEY');

const getItemTaskInfo = async () => {
  try {
    const tasks = await ia.getItemTasks('unique_item_id_2023');
    console.log('Tasks:', tasks);
    
    // With filtering criteria
    const specificTasks = await ia.getItemTasks('unique_item_id_2023', {
      submitter: 'example_user',
      priority: 10
    });
    console.log('Filtered tasks:', specificTasks);
  } catch (error) {
    console.error('Failed to get tasks:', error);
  }
};

getItemTaskInfo();
```

## Error Handling

The SDK throws errors for various failure cases like authentication problems, network issues, or API errors. Always wrap API calls in try/catch blocks to handle these potential errors.

```javascript
try {
  const result = await ia.getItem('non_existent_item');
} catch (error) {
  if (error.response) {
    console.error('API Error:', error.response.status, error.response.data);
  } else if (error.request) {
    console.error('Network Error:', error.message);
  } else {
    console.error('Error:', error.message);
  }
}
```

## Media Types

Internet Archive supports the following media types:

- `texts`: Books, articles, etc.
- `movies`: Movies, videos
- `audio`: Sound recordings  
- `software`: Software applications
- `image`: Images and photos
- `data`: Data sets
- `web`: Web archives
- `collection`: Collection of items
- `etree`: Live music archives

## Resources

- [Internet Archive APIs Documentation](https://archive.org/services/docs/api/)
- [Get your Internet Archive credentials](https://archive.org/account/s3.php)
- [Internet Archive Test Collection](https://archive.org/details/test_collection)
