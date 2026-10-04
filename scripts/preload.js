const { AsyncLocalStorage } = require('node:async_hooks');
globalThis.AsyncLocalStorage = AsyncLocalStorage;

try {
  const { staticGenerationAsyncStorage } = require('next/dist/client/components/static-generation-async-storage.external');
  staticGenerationAsyncStorage.enterWith({
    incrementalCache: {
      revalidateTag: () => {},
    },
    revalidatedTags: [],
  });
} catch (e) {
  console.warn('preload staticGenerationAsyncStorage warning:', e);
}
