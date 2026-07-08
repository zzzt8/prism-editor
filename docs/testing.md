# Testing Guide

## Overview

This project uses **Vitest** as the testing framework, with **Turborepo** for monorepo management and **pnpm** for package management.

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Tests for Specific Package

```bash
cd packages/image-ops
pnpm test

# Or with watch mode
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm test:coverage
```

### Run E2E Tests (Playwright)

> Note: E2E tests require the dev-tool app to be running.

```bash
pnpm test:e2e
```

## Test Structure

### Unit Tests

Located alongside source files with `.test.ts` or `.test.tsx` extension:

```
packages/image-ops/src/core/mask/mask.test.ts
packages/image-ops/src/core/transform/transform.test.ts
packages/workflow-core/src/topo-sort.test.ts
```

### Integration Tests

Located in `*.integration.test.ts` or `*.e2e.test.ts` files:

```
packages/workflow-core/src/published-executor.e2e.test.ts
```

### Test Configuration

Each package has its own `vitest.config.ts`:

```typescript
// packages/image-ops/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', '**/*.d.ts'],
    },
  },
});
```

## Writing Tests

### Basic Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { getLuminance } from './mask';

describe('getLuminance', () => {
  it('calculates correct luminance for red', () => {
    expect(getLuminance(255, 0, 0)).toBeCloseTo(76.245, 2);
  });

  it('calculates correct luminance for white', () => {
    expect(getLuminance(255, 255, 255)).toBeCloseTo(255, 2);
  });
});
```

### Test with Mock Data

```typescript
import { describe, it, expect, vi } from 'vitest';

// Helper to create test ImageData
function createImageData(width: number, height: number, r = 0, g = 0, b = 0, a = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return new ImageData(data, width, height);
}

describe('applyMask', () => {
  it('applies mask with default threshold', () => {
    const image = createImageData(2, 1, 255, 0, 0, 255);
    const mask = createImageData(2, 1, 255, 0, 0, 255);
    const result = applyMask(image, mask);

    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
  });
});
```

### Testing Async Functions

```typescript
import { describe, it, expect } from 'vitest';

describe('asyncExecutor', () => {
  it('resolves with correct output', async () => {
    const result = await asyncExecutor(inputs, params);
    expect(result.type).toBe('expected-type');
  });

  it('rejects on invalid input', async () => {
    await expect(asyncExecutor({}, params)).rejects.toThrow('error message');
  });
});
```

## When to Write E2E Tests

E2E tests are required for:

### Critical User Flows

1. **Authentication Flow**
   - Login/logout
   - Session management
   - Permission handling

2. **Data Persistence**
   - Save workflow
   - Load workflow
   - Auto-save recovery

3. **Image Processing Pipeline**
   - Load image -> Apply mask -> Export
   - Multiple node connections
   - Error handling in real scenarios

4. **UI Interactions**
   - Canvas interactions
   - Node drag-and-drop
   - Keyboard shortcuts

### Example E2E Test

```typescript
// apps/dev-tool/e2e/workflow.test.ts
import { test, expect } from '@playwright/test';

test('saves and loads workflow', async ({ page }) => {
  // Create a workflow
  await page.goto('/');
  await page.click('[data-testid="new-workflow"]');

  // Add a node
  await page.click('[data-testid="add-node"]');
  await page.selectOption('[data-testid="node-type"]', 'image-loader');

  // Save workflow
  await page.click('[data-testid="save"]');

  // Reload page
  await page.reload();

  // Verify workflow is restored
  await expect(page.locator('[data-testid="node-count"]')).toHaveText('1');
});
```

## Best Practices

### Do

- Write tests that are **deterministic** (no flaky tests)
- Use **descriptive test names** that explain what is being tested
- Test **edge cases** and **error conditions**
- Keep tests **independent** (no shared state)
- Use **setup/teardown** for common test data

### Don't

- Don't write tests that depend on timing (use explicit waits)
- Don't mock everything - prefer integration tests for complex scenarios
- Don't write tests that only test implementation details
- Don't skip tests or use `.skip()` without good reason

## Test Naming Convention

```
functionName.scenario.expectedBehavior

Examples:
- getLuminance.red.returnsCorrectValue
- applyMask.transparentMask.preservesOriginal
- executor.invalidInput.throwsError
```

## Debugging Tests

### Run Single Test File

```bash
pnpm vitest run src/core/mask/mask.test.ts
```

### Watch Mode

```bash
pnpm vitest src/core/mask/mask.test.ts
```

### UI Mode

```bash
pnpm vitest --ui
```

## CI Integration

Tests run automatically on every PR via GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Test
  run: pnpm test
```

## Coverage Requirements

Target coverage by package:

| Package | Current | Target |
|---------|---------|--------|
| @prism/core | - | 70% |
| @prism/workflow-core | - | 70% |
| @prism/image-ops | - | 60% |

Coverage reports are generated in `coverage/` directory after running tests.

## Troubleshooting

### "Cannot find module" errors

Make sure test files import from the correct path:

```typescript
// Correct for files in same directory
import { functionName } from './source-file';

// Correct for nested directories
import { functionName } from '../src/mask';
```

### "Timeout" errors

Increase timeout for slow tests:

```typescript
test('slow operation', async () => {
  // Increase timeout to 30 seconds
}, 30000);
```

### Canvas/ImageData errors

The `canvas` npm package provides Node.js Canvas/ImageData implementations. Ensure your test setup file configures these globals correctly.

See `packages/image-ops/src/test-setup.ts` for reference.
