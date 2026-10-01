import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': src,
      // Run the real query layer against Node's built-in SQLite. See the shim's header.
      'expo-sqlite': `${src}/db/__tests__/support/expo-sqlite.ts`,
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    // Each file opens its own in-memory database, so files must not share a process.
    isolate: true,
    // Transforms are re-done on every run otherwise; these are the same files each time.
    fsModuleCache: true,
    server: {
      // drizzle-orm imports 'expo-sqlite' from inside node_modules; it has to be
      // transformed by Vite for the alias above to reach that import.
      deps: { inline: ['drizzle-orm'] },
    },
  },
});
