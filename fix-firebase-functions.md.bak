# Fix for Firebase Functions Deployment Error

## Problem Description

When attempting to deploy Firebase Functions with `firebase deploy --only functions`, the following error occurs:

```
TypeError: functions.firestore.document is not a function
```

This error is caused by inconsistent import patterns between different files in the project. Specifically:

- In `index.js`: Firebase Functions is imported using destructuring from the v1 package:

  ```javascript
  const { https, pubsub, firestore } = require('firebase-functions/v1');
  ```

- In `memoryFunctions.js`: Firebase Functions is imported as a complete object from the base package:
  ```javascript
  const functions = require('firebase-functions');
  ```

## Solution

You need to update `memoryFunctions.js` to use the same import pattern as `index.js`. Here's how to fix it:

### Step 1: Update the Import Statement

Open `/Users/as/asoos/aixtiv-cli/functions/memoryFunctions.js` and locate line 14, which contains:

```javascript
const functions = require('firebase-functions');
```

Replace it with:

```javascript
const { https, firestore, logger } = require('firebase-functions/v1');
```

### Step 2: Fix All References to `functions`

Throughout the file, replace all instances of:

#### For HTTP callable functions:

Change:

```javascript
exports.storeMemory = functions.https.onCall(storeMemory);
```

To:

```javascript
exports.storeMemory = https.onCall(storeMemory);
```

#### For Firestore triggers:

On line 373, change:

```javascript
exports.analyzeMemoryImportance = functions.firestore.document('chat_history/{memoryId}');
```

To:

```javascript
exports.analyzeMemoryImportance = firestore.document('chat_history/{memoryId}');
```

#### For HttpsError:

Change:

```javascript
throw new functions.https.HttpsError(
  'invalid-argument',
  'Memory data must include input and session_uuid'
);
```

To:

```javascript
throw new https.HttpsError('invalid-argument', 'Memory data must include input and session_uuid');
```

### Step 3: Complete List of Required Changes

Here are all the lines that need to be changed in `memoryFunctions.js`:

1. Line 14: Update import statement as shown above
2. Line 28: `exports.addMemory = functions.https.onCall` → `exports.addMemory = https.onCall`
3. Line 31: `throw new functions.https.HttpsError` → `throw new https.HttpsError`
4. Line 41: `throw new functions.https.HttpsError` → `throw new https.HttpsError`
5. Line 84: `throw new functions.https.HttpsError` → `throw new https.HttpsError`
6. Line 95: `exports.queryMemories = functions.https.onCall` → `exports.queryMemories = https.onCall`
7. Line 98: `throw new functions.https.HttpsError` → `throw new https.HttpsError`
8. Line 169: `throw new functions.https.HttpsError` → `throw new https.HttpsError`
9. Line 180: `exports.getMemoryStats = functions.https.onCall` → `exports.getMemoryStats = https.onCall`
10. Line 183: `throw new functions.https.HttpsError` → `throw new https.HttpsError`

And so on for all other instances of `functions.https.HttpsError` and `functions.https.onCall` in the file.

The most critical change is on line 373:

```javascript
exports.analyzeMemoryImportance = functions.firestore;
```

To:

```javascript
exports.analyzeMemoryImportance = firestore;
```

### Step 4: Review and Save

After making these changes, save the file and make sure there are no remaining references to the `functions` object (which no longer exists after changing the import).

## Verification

After making these changes:

1. Return to the project root directory:

   ```
   cd /Users/as/asoos/aixtiv-cli
   ```

2. Deploy the functions again:
   ```
   firebase deploy --only functions
   ```

If the deployment succeeds without the previous error, your fix worked!

## Why This Error Occurred

This error occurs due to a mismatch between Firebase Functions SDK import patterns. The newer practice is to use the versioned imports (`firebase-functions/v1`) with destructuring to only import what you need. The code was mixing the older style (entire `functions` object) with the newer style, causing incompatibilities.

## Additional Notes

If you encounter additional errors after fixing this one, they might also be related to import inconsistencies in other files. Apply the same pattern of:

1. Use versioned imports (`firebase-functions/v1`)
2. Use destructuring to import only what you need
3. Update all references to match the imports

This approach will ensure consistency across your codebase and prevent similar errors in the future.
