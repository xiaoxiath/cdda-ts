# 贡献指南

感谢您对 `@cataclysm-web/core` 项目的关注！我们欢迎各种形式的贡献。

## 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 安装步骤

1. **Fork 并克隆仓库**

```bash
git clone https://github.com/YOUR_USERNAME/cdda-ts.git
cd cdda-ts/packages/core
```

2. **安装依赖**

```bash
pnpm install
```

3. **设置 Cataclysm-DDA 数据路径**

创建 `cdda.config.json` 文件：

```json
{
  "json": "/path/to/Cataclysm-DDA/data/json",
  "mapgen": "/path/to/Cataclysm-DDA/data/json/mapgen",
  "mapgenPalettes": "/path/to/Cataclysm-DDA/data/json/mapgen_palettes",
  "furnitureAndTerrain": "/path/to/Cataclysm-DDA/data/json/furniture_and_terrain",
  "npcs": "/path/to/Cataclysm-DDA/data/json/npcs",
  "traps": "/path/to/Cataclysm-DDA/data/json/furniture_and_terrain/traps.json"
}
```

4. **运行测试**

```bash
pnpm run test
```

## 开发工作流

### 分支策略

- `main` - 主分支，始终保持稳定
- `develop` - 开发分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支
- `hotfix/*` - 紧急修复分支

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type):**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或工具变更

**示例：**

```bash
feat(terrain): add support for dynamic terrain generation

Implement a new terrain generation algorithm that supports
dynamic terrain changes based on player actions.

Closes #123
```

### 代码风格

我们使用 ESLint 和 Prettier 进行代码格式化：

```bash
# 检查代码风格
pnpm run lint

# 自动修复
pnpm run lint:fix

# 格式化代码
pnpm run format
```

#### TypeScript 代码风格指南

1. **使用 readonly 修饰符**

```typescript
// 好的
class Point {
  readonly x: number;
  readonly y: number;
}

// 不好的
class Point {
  x: number;
  y: number;
}
```

2. **优先使用 const**

```typescript
// 好的
const MAX_HP = 100;

// 不好的
let MAX_HP = 100;
```

3. **使用类型注解**

```typescript
// 好的
function add(a: number, b: number): number {
  return a + b;
}

// 不好的
function add(a, b) {
  return a + b;
}
```

4. **避免 any 类型**

```typescript
// 好的
function processItem(item: Item | null): void {
  if (!item) return;
  // ...
}

// 不好的
function processItem(item: any): void {
  // ...
}
```

## 测试规范

### 测试结构

测试文件应与源文件放在同一目录下，命名为 `*.test.ts` 或 `*.spec.ts`：

```
src/
├── terrain/
│   ├── Terrain.ts
│   ├── TerrainData.ts
│   └── __tests__/
│       ├── Terrain.test.ts
│       └── TerrainData.test.ts
```

### 测试编写指南

1. **使用描述性的测试名称**

```typescript
// 好的
describe('Terrain', () => {
  it('should correctly parse terrain flags from JSON', () => {
    // ...
  });
});

// 不好的
describe('Terrain', () => {
  it('works', () => {
    // ...
  });
});
```

2. **使用 AAA 模式（Arrange-Act-Assert）**

```typescript
it('should calculate move cost correctly', () => {
  // Arrange
  const terrain = new Terrain({ moveCost: 2 });
  const creature = new Avatar({ encumbrance: 50 });

  // Act
  const cost = calculateMoveCost(creature, terrain);

  // Assert
  expect(cost).toBe(3);
});
```

3. **测试边界条件**

```typescript
describe('Point.distanceTo', () => {
  it('should handle zero distance', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(0, 0);
    expect(p1.distanceTo(p2)).toBe(0);
  });

  it('should handle large distances', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10000, 10000);
    expect(p1.distanceTo(p2)).toBeCloseTo(14142.14, 2);
  });
});
```

4. **使用真实的 Cataclysm-DDA 数据进行测试**

