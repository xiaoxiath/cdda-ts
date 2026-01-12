# @cataclysm-web/core - 架构设计文档

## 概述

`@cataclysm-web/core` 是 Cataclysm-DDA 的 TypeScript 重写核心库，采用现代前端技术栈实现，旨在提供类型安全、高性能、可维护的游戏引擎。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.3+ | 主要开发语言 |
| Immutable.js | 5.0 | 不可变数据结构 |
| RxJS | 7.8 | 响应式编程 |
| Vitest | 1.2 | 单元测试框架 |

## 架构原则

### 1. 不可变性优先

所有核心数据结构都使用 Immutable.js Record 或 TypeScript readonly 实现：

```typescript
import { Record } from 'immutable';

export interface TerrainProps {
  id: TerrainId;
  name: string;
  moveCost: number;
  flags: Set<TerrainFlag>;
}

export class Terrain extends Record<TerrainProps> {
  // 所有操作返回新实例
  setFlag(flag: TerrainFlag): Terrain {
    return this.set('flags', this.flags.add(flag));
  }
}
```

**优势：**
- 防止意外修改
- 简化状态管理
- 便于时间旅行调试
- 优化渲染性能

### 2. 类型安全

充分利用 TypeScript 类型系统：

```typescript
// 使用 branded types 实现类型安全ID
export type TerrainId = string & { readonly __brand: unique symbol };
export type FurnitureId = string & { readonly __brand: unique symbol };

// 类型安全的枚举
export enum BodyPartId {
  TORSO = 'torso',
  HEAD = 'head',
  ARM_L = 'arm_l',
  ARM_R = 'arm_r',
  // ...
}

// 严格类型检查
export interface Creature {
  getHP(part: BodyPartId): number;
  takeDamage(part: BodyPartId, amount: number): Creature;
}
```

### 3. 模块化设计

每个模块职责单一，依赖清晰：

```
packages/core/src/
├── coordinates/     # 坐标系统（无依赖）
├── terrain/         # 地形系统（依赖 coordinates）
├── furniture/       # 家具系统（依赖 coordinates）
├── field/           # 场系统（依赖 coordinates）
├── trap/            # 陷阱系统（依赖 coordinates）
├── creature/        # 生物系统（依赖以上所有）
├── map/             # 地图系统（依赖所有基础模块）
├── mapgen/          # 地图生成（依赖 map）
├── game/            # 游戏循环（依赖所有模块）
└── config/          # 配置管理（独立模块）
```

### 4. 数据驱动

所有游戏数据从 JSON 加载，与 Cataclysm-DDA 格式兼容：

```typescript
export class TerrainLoader {
  load(data: JsonObject[]): Map<TerrainId, Terrain> {
    return data.reduce((map, obj) => {
      const terrain = this.parseObject(obj);
      return map.set(terrain.id, terrain);
    }, new Map<TerrainId, Terrain>());
  }
}
```

### 5. 测试优先

每个模块都有完整的测试覆盖：

```typescript
describe('Terrain', () => {
  it('should parse terrain flags correctly', () => {
    const terrain = TerrainLoader.parseObject({
      id: 't_dirt',
      flags: ['FLAMMABLE', 'DIGGABLE']
    });
    expect(terrain.flags.has(TerrainFlag.FLAMMABLE)).toBe(true);
  });
});
```

## 核心系统架构

### 坐标系统

```
Point (2D坐标)
├── x: number
├── y: number
├── add(): Point
├── distanceTo(): number
└── neighbors(): Point[]

Tripoint (3D坐标)
├── extends Point
├── z: number
└── canGoDown(): boolean

CoordinateConverter
├── globalToBubble(): Tripoint
├── bubbleToLocal(): Tripoint
└── submapToGlobal(): Tripoint
```

### 游戏实体层次

```
Game
├── GameState (游戏状态)
│   ├── player: Avatar
│   ├── map: GameMap
│   ├── turn: number
│   └── messages: string[]
│
└── GameLoop (游戏循环)
    ├── update()
    ├── render()
    └── handleInput()

Creature (生物)
├── Character (角色)
│   ├── Avatar (玩家)
│   └── NPC (非玩家)
└── Monster (怪物) - 待实现
```

### 地图系统架构

