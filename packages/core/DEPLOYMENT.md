# 部署文档

本文档描述如何部署和发布 `@cataclysm-web/core` 包。

## 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- npm 账户（用于发布）
- Cataclysm-DDA 数据文件

## 本地开发

### 安装依赖

```bash
cd packages/core
pnpm install
```

### 运行开发服务器

```bash
pnpm run dev
```

### 运行测试

```bash
# 运行所有测试
pnpm run test

# 监听模式
pnpm run test:watch

# 覆盖率报告
pnpm run test:coverage
```

### 类型检查

```bash
pnpm run type-check
```

### 代码检查

```bash
# ESLint 检查
pnpm run lint

# 自动修复
pnpm run lint:fix

# Prettier 格式化
pnpm run format
```

## 构建

### 开发构建

```bash
pnpm run build:dev
```

开发构建包含：
- 未压缩的代码
- Source maps
- 详细的错误信息

### 生产构建

```bash
pnpm run build
```

生产构建包含：
- 压缩的代码
- 优化的依赖
- Tree-shaking

### 验证构建

```bash
# 检查构建产物
pnpm run build:check

# 运行构建后的测试
pnpm run test:prod
```

## Cataclysm-DDA 数据配置

### 配置文件

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

### 环境变量

也可以通过环境变量配置：

```bash
export CDDA_JSON_PATH="/path/to/Cataclysm-DDA/data/json"
export CDDA_MAPGEN_PATH="/path/to/Cataclysm-DDA/data/json/mapgen"
export CDDA_MAPGEN_PALETTES_PATH="/path/to/Cataclysm-DDA/data/json/mapgen_palettes"
export CDDA_FURNITURE_AND_TERRAIN_PATH="/path/to/Cataclysm-DDA/data/json/furniture_and_terrain"
export CDDA_NPCS_PATH="/path/to/Cataclysm-DDA/data/json/npcs"
export CDDA_TRAPS_PATH="/path/to/Cataclysm-DDA/data/json/furniture_and_terrain/traps.json"
```

### 优先级

配置优先级（从高到低）：
1. 环境变量
2. cdda.config.json
3. 默认值

## 测试部署

### 本地测试

在本地测试构建产物：

```bash
# 构建
pnpm run build

# 创建测试项目
cd /tmp/test-project
pnpm init
pnpm add /path/to/cdda-ts/packages/core

# 测试导入
node -e "const { Point } = require('@cataclysm-web/core'); console.log(new Point(1, 2));"
```

### 集成测试

运行集成测试套件：

```bash
pnpm run test:integration
```

## 发布流程

### 准备发布

1. **更新版本号**

```bash
# 主版本（不兼容的 API 变更）
pnpm version major

# 次版本（向后兼容的新功能）
pnpm version minor

# 补丁版本（向后兼容的 bug 修复）
pnpm version patch
```

2. **更新 CHANGELOG**

```bash
pnpm run changelog
```

手动编辑 `CHANGELOG.md`，添加详细的变更说明。

3. **运行完整测试**

```bash
# 类型检查
pnpm run type-check

# 代码检查
pnpm run lint

# 单元测试
pnpm run test

# 集成测试
pnpm run test:integration

# 构建验证
pnpm run build:check
```

### 发布到 npm

1. **登录 npm**

```bash
npm login
```

2. **发布**

```bash
# 发布到 npm registry
pnpm publish

# 发布到指定 tag
pnpm publish --tag next

# 干运行（不实际发布）
pnpm publish --dry-run
```

3. **验证发布**

```bash
# 从 npm 安装测试
cd /tmp/test-publish
pnpm init
pnpm add @cataclysm-web/core@latest

# 验证导入
node -e "const { Point } = require('@cataclysm-web/core'); console.log(new Point(1, 2));"
```

### Git 标签

发布后创建 Git 标签：

```bash
# 创建标签
git tag v$(node -p "require('./package.json').version")

# 推送标签
git push origin --tags
```

## 持续集成

### GitHub Actions

项目使用 GitHub Actions 进行 CI/CD：

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install pnpm
      uses: pnpm/action-setup@v2

    - name: Install dependencies
      run: pnpm install

    - name: Type check
      run: pnpm run type-check

    - name: Lint
      run: pnpm run lint

    - name: Test
      run: pnpm run test

    - name: Build
      run: pnpm run build
```

### 自动发布

配置 GitHub Actions 自动发布：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        registry-url: 'https://registry.npmjs.org'

    - name: Install pnpm
      uses: pnpm/action-setup@v2

    - name: Install dependencies
      run: pnpm install

    - name: Build
      run: pnpm run build

    - name: Publish to npm
      run: pnpm publish
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 监控和维护

### 错误跟踪

集成错误跟踪服务（如 Sentry）：

```typescript
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 性能监控

使用性能监控工具：

```typescript
// 添加性能标记
performance.mark('game-update-start');

// 游戏逻辑
game.update();

performance.mark('game-update-end');
performance.measure('game-update', 'game-update-start', 'game-update-end');
```

### 日志记录

实现日志记录系统：

```typescript
export class Logger {
  private level: LogLevel;

  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
```

## 故障排除

### 常见问题

#### 1. 类型错误

**问题**: TypeScript 类型检查失败

**解决方案**:
```bash
# 清理缓存
pnpm run clean

# 重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 重新构建
pnpm run build
```

#### 2. 测试失败

**问题**: 测试在 CI 环境中失败但本地通过

**解决方案**:
```bash
# 使用与 CI 相同的 Node.js 版本
nvm use 18

# 清理缓存
pnpm run clean

# 重新运行测试
pnpm run test -- --no-cache
```

#### 3. 构建错误

**问题**: 生产构建失败

**解决方案**:
```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 检查 pnpm 版本
pnpm --version  # 应该 >= 8.0.0

# 清理并重建
pnpm run clean
pnpm install
pnpm run build
```

#### 4. 数据加载失败

**问题**: Cataclysm-DDA 数据加载失败

**解决方案**:
```bash
# 检查配置文件
cat cdda.config.json

# 验证路径
ls -la /path/to/Cataclysm-DDA/data/json

# 检查文件权限
chmod -R +r /path/to/Cataclysm-DDA/data
```

### 获取帮助

如果遇到问题：

1. 查看 [故障排除文档](./TROUBLESHOOTING.md)
2. 搜索 [GitHub Issues](https://github.com/YOUR_USERNAME/cdda-ts/issues)
3. 创建新 Issue 并提供：
   - 错误信息
   - 复现步骤
   - 环境信息（Node.js 版本、操作系统等）
   - 相关日志

## 版本兼容性

### Node.js 版本

| 版本 | 支持 | 说明 |
|------|------|------|
| 18.x | ✅ | 推荐 |
| 20.x | ✅ | 推荐 |
| 16.x | ⚠️ | 维护模式 |
| 14.x | ❌ | 不支持 |

### 浏览器支持

| 浏览器 | 版本 | 支持 |
|--------|------|------|
| Chrome | 90+ | ✅ |
| Firefox | 88+ | ✅ |
| Safari | 14+ | ✅ |
| Edge | 90+ | ✅ |

---

*本文档由 Claude Code 生成，基于对 @cataclysm-web/core 代码库的深入分析。*