```typescript
describe('TerrainLoader', () => {
  it('should load real CDDA terrain data', async () => {
    const data = await loadJsonFile('./test-data/cdda-terrain.json');
    const terrains = TerrainLoader.load(data);

    expect(terrains.size).toBeGreaterThan(1000);
    expect(terrains.get('t_dirt')).toBeDefined();
  });
});
```

### 运行测试

```bash
# 运行所有测试
pnpm run test

# 运行特定测试文件
pnpm run test Terrain.test.ts

# 运行测试并生成覆盖率报告
pnpm run test:coverage

# 监听模式（开发时使用）
pnpm run test:watch
```

## 文档规范

### 文档结构

每个模块应包含以下文档：

1. **README.md** - 模块概述和使用指南
2. **EXAMPLE.ts** - 使用示例
3. **JSDoc 注释** - API 文档

### JSDoc 注释规范

```typescript
/**
 * 计算两点之间的欧几里得距离
 *
 * @param a - 起点
 * @param b - 终点
 * @returns 两点之间的距离
 *
 * @example
 * ```typescript
 * const p1 = new Point(0, 0);
 * const p2 = new Point(3, 4);
 * distance(p1, p2); // 5
 * ```
 *
 * @since 0.1.0
 */
export function distance(a: Point, b: Point): number {
  // ...
}
```

### README 模板

```markdown
# 模块名称

简短的模块描述。

## 功能

- 功能 1
- 功能 2
- 功能 3

## 使用示例

\`\`\`typescript
import { Something } from './module';

const instance = new Something();
instance.doSomething();
\`\`\`

## API 文档

详细的 API 文档链接。

## 相关模块

- [相关模块 1](../相关模块1)
- [相关模块 2](../相关模块2)
```

## Pull Request 流程

### 创建 Pull Request

1. **从主分支创建功能分支**

```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

2. **进行开发并提交**

```bash
git add .
git commit -m "feat(module): add my feature"
```

3. **推送分支**

```bash
git push origin feature/my-feature
```

4. **在 GitHub 上创建 Pull Request**

### Pull Request 检查清单

提交 PR 前，请确认：

- [ ] 代码通过所有测试
- [ ] 代码通过 ESLint 检查
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 遵循了代码风格指南
- [ ] 提交信息符合规范

### Pull Request 模板

```markdown
## 描述
简要描述此 PR 的目的和内容。

## 类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 性能优化
- [ ] 其他

## 测试
- [ ] 添加了新测试
- [ ] 所有测试通过
- [ ] 手动测试通过

## 文档
- [ ] 更新了 README
- [ ] 更新了 API 文档
- [ ] 添加了使用示例

## 相关 Issue
Closes #(issue number)
```

## 代码审查

### 审查要点

作为审查者，请关注以下方面：

1. **功能正确性** - 代码是否实现了预期功能
2. **代码风格** - 是否符合项目代码风格
3. **测试覆盖** - 是否有足够的测试
4. **性能影响** - 是否有性能问题
5. **安全性** - 是否有安全隐患
6. **文档完整性** - 文档是否完整

### 审查流程

1. 自动检查通过后，开始人工审查
2. 提出修改意见或批准
3. 作者修改后请求再次审查
4. 审查通过后合并

## 发布流程

发布由维护者负责，遵循 [语义化版本](https://semver.org/) 规范：

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的新功能
- **PATCH**: 向后兼容的 bug 修复

### 发布步骤

1. 更新版本号

```bash
npm version [major|minor|patch]
```

2. 生成 CHANGELOG

```bash
pnpm run changelog
```

3. 发布到 npm

```bash
pnpm publish
```

4. 创建 GitHub Release

## 社区规范

### 行为准则

- 尊重所有贡献者
- 欢迎新手提问
- 建设性的反馈
- 专注于解决问题

### 沟通渠道

- **GitHub Issues** - 报告 bug 和功能请求
- **GitHub Discussions** - 一般讨论和问题
- **Discord** - 实时聊天（如有）

## 获取帮助

如果您需要帮助：

1. 查看 [文档](./README.md)
2. 搜索 [Issues](https://github.com/YOUR_USERNAME/cdda-ts/issues)
3. 创建新 Issue 描述您的问题
4. 加入 Discord 社区

---

*感谢您的贡献！*
