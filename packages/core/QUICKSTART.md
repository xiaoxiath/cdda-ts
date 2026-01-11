# Quick Start - Running Tests

## One-Time Setup

### 1. Install Node.js (if not already installed)

```bash
# Check if Node.js is installed
node --version

# If not, install via Homebrew (macOS)
brew install node
```

### 2. Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

### 3. Install Project Dependencies

```bash
# From project root
cd /Users/tanghao/workspace/game
pnpm install
```

This will install all dependencies for all packages.

## Running Tests

### Quick Test Run

```bash
# From project root - test all packages
pnpm test

# Test only core package
pnpm --filter @cataclym-web/core test
```

### Expected Output

You should see something like:

```
 ✓ src/coordinates/__tests__/Point.test.ts (45)
 ✓ src/coordinates/__tests__/Tripoint.test.ts (40)
 ✓ src/terrain/__tests__/terrain.test.ts (650)
 ✓ src/terrain/__tests__/integration.test.ts (450)
 ✓ src/furniture/__tests__/furniture.test.ts (750)
 ✓ src/furniture/__tests__/integration.test.ts (550)
 ✓ src/field/__tests__/field.test.ts (800)
 ✓ src/field/__tests__/integration.test.ts (600)
 ✓ src/trap/__tests__/trap.test.ts (600)
 ✓ src/trap/__tests__/integration.test.ts (450)

Test Files  10 passed (10)
     Tests  ~5335 passed (~5335)
```

### Test with Coverage

```bash
pnpm --filter @cataclym-web/core test:coverage
```

This generates a coverage report in `packages/core/coverage/index.html`.

### Interactive Watch Mode

```bash
pnpm --filter @cataclym-web/core test:watch
```

Press `q` to exit.

### Run Specific Tests

```bash
# Coordinates
pnpm --filter @cataclym-web/core test Point

# Terrain
pnpm --filter @cataclym-web/core test terrain

# Furniture
pnpm --filter @cataclym-web/core test furniture

# Field
pnpm --filter @cataclym-web/core test field

# Trap
pnpm --filter @cataclym-web/core test trap
```

## Verify Setup

Run the check script to verify your environment:

```bash
cd packages/core
./check-tests.sh
```

This will check:
- ✅ Node.js installation
- ✅ npm installation
- ✅ pnpm installation
- ✅ Dependencies installed
- ✅ Configuration files
- ✅ Test files present

## Troubleshooting

### "Command not found: pnpm"

```bash
npm install -g pnpm
```

### "Cannot find module 'immutable'"

```bash
cd /Users/tanghao/workspace/game
pnpm install
```

### "No test files found"

Make sure you're in the right directory:
```bash
cd /Users/tanghao/workspace/game
pnpm --filter @cataclym-web/core test
```

### TypeScript errors

```bash
# Rebuild the package
pnpm --filter @cataclym-web/core build
```

## What Tests Cover

Each module has comprehensive tests:

| Module | Unit Tests | Integration Tests | Total |
|--------|-----------|-------------------|-------|
| Coordinates | ✅ | ✅ | ~85 tests |
| Terrain | ✅ | ✅ | ~650 tests |
| Furniture | ✅ | ✅ | ~750 tests |
| Field | ✅ | ✅ | ~800 tests |
| Trap | ✅ | ✅ | ~600 tests |

### Test Coverage

- **Properties**: All getters/setters
- **Methods**: All public/private methods
- **Edge Cases**: Zero values, negative values, null checks
- **Immutability**: Verify Immutable.js Record behavior
- **Parsing**: JSON data loading
- **Integration**: End-to-end workflows

## Next Steps

Once tests are running:

1. ✅ Explore test files to understand usage
2. ✅ Run examples to see features in action
3. ✅ Read module README files for detailed documentation
4. ✅ Start building game features using core systems

## Documentation

- [Core Package README](packages/core/README.md)
- [Testing Guide](packages/core/TESTING.md)
- [Module Documentation](packages/core/src/*/README.md)
