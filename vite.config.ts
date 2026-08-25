import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      // camelCase in JS, kebab-case in the stylesheet
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[name]__[local]__[hash:base64:4]',
    },
    preprocessorOptions: {
      // Cast: vitest/config resolves its own nested (newer) vite types for
      // SassPreprocessorOptions, which don't yet know about 'api' even
      // though the project's actual vite version supports it.
      scss: { api: 'modern-compiler' } as Record<string, unknown>,
    },
  },
  server: { port: 5173, open: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
      // A regression floor, not an aspirational target — set at/below what
      // the suite already covers so it fails on drops, not on gaps that
      // already exist (Browse.tsx and FilterPanel.tsx are the lowest today).
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 90,
      },
    },
  },
});
