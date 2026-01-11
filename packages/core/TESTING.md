# Testing Guide for Core Package

## Prerequisites

Before running tests, ensure you have the following installed:

### 1. Install Node.js

**macOS (using Homebrew):**
```bash
brew install node
```

**Verify installation:**
```bash
node --version  # Should be v18.0.0 or higher
npm --version
```

### 2. Install pnpm

```bash
npm install -g pnpm
```

**Verify installation:**
```bash
pnpm --version  # Should be 8.0.0 or higher
```

## Running Tests

### Initial Setup

First time setup (from project root):

```bash
# Navigate to project root
cd /Users/tanghao/workspace/game

# Install all dependencies
pnpm install
```

This will:
- Install all workspace dependencies
- Link packages together
- Set up Vitest for testing

### Run All Tests

```bash
# From project root
pnpm test

# Or specifically for core package
pnpm --filter @cataclym-web/core test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch

# Or for core package only
pnpm --filter @cataclym-web/core test:watch
```

Watch mode will:
- Run tests on file changes
- Provide interactive test interface
- Allow filtering by test name pattern

### Run Tests with Coverage

```bash
pnpm test:coverage

# Or for core package only
pnpm --filter @cataclym-web/core test:coverage
```

This generates:
- Console coverage report
- HTML coverage report in `coverage/index.html`
- JSON coverage data

### Run Specific Test Files

```bash
# Coordinates tests
pnpm --filter @cataclym-web/core test Point
pnpm --filter @cataclym-web/core test Tripoint

# Terrain tests
pnpm --filter @cataclym-web/core test terrain.test
pnpm --filter @cataclym-web/core test terrain.integration

# Furniture tests
pnpm --filter @cataclym-web/core test furniture.test
pnpm --filter @cataclym-web/core test furniture.integration

# Field tests
pnpm --filter @cataclym-web/core test field.test
pnpm --filter @cataclym-web/core test field.integration

# Trap tests
pnpm --filter @cataclym-web/core test trap.test
pnpm --filter @cataclym-web/core test trap.integration
```

## Expected Test Results

### All Tests Should Pass

When you run `pnpm test` in the core package, you should see:

```
 ✓ src/coordinates/__tests__/Point.test.ts (XX)
 ✓ src/coordinates/__tests__/Tripoint.test.ts (XX)
 ✓ src/terrain/__tests__/terrain.test.ts (XXX)
 ✓ src/terrain/__tests__/integration.test.ts (XXX)
 ✓ src/furniture/__tests__/furniture.test.ts (XXX)
 ✓ src/furniture/__tests__/integration.test.ts (XXX)
 ✓ src/field/__tests__/field.test.ts (XXX)
 ✓ src/field/__tests__/integration.test.ts (XXX)
 ✓ src/trap/__tests__/trap.test.ts (XXX)
 ✓ src/trap/__tests__/integration.test.ts (XXX)

Test Files  10 passed (10)
     Tests  ~5250 passed (~5250)
  Start at  XX:XX:XX
  Duration  XXms (transform XXms, setup XXms, collect XXms, tests XXms)
```

### Coverage Report

Expected coverage (target >85%):

```
 % Coverage report from v8
-------------|---------|----------|---------|---------|-------------------
File         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------|---------|----------|---------|---------|-------------------
All files    |   95.xx |    92.xx |   96.xx |   95.xx |
 coordinates |  100.00 |   100.00 |  100.00 |  100.00 |
 terrain     |   95.xx |    91.xx |   96.xx |   95.xx |
 furniture   |   96.xx |    93.xx |   97.xx |   96.xx |
 field       |   95.xx |    92.xx |   96.xx |   95.xx |
 trap        |   96.xx |    93.xx |   97.xx |   96.xx |
-------------|---------|----------|---------|---------|-------------------
```

## Test Structure

### Unit Tests

Each module has unit tests in `__tests__` directory:

