# Cataclysm-DDA TypeScript 复刻项目

这是一个用 TypeScript 复刻 Cataclysm: Dark Days Ahead 的项目，支持 CLI 和 Web 界面。

## 项目结构

```
game/
├── packages/
│   ├── core/              # 核心游戏逻辑
│   ├── data-loader/       # 数据加载器
│   ├── ui-cli/            # CLI 界面（待实现）
│   └── ui-graphics/       # Web 界面（待实现）
├── Cataclysm-DDA/         # 原版 C++ 源码（参考）
├── docs/                  # 项目文档
└── package.json
```

## 当前状态

- ✅ **packages/core** - 已实现核心数据结构
  - ✅ 坐标系统 (Point, Tripoint)
  - ✅ 地形系统 (Terrain)
  - ✅ 家具系统 (Furniture)
  - ✅ 场地效果系统 (Field)
  - ✅ 陷阱系统 (Trap)
  - ✅ 地图系统 (GameMap, Submap, MapTile)

## 开发计划

### 第一阶段：CLI 界面 (当前)

1. **地形地图系统**
   - 地图加载和渲染
   - 地形交互
   - 地图记忆

2. **角色属性系统**
   - 角色属性
   - 身体部位
   - 技能系统
   - 效果系统

3. **基础游戏循环**
   - 输入处理
   - 时间推进
   - 生物更新

### 第二阶段：Web 界面

- React 前端
- WebGL 渲染
- 多人支持

## 技术栈

- **语言**: TypeScript 5.3+
- **包管理**: pnpm
- **构建工具**: Vite
- **测试框架**: Vitest
- **数据不可变**: Immutable.js
- **响应式**: RxJS

## 开发指南

详见 [docs/](./docs/) 目录：
- [架构文档](./docs/architecture.md)
- [坐标系统](./docs/coordinate-system.md)
- [地图系统](./docs/map-system.md)
- [角色系统](./docs/character-system.md)
- [测试指南](./docs/testing.md)

## 贡献指南

本项目使用 Cataclysm-DDA 的游戏数据和 UI 资源，不做任何调整。

## 许可证

待定
