import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    root: './',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        // Bootstrap wiring (Helmet/CORS/Swagger/versioning setup) is
        // exercised by test/e2e/app.e2e.spec.ts, which calls configureApp()
        // directly - not by the unit project this threshold applies to.
        'src/bootstrap.ts',
        'src/**/*.module.ts',
        'src/infrastructure/supabase/database.types.ts',
        'src/**/*.dto.ts',
        // Type-only files: no runtime code, so there is nothing a unit
        // test could exercise (V8 line-coverage on these is an
        // instrumentation artifact of source maps, not real code).
        'src/**/types/**',
        'src/**/*.type.ts',
        'src/**/*.interface.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.spec.ts'],
          setupFiles: ['test/setup/test-env.setup.ts'],
          hookTimeout: 30_000,
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.spec.ts'],
          setupFiles: ['test/setup/test-env.setup.ts'],
          hookTimeout: 30_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
