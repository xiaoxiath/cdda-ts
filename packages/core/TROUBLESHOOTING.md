# 故障排除指南

本文档提供常见问题的解决方案和调试技巧。

## 目录

- [安装问题](#安装问题)
- [构建问题](#构建问题)
- [测试问题](#测试问题)
- [运行时问题](#运行时问题)
- [性能问题](#性能问题)
- [数据加载问题](#数据加载问题)

## 安装问题

### 依赖安装失败

**症状**: `pnpm install` 失败

**可能原因**:
- Node.js 版本不兼容
- 网络问题
- pnpm 缓存损坏

**解决方案**:

```bash
# 1. 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 2. 清理 pnpm 缓存
pnpm store prune

# 3. 删除 node_modules 和锁文件
rm -rf node_modules pnpm-lock.yaml

# 4. 重新安装
pnpm install
```

### TypeScript 编译错误

**症状**: 类型检查失败

**可能原因**:
- TypeScript 版本不匹配
- 类型定义缺失
- 缓存问题

**解决方案**:

```bash
# 1. 清理构建缓存
pnpm run clean

# 2. 删除 TypeScript 缓存
rm -rf *.tsbuildinfo

# 3. 重新安装类型定义
pnpm install --force

# 4. 重新运行类型检查
pnpm run type-check
```

## 构建问题

### 生产构建失败

**症状**: `pnpm run build` 失败

**可能原因**:
- 代码错误
- 依赖问题
- 内存不足

**解决方案**:

```bash
# 1. 检查代码错误
pnpm run lint

# 2. 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build

# 3. 使用详细输出
pnpm run build -- --verbose

# 4. 检查生成的错误日志
cat dist/build.log
```

### Source Maps 错误

**症状**: Source maps 不正确或缺失

**解决方案**:

```bash
# 1. 清理并重建
pnpm run clean
pnpm run build:dev

# 2. 验证 source maps
ls -la dist/*.map

# 3. 检查 tsconfig.json
# 确保 "sourceMap": true
```

## 测试问题

### 测试超时

**症状**: 测试运行超时

**可能原因**:
- 测试数据加载慢
- 无限循环
- 异步问题

**解决方案**:

```bash
# 1. 增加测试超时时间
vitest --testTimeout=10000

# 2. 运行特定测试文件
pnpm run test specific.test.ts

# 3. 使用调试模式
pnpm run test:debug

# 4. 检查测试日志
cat vitest.log
```

### 测试数据缺失

**症状**: 测试因为缺少 Cataclysm-DDA 数据而失败

**解决方案**:

```bash
# 1. 检查配置文件
cat cdda.config.json

# 2. 验证数据路径
ls -la /path/to/Cataclysm-DDA/data/json

# 3. 设置环境变量
export CDDA_JSON_PATH="/path/to/Cataclysm-DDA/data/json"

# 4. 使用测试数据
pnpm run test -- --testData=test-data
```

### CI 环境测试失败

**症状**: 测试在 CI 中失败但本地通过

**可能原因**:
- 环境差异
- 时区问题
- 文件路径问题

**解决方案**:

```bash
# 1. 使用 CI 相同的 Node.js 版本
nvm use 18

# 2. 设置时区
export TZ=UTC

# 3. 使用相对路径
# 不要使用绝对路径

# 4. 运行 CI 相同的命令
pnpm run test:ci
```

## 运行时问题

### 模块导入错误

**症状**: `Cannot find module '@cataclysm-web/core'`

**可能原因**:
- 包未正确安装
- 路径配置错误
- 构建产物缺失

**解决方案**:

```bash
# 1. 重新安装
pnpm install

# 2. 重新构建
pnpm run build

# 3. 检查 package.json
# 确保 "main" 和 "types" 字段正确

# 4. 清理缓存
rm -rf node_modules/.cache
```

### 运行时类型错误

**症状**: `TypeError: xxx is not a function`

**可能原因**:
- 类型定义不匹配
- API 变更
- 版本不兼容

**解决方案**:

```typescript
// 1. 添加类型检查
import { isPoint } from './coordinates';

if (isPoint(obj)) {
  // 安全使用 obj
}

// 2. 使用类型守卫
function isTerrain(obj: any): obj is Terrain {
  return obj && typeof obj.id === 'string' && obj.flags instanceof Set;
}

// 3. 运行时验证
console.log('Object type:', typeof obj);
console.log('Object keys:', Object.keys(obj));
```

### 内存泄漏

**症状**: 内存使用持续增长

**可能原因**:
- 未清理的监听器
- 闭包引用
- 缓存未清理

**解决方案**:

```typescript
// 1. 清理监听器
class MyClass {
  private listeners: Array<() => void> = [];

  addListener(fn: () => void): void {
    this.listeners.push(fn);
  }

  destroy(): void {
    this.listeners.forEach(fn => fn());
    this.listeners = [];
  }
}

// 2. 使用 WeakMap/WeakSet
const cache = new WeakMap<object, Data>();

// 3. 定期清理缓存
setInterval(() => {
  if (cache.size > 1000) {
    cache.clear();
  }
}, 60000);

// 4. 使用内存分析工具
// Chrome DevTools > Memory > Take Heap Snapshot
```

## 性能问题

### 游戏运行缓慢

**症状**: 帧率低于 30 FPS

**可能原因**:
- 过多的计算
- 低效的算法
- 不必要的渲染

**解决方案**:

```typescript
// 1. 使用性能分析
performance.mark('update-start');
game.update();
performance.mark('update-end');
performance.measure('update', 'update-start', 'update-end');

// 2. 优化热点
// 使用 profiler 找出性能瓶颈

// 3. 减少不必要的计算
// 使用 memoization
const memoizedFn = memoize((arg) => expensiveCalculation(arg));

// 4. 批量更新
// 不要逐个更新，而是批量处理
class GameMap {
  updateTiles(updates: TileUpdate[]): void {
    // 批量处理更新
  }
}
```

### 地图加载慢

**症状**: 加载地图需要很长时间

**可能原因**:
- 同步加载
- 未使用缓存
- 过多的数据

**解决方案**:

```typescript
// 1. 使用异步加载
async loadMap(): Promise<void> {
  const data = await this.loader.load();
  this.processData(data);
}

// 2. 使用缓存
class MapCache {
  private cache = new Map<string, Submap>();

  get(key: string): Submap | null {
    return this.cache.get(key) || null;
  }

  set(key: string, value: Submap): void {
    this.cache.set(key, value);
  }
}

// 3. 延迟加载
class GameMap {
  private submaps = new Map<string, Promise<Submap>>();

  async getSubmap(pos: Tripoint): Promise<Submap> {
    const key = pos.toString();
    if (!this.submaps.has(key)) {
      this.submaps.set(key, this.loadSubmap(pos));
    }
    return this.submaps.get(key)!;
  }
}
```

### 内存使用高

**症状**: 内存占用过高

**可能原因**:
- 数据结构过大
- 未释放的引用
- 重复数据

**解决方案**:

```typescript
// 1. 使用 SOA 数据布局
class MapTileSoA {
  ter: Int16Array;
  frn: Int16Array;
  // 比 Array<MapTile> 更节省内存
}

// 2. 使用 Uniform 优化
class Submap {
  private soa: MapTileSoA | null = null;
  public uniformTer: TerrainId = 't_null';

  isUniform(): boolean {
    return this.soa === null;
  }
}

// 3. 重用对象
// 使用对象池
class ObjectPool<T> {
  private pool: T[] = [];

  get(): T {
    return this.pool.pop() || this.create();
  }

  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

## 数据加载问题

### Cataclysm-DDA 数据未找到

**症状**: `Error: CDDA data not found`

**解决方案**:

```bash
# 1. 检查配置文件
cat cdda.config.json

# 2. 验证路径
ls -la /path/to/Cataclysm-DDA/data/json

# 3. 使用绝对路径
{
  "json": "/absolute/path/to/Cataclysm-DDA/data/json"
}

# 4. 设置环境变量
export CDDA_JSON_PATH="/absolute/path/to/Cataclysm-DDA/data/json"
```

### JSON 解析错误

**症状**: `SyntaxError: Unexpected token in JSON`

**可能原因**:
- JSON 格式错误
- 编码问题
- 文件损坏

**解决方案**:

```bash
# 1. 验证 JSON 格式
cat file.json | jq .

# 2. 检查文件编码
file -I file.json

# 3. 修复编码
iconv -f ISO-8859-1 -t UTF-8 file.json > file-fixed.json

# 4. 使用 JSON 验证工具
pnpm run validate-json
```

### 加载超时

**症状**: 数据加载超时

**解决方案**:

```typescript
// 1. 增加超时时间
const loader = new DataLoader({
  timeout: 30000, // 30 秒
});

// 2. 使用分批加载
class BatchLoader {
  async loadAll(files: string[]): Promise<void> {
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(f => this.load(f)));
    }
  }
}

// 3. 显示加载进度
class ProgressLoader {
  async loadWithProgress(files: string[]): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      await this.load(files[i]);
      console.log(`Loading: ${i + 1}/${files.length}`);
    }
  }
}
```

## 调试技巧

### 使用 Source Maps

```typescript
// 启用 source maps
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSourceMap": false
  }
}

