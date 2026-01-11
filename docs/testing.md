# 测试指南

## 概述

本项目采用测试驱动开发（TDD）方法，确保核心逻辑的正确性和稳定性。

## 测试框架

- **Vitest**: 现代化的测试框架，与 TypeScript 完美集成
- **覆盖率**: 使用 `@vitest/coverage-v8` 生成覆盖率报告

## 测试结构

```
packages/core/src/
├── coordinates/
│   ├── __tests__/
│   │   └── coordinates.test.ts
│   └── ...
├── map/
│   ├── __tests__/
│   │   ├── GameMap.test.ts
│   │   ├── MapBuffer.test.ts
│   │   ├── Submap.test.ts
│   │   └── MapTile.test.ts
│   └── ...
└── ...
```

## 测试命令

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @cataclym-web/core test

# 监听模式（自动重新运行）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 运行特定测试文件
pnpm test MapTile.test.ts
```

## 测试最佳实践

### 1. 测试命名

使用清晰的测试名称，描述被测试的功能：

```typescript
describe('GameMap', () => {
  describe('setTerrain', () => {
    it('should set terrain at valid position', () => {
      // ...
    });

    it('should return same instance when terrain is unchanged', () => {
      // ...
    });

    it('should handle negative coordinates correctly', () => {
      // ...
    });
  });
});
```

### 2. AAA 模式

使用 Arrange-Act-Assert 模式组织测试：

```typescript
it('should calculate manhattan distance correctly', () => {
  // Arrange - 准备测试数据
  const p1 = Point.from(10, 20);
  const p2 = Point.from(15, 25);

  // Act - 执行被测试的功能
  const distance = p1.manhattanDistanceTo(p2);

  // Assert - 验证结果
  expect(distance).toBe(10);
});
```

### 3. 测试不可变性

确保对象返回新实例而不是修改自身：

```typescript
it('should return new instance when setting terrain', () => {
  const map = GameMap.create();
  const pos = new Tripoint({ x: 0, y: 0, z: 0 });
  const terrainId = 100;

  const newMap = map.setTerrain(pos, terrainId);

  // 验证原对象未被修改
  expect(map.getTerrain(pos)).toBeNull();
  // 验证新对象有正确的值
  expect(newMap.getTerrain(pos)).toBe(terrainId);
  // 验证不是同一个实例
  expect(newMap).not.toBe(map);
});
```

### 4. 边界条件测试

测试边界条件和特殊情况：

```typescript
describe('Tripoint', () => {
  describe('constructor', () => {
    it('should handle zero coordinates', () => {
      const p = new Tripoint({ x: 0, y: 0, z: 0 });
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
      expect(p.z).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const p = new Tripoint({ x: -10, y: -20, z: -5 });
      expect(p.x).toBe(-10);
      expect(p.y).toBe(-20);
      expect(p.z).toBe(-5);
    });

    it('should handle large coordinates', () => {
      const p = new Tripoint({ x: 1000000, y: 1000000, z: 100 });
      expect(p.x).toBe(1000000);
    });
  });
});
```

### 5. 使用测试数据

创建可重用的测试数据：

```typescript
// test-utils.ts
export const createTestPoint = (x: number = 0, y: number = 0): Point => {
  return Point.from(x, y);
};

export const createTestTripoint = (
  x: number = 0,
  y: number = 0,
  z: number = 0
): Tripoint => {
  return new Tripoint({ x, y, z });
};

export const createTestSubmap = (terrainId: number = 0): Submap => {
  return Submap.uniform(terrainId);
};

// 使用
it('should work with test data', () => {
  const point = createTestPoint(10, 20);
  expect(point.x).toBe(10);
});
```

## 测试覆盖率目标

- **整体覆盖率**: ≥ 80%
- **核心模块**: ≥ 90%
- **工具函数**: 100%

## 示例测试

### 单元测试示例

```typescript
// Point.test.ts
import { describe, it, expect } from 'vitest';
import { Point } from '../Point';

describe('Point', () => {
  describe('constructor', () => {
    it('should create point with given coordinates', () => {
      const point = new Point({ x: 10, y: 20 });
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });

    it('should freeze the object', () => {
      const point = new Point({ x: 10, y: 20 });
      expect(Object.isFrozen(point)).toBe(true);
    });
  });

  describe('add', () => {
    it('should add two points', () => {
      const p1 = Point.from(10, 20);
      const p2 = Point.from(5, 15);
      const result = p1.add({ x: 5, y: 15 });
      expect(result.x).toBe(15);
      expect(result.y).toBe(35);
    });

    it('should return new instance', () => {
      const p1 = Point.from(10, 20);
      const result = p1.add({ x: 1, y: 0 });
      expect(result).not.toBe(p1);
      expect(p1.x).toBe(10); // 原对象未改变
    });
  });

  describe('manhattanDistanceTo', () => {
    it('should calculate correct distance', () => {
      const p1 = Point.from(0, 0);
      const p2 = Point.from(10, 20);
      expect(p1.manhattanDistanceTo(p2)).toBe(30);
    });

    it('should return 0 for same point', () => {
      const p = Point.from(10, 10);
      expect(p.manhattanDistanceTo(p)).toBe(0);
    });
  });

  describe('from', () => {
    it('should create point from coordinates', () => {
      const point = Point.from(10, 20);
      expect(point).toBeInstanceOf(Point);
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });
  });

  describe('origin', () => {
    it('should create point at origin', () => {
      const point = Point.origin();
      expect(point.x).toBe(0);
      expect(point.y).toBe(0);
    });
  });
});
```

### 集成测试示例

```typescript
// GameMap.integration.test.ts
import { describe, it, expect } from 'vitest';
import { GameMap } from '../GameMap';
import { Tripoint } from '../../coordinates';
import { SEEX, SEEY } from '../../constants';