```
GameMap (11x11 Submaps)
├── Submap[][]
│   ├── MapTileSoA (SOA数据布局)
│   │   ├── ter: Int16Array    # 地形
│   │   ├── frn: Int16Array    # 家具
│   │   ├── fld: FieldEntry[]  # 场
│   │   └── trp: Int16Array    # 陷阱
│   └── uniform: boolean       # 是否为空白地图
│
├── LevelCache (层级缓存)
│   ├── transparency: Uint8Array
│   └── visible: Uint8Array
│
└── MapBuffer (地图缓冲)
    └── submaps: Map<string, Submap>
```

### 地图生成系统

```
CataclysmMapGenGenerator (生成器)
├── PaletteResolver (调色板解析)
│   └── resolve(): Palette
│
├── MapGenFunction[] (生成函数)
│   ├── setmap
│   ├── add Furniture
│   ├── addField
│   ├── addTrap
│   ├── placeItem
│   └── placeMonster
│
└── generate(): GeneratedSubmap[]
    ├── 2x2 子地图
    ├── 2x4 子地图
    └── 4x2 子地图
```

## 数据流设计

### 游戏主循环

```
┌─────────────────────────────────────────────────────────────┐
│                       GameLoop                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Input   │ -> │  Update  │ -> │  Render  │              │
│  │          │    │          │    │          │              │
│  │ handle   │    │ process  │    │ draw    │              │
│  │ input()  │    │ turn()   │    │ map()   │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│       ^                                 │                    │
│       └─────────────────────────────────┘                    │
│                   60 FPS / 30 FPS                            │
└─────────────────────────────────────────────────────────────┘
```

### 状态更新流程

```
User Action
    ↓
GameLoop.handleInput()
    ↓
GameState.processAction()
    ↓
Entity.update() (不可变更新)
    ↓
new GameState
    ↓
GameLoop.render()
```

### 地图加载流程

```
JSON Data
    ↓
Loader.load()
    ↓
Parser.parse()
    ↓
DataStore.insert()
    ↓
GameMap.setTile()
    ↓
Render
```

## 性能优化策略

### 1. SOA 数据布局

```typescript
export class MapTileSoA {
  ter: Int16Array = new Int16Array(SUBMAP_SIZE * SUBMAP_SIZE);
  frn: Int16Array = new Int16Array(SUBMAP_SIZE * SUBMAP_SIZE);
  fld: Array<FieldEntry | null> = new Array(SUBMAP_SIZE * SUBMAP_SIZE);
  trp: Int16Array = new Int16Array(SUBMAP_SIZE * SUBMAP_SIZE);
}
```

**优势：**
- 缓存友好
- SIMD 优化潜力
- 内存访问局部性

### 2. Uniform Submap 优化

```typescript
export class Submap {
  private soa: MapTileSoA | null = null;
  public uniformTer: TerrainId = 't_null';

  isUniform(): boolean {
    return this.soa === null;
  }
}
```

**优势：**
- 空白区域只存储一个 ID
- 延迟分配完整数据
- 大幅节省内存

### 3. 层级缓存

```typescript
export class LevelCache {
  private transparency: Uint8Array | null = null;
  private visible: Uint8Array | null = null;

  invalidate(): void {
    this.transparency = null;
    this.visible = null;
  }
}
```

### 4. 懒加载

```typescript
export class GameMap {
  private submaps: Map<string, Submap> = new Map();

  getSubmap(pos: Tripoint): Submap {
    const key = this.posToKey(pos);
    let sm = this.submaps.get(key);
    if (!sm) {
      sm = this.loadSubmap(pos);
      this.submaps.set(key, sm);
    }
    return sm;
  }
}
```

## 扩展点设计

### 添加新的地形类型

```typescript
// 1. 定义新的地形标志
export enum TerrainFlag {
  // 现有标志...
  MY_NEW_FLAG = 'MY_NEW_FLAG',
}

// 2. 在 JSON 中定义
{
  "id": "t_my_terrain",
  "name": "My Terrain",
  "flags": ["MY_NEW_FLAG"]
}

// 3. 实现相关逻辑
export function canEnterMyTerrain(terrain: Terrain): boolean {
  return terrain.flags.has(TerrainFlag.MY_NEW_FLAG);
}
```

### 添加新的场类型