// 使用 Chrome DevTools
// 1. 打开 DevTools > Sources
// 2. 添加 webpack:// 映射
// 3. 设置断点
```

### 使用日志

```typescript
// 创建详细的日志
class Logger {
  private level: LogLevel = LogLevel.DEBUG;

  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(`[DEBUG ${new Date().toISOString()}] ${message}`, ...args);
    }
  }
}

// 使用日志
logger.debug('Loading terrain', { id: terrainId, flags: terrain.flags });
```

### 使用断点

```typescript
// 使用 debugger 语句
function complexFunction(obj: any): void {
  debugger; // 在这里暂停
  // ...
}

// 使用 Chrome DevTools
// 1. 打开 Sources 面板
// 2. 找到源文件
// 3. 点击行号设置断点
```

### 性能分析

```typescript
// 使用 performance API
performance.mark('function-start');
complexFunction();
performance.mark('function-end');
performance.measure('function', 'function-start', 'function-end');

// 获取测量结果
const measures = performance.getEntriesByName('function');
console.table(measures);
```

## 获取帮助

如果问题仍未解决：

1. 查看 [文档](./README.md)
2. 搜索 [GitHub Issues](https://github.com/YOUR_USERNAME/cdda-ts/issues)
3. 创建新 Issue，包含：
   - 错误信息
   - 复现步骤
   - 环境信息
   - 相关日志

### 环境信息模板

创建 Issue 时，请提供：

```
### Environment
- Node.js: 18.x.x
- pnpm: 8.x.x
- OS: macOS / Linux / Windows
- @cataclysm-web/core: x.x.x

### Error Message
```
错误信息...
```

### Steps to Reproduce
1. 步骤 1
2. 步骤 2
3. ...

### Expected Behavior
期望的行为...

### Actual Behavior
实际的行为...

### Additional Context
其他相关信息...
```

---

*本文档由 Claude Code 生成，基于对 @cataclysm-web/core 代码库的深入分析。*