describe('GameMap Integration', () => {
  describe('terrain operations', () => {
    it('should set and get terrain across multiple submaps', () => {
      let map = GameMap.create();

      // 在多个位置设置地形
      const positions = [
        new Tripoint({ x: 0, y: 0, z: 0 }),
        new Tripoint({ x: 50, y: 50, z: 0 }),
        new Tripoint({ x: 100, y: 100, z: 0 }),
      ];

      for (const pos of positions) {
        map = map.setTerrain(pos, 100);
        expect(map.getTerrain(pos)).toBe(100);
      }
    });

    it('should handle map shifting', () => {
      let map = GameMap.create();
      const pos = new Tripoint({ x: 50, y: 50, z: 0 });
      map = map.setTerrain(pos, 100);

      // 移动地图
      const shiftedMap = map.shift(SEEX, 0, 0);

      // 原位置应该不同
      expect(shiftedMap.getTerrain(pos)).not.toBe(100);

      // 新位置应该有地形
      const newPos = new Tripoint({ x: pos.x + SEEX, y: pos.y, z: pos.z });
      expect(shiftedMap.getTerrain(newPos)).toBe(100);
    });
  });

  describe('submap management', () => {
    it('should track loaded submaps correctly', () => {
      let map = GameMap.create();
      expect(map.getLoadedSubmapCount()).toBe(0);

      // 设置一些地形
      for (let x = 0; x < 100; x += 5) {
        for (let y = 0; y < 100; y += 5) {
          const pos = new Tripoint({ x, y, z: 0 });
          map = map.setTerrain(pos, 100);
        }
      }

      // 应该加载了一些子地图
      expect(map.getLoadedSubmapCount()).toBeGreaterThan(0);
    });
  });
});
```

### 异步测试示例

```typescript
// TerrainLoader.integration.test.ts
import { describe, it, expect } from 'vitest';
import { TerrainLoader } from '../TerrainLoader';

describe('TerrainLoader Integration', () => {
  it('should load terrain from JSON file', async () => {
    const loader = new TerrainLoader();
    const data = await loader.load('data/json/furniture_and_terrain/terrain-floors.json');

    expect(data.size).toBeGreaterThan(0);
    expect(data.has('t_thconc_floor')).toBe(true);
  });

  it('should handle invalid file gracefully', async () => {
    const loader = new TerrainLoader();
    const data = await loader.load('nonexistent.json');

    expect(data.size).toBe(0);
  });
});
```

## Mock 和 Stub

### 使用 Vitest 的 mock 功能

```typescript
import { vi, describe, it, expect } from 'vitest';
import { GameMap } from '../GameMap';

describe('GameMap with mocks', () => {
  it('should use mock submap', () => {
    const mockSubmap = {
      getTile: vi.fn(() => ({ terrain: 100 })),
      setTerrain: vi.fn(),
    };

    // 使用 mock 对象进行测试
    const tile = mockSubmap.getTile(0, 0);
    expect(tile.terrain).toBe(100);
    expect(mockSubmap.getTile).toHaveBeenCalledWith(0, 0);
  });
});
```

## 性能测试

```typescript
import { describe, it, expect } from 'vitest';
import { GameMap } from '../GameMap';

describe('GameMap Performance', () => {
  it('should handle large terrain updates efficiently', () => {
    let map = GameMap.create();
    const startTime = performance.now();

    // 设置 1000 个地形
    for (let i = 0; i < 1000; i++) {
      const pos = new Tripoint({ x: i, y: i, z: 0 });
      map = map.setTerrain(pos, 100);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 应该在合理时间内完成
    expect(duration).toBeLessThan(100); // < 100ms
  });

  it('should have reasonable memory usage', () => {
    const map = GameMap.create();

    // 填充一些地形
    for (let x = 0; x < 100; x += 10) {
      for (let y = 0; y < 100; y += 10) {
        const pos = new Tripoint({ x, y, z: 0 });
        map = map.setTerrain(pos, 100);
      }
    }

    const memoryUsage = map.getMemoryUsage();

    // 应该在合理范围内（例如 < 10MB）
    expect(memoryUsage).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## 调试测试

### 使用 vitest 的调试功能

```bash
# 运行特定测试并显示详细信息
pnpm test MapTile --reporter=verbose

# 运行测试并在失败时暂停
pnpm test --debug

# 监听模式
pnpm test:watch
```

### 在代码中使用 console.log

```typescript
it('should demonstrate complex behavior', () => {
  const map = GameMap.create();
  console.log('Initial map:', map);

  const newMap = map.setTerrain(pos, 100);
  console.log('After setting terrain:', newMap);
  console.log('Memory usage:', newMap.getMemoryUsage());
});
```

## 持续集成

### GitHub Actions 配置示例

```yaml
# .github/workflows/test.yml
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

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Generate coverage
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 常见问题

### Q: 测试运行缓慢怎么办？

A: 使用 `vi.mock()` 模拟慢速操作，或使用 `describe.skip()` 跳过特定测试。

### Q: 如何测试私有方法？

A: 通常不需要测试私有方法。如果必须，可以通过公共接口测试其效果。

### Q: 如何处理随机性？

A: 使用固定的种子或 mock 随机数生成器：

```typescript
it('should handle random events', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  // 测试代码
});
```

## 参考资源

- [Vitest 文档](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