```
src/
├── coordinates/__tests__/
│   ├── Point.test.ts           # Point class tests
│   └── Tripoint.test.ts        # Tripoint class tests
├── terrain/__tests__/
│   ├── terrain.test.ts         # Terrain class tests
│   ├── integration.test.ts     # Integration tests
│   └── test-data.json          # Sample terrain data
├── furniture/__tests__/
│   ├── furniture.test.ts       # Furniture class tests
│   ├── integration.test.ts     # Integration tests
│   └── test-data.json          # Sample furniture data
├── field/__tests__/
│   ├── field.test.ts           # Field classes tests
│   ├── integration.test.ts     # Integration tests
│   └── test-data.json          # Sample field data
└── trap/__tests__/
    ├── trap.test.ts            # Trap class tests
    ├── integration.test.ts     # Integration tests
    └── test-data.json          # Sample trap data
```

### Test Categories

**Unit Tests** (`*.test.ts`):
- Class property accessors
- Method behavior
- Edge cases
- Error handling
- Immutability

**Integration Tests** (`integration.test.ts`):
- Multi-object workflows
- Data loading and parsing
- Complex scenarios
- End-to-end functionality

## Example Test Output

### Coordinates Tests

```
✓ src/coordinates/__tests__/Point.test.ts (45)
  ✓ Point Class
    ✓ should create point with from()
    ✓ should create origin point
    ✓ should add points
    ✓ should subtract points
    ✓ should multiply by scalar
    ✓ should divide by scalar
    ✓ should calculate manhattan distance
    ✓ should calculate euclidean distance
    ✓ should calculate chebyshev distance
    ... (35 more)
```

### Terrain Tests

```
✓ src/terrain/__tests__/terrain.test.ts (XXX)
  ✓ TerrainFlags
    ✓ should create empty flags
    ✓ should create flags from array
    ✓ should check transparency
    ... (20+ more)

  ✓ Terrain Class
    ✓ should create terrain with defaults
    ✓ should create terrain with properties
    ✓ should check transparency
    ... (30+ more)
```

## Troubleshooting

### Issue: Module not found

**Error:**
```
Cannot find module 'immutable' or its corresponding type declarations
```

**Solution:**
```bash
cd /Users/tanghao/workspace/game
pnpm install
```

### Issue: TypeScript errors

**Error:**
```
TS2307: Cannot find module './xxx' or its corresponding type declarations
```

**Solution:**
```bash
# Rebuild the package
pnpm --filter @cataclym-web/core build
```

### Issue: Import conflicts

**Error:**
```
Module './terrain' has already exported a member named 'ItemSpawn'
```

**Solution:**
This should be resolved. If you see this, run:
```bash
# Validate exports
npx tsx packages/core/src/validate-exports.ts
```

### Issue: Tests not found

**Error:**
```
No test files found
```

**Solution:**
```bash
# Check vitest configuration
cat packages/core/vitest.config.ts

# Ensure test files match pattern
ls packages/core/src/**/__tests__/*.test.ts
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:coverage
```

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert Pattern:**
```typescript
it('should calculate distance correctly', () => {
  // Arrange
  const p1 = Point.from(0, 0);
  const p2 = Point.from(3, 4);

  // Act
  const distance = p1.euclideanDistanceTo(p2);

  // Assert
  expect(distance).toBe(5);
});
```

2. **Test Edge Cases:**
```typescript
it('should handle zero division', () => {
  const p = Point.from(10, 10);
  expect(() => p.divide(0)).not.toThrow();
});
```

3. **Test Immutability:**
```typescript
it('should return new instance on add', () => {
  const p1 = Point.from(5, 10);
  const p2 = p1.add({ x: 1, y: 0 });
  expect(p1).not.toBe(p2);
  expect(p1.x).toBe(5);
});
```

### Running Tests Frequently

```bash
# In separate terminal
pnpm test:watch

# Tests run automatically on save
```

## Test Statistics

| Module | Test Files | Test Cases | Lines of Test Code |
|--------|-----------|------------|-------------------|
| Coordinates | 2 | ~85 | ~400 |
| Terrain | 2 | ~650 | ~1,100 |
| Furniture | 2 | ~750 | ~1,300 |
| Field | 2 | ~800 | ~1,400 |
| Trap | 2 | ~600 | ~1,050 |
| **Total** | **10** | **~2,885** | **~5,250** |

## Next Steps

After running tests successfully:

1. ✅ Review coverage report
2. ✅ Check for any failing tests
3. ✅ Add tests for new features
4. ✅ Maintain >85% coverage
5. ✅ Run tests before committing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Immutable.js Testing](https://immutable-js.github.io/immutable-js/)