```typescript
// 1. 定义场类型
export const MY_FIELD_TYPE: FieldType = {
  id: 'fd_my_field',
  // ...
};

// 2. 注册到加载器
FieldTypeLoader.register(MY_FIELD_TYPE);

// 3. 实现场效果
export function processMyField(field: FieldEntry, creature: Creature): void {
  // 实现场逻辑
}
```

## 与 Cataclysm-DDA 的兼容性

### 数据格式兼容

```typescript
// Cataclysm-DDA JSON
{
  "type": "terrain",
  "id": "t_dirt",
  "name": "dirt",
  "symbol": ".",
  "color": "brown",
  "flags": ["FLAMMABLE", "DIGGABLE"]
}

// TypeScript 解析器
export class TerrainParser {
  static parse(json: JsonObject): Terrain {
    return new Terrain({
      id: TerrainId.create(json.id),
      name: json.name,
      symbol: json.symbol,
      color: Color.fromName(json.color),
      flags: new Set(json.flags.map(TerrainFlag.parse))
    });
  }
}
```

### 逻辑兼容

游戏逻辑尽量与 Cataclysm-DDA 保持一致：

```typescript
// 移动消耗计算
export function getMoveCost(creature: Creature, terrain: Terrain): number {
  const baseCost = terrain.moveCost;
  const encumbrance = creature.getEncumbrance();
  return baseCost * (1 + encumbrance / 100);
}
```

## 测试策略

### 单元测试

每个公共 API 都有测试覆盖：

```typescript
describe('Point', () => {
  describe('add', () => {
    it('should add two points correctly', () => {
      const p1 = new Point(1, 2);
      const p2 = new Point(3, 4);
      expect(p1.add(p2)).toEqual(new Point(4, 6));
    });
  });
});
```

### 集成测试

测试多个模块的协作：

```typescript
describe('GameLoop', () => {
  it('should process player movement', () => {
    const game = new Game();
    game.handleInput({ type: InputAction.Move, direction: Direction.North });
    expect(game.state.player.pos).toEqual(new Point(0, -1));
  });
});
```

### 真实数据测试

使用 Cataclysm-DDA 的真实 JSON 数据测试：

```typescript
describe('TerrainLoader', () => {
  it('should load real CDDA terrain data', () => {
    const data = loadJsonFile('./test-data/cdda-terrain.json');
    const terrains = TerrainLoader.load(data);
    expect(terrains.size).toBeGreaterThan(1000);
  });
});
```

## 构建和部署

### 构建流程

```bash
# 1. 安装依赖
pnpm install

# 2. 类型检查
pnpm run type-check

# 3. 运行测试
pnpm run test

# 4. 构建
pnpm run build

# 5. 生成文档
pnpm run docs
```

### 发布流程

```bash
# 1. 更新版本
npm version [major|minor|patch]

# 2. 构建
pnpm run build

# 3. 发布
npm publish --access public
```

## 最佳实践

### 1. 代码组织

```typescript
// 导入顺序
// 1. Node.js 内置模块
import { promises } from 'fs';

// 2. 第三方库
import { Record } from 'immutable';

// 3. 项目内部模块
import { Point } from './coordinates';

// 4. 类型导入
import type { TerrainProps } from './types';
```

### 2. 错误处理

```typescript
export class GameError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}

// 使用
export function loadTerrain(id: TerrainId): Terrain {
  const terrain = terrains.get(id);
  if (!terrain) {
    throw new GameError(
      `Terrain not found: ${id}`,
      ErrorCode.TERRAIN_NOT_FOUND,
      { id }
    );
  }
  return terrain;
}
```

### 3. 日志记录

```typescript
export class Logger {
  private static instance: Logger;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
```

## 未来展望

### 短期目标（3个月）

- [ ] 完成物品系统
- [ ] 完成战斗系统
- [ ] 完成技能系统

### 中期目标（6个月）

- [ ] 完成制作系统
- [ ] 完成 NPC AI
- [ ] 完成 UI 系统

### 长期目标（12个月）

- [ ] 完成车辆系统
- [ ] 完成天气系统
- [ ] 完成任务系统
- [ ] 多人游戏支持

---

*本文档由 Claude Code 生成，基于对 @cataclysm-web/core 代码库的深入分析。*
