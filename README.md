# KeystoneJS 6 Document Renderer for Vue 3

This is a port of the keystonejs 6 DocumentRenderer, originally made in react and available on [https://github.com/keystonejs/keystone/tree/main/packages/document-renderer].

# Sample code

## Rendering a document

```vue
<template>
   <DocumentRenderer :document="document" />
</template>


<script setup>
   import { DocumentRenderer } from '@linkare/keystone6-document-renderer-vue3';

   // This is how you would retrieve a document
   // from your keystone6 instance
   import { getDocument } from './my-api';

   const document = ref();

   getDocument().then((document) => {
      document.value = document;
   })
</script>
```