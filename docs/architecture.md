# 架构文档

## 目录

1. [项目概述](#1-项目概述)
2. [架构设计原则](#2-架构设计原则)
3. [核心模块](#3-核心模块)
4. [数据流](#4-数据流)
5. [性能优化](#5-性能优化)
6. [与原版 C++ 的映射关系](#6-与原版-c-的映射关系)

## 1. 项目概述

### 1.1 目标

用 TypeScript 复刻 Cataclysm-DDA 的核心游戏机制，保持与原版的数据和 UI 兼容性。

### 1.2 技术栈

- **语言**: TypeScript 5.3+ (严格模式)
- **包管理**: pnpm workspace
- **构建工具**: Vite
- **测试**: Vitest + Coverage
- **核心库**:
  - `immutable` - 不可变数据结构
  - `rxjs` - 响应式编程

### 1.3 包结构

```
packages/
├── core/           # 核心游戏逻辑（已实现）
│   ├── src/
│   │   ├── coordinates/   # 坐标系统
│   │   ├── terrain/       # 地形系统
│   │   ├── furniture/     # 家具系统
│   │   ├── field/         # 场地效果
│   │   ├── trap/          # 陷阱系统
│   │   ├── map/           # 地图系统
│   │   └── types/         # 通用类型
│   └── package.json
├── data-loader/    # 数据加载器（已实现）
├── ui-cli/         # CLI 界面（待实现）
└── ui-graphics/    # Web 界面（待实现）
```

## 2. 架构设计原则

### 2.1 不可变数据

所有核心数据结构使用 Immutable.js 或自定义的不可变类：

```typescript
// ✅ 正确：返回新实例
const newPoint = point.add({ x: 1, y: 0 });

// ❌ 错误：直接修改
point.x += 1;
```

### 2.2 类型安全

利用 TypeScript 的类型系统确保数据正确性：

```typescript
// 不同尺度的坐标是不同的类型
type SubmapCoordinate = Tripoint;
type OvermapCoordinate = Tripoint;

// 编译时检查坐标转换
const overmapPos: OvermapCoordinate = toOvermap(submapPos);
```

### 2.3 数据驱动

所有游戏数据从 JSON 文件加载，代码中硬编码最少：

```typescript
// 从 JSON 加载地形定义
const terrainData = await TerrainLoader.load('data/json/terrain.json');
```

### 2.4 测试驱动

所有核心逻辑必须有单元测试：

```typescript
describe('GameMap', () => {
  it('should set and get terrain', () => {
    const map = new GameMap();
    const pos = new Tripoint({ x: 0, y: 0, z: 0 });
    const newMap = map.setTerrain(pos, 100);
    expect(newMap.getTerrain(pos)).toBe(100);
  });
});
```

## 3. 核心模块

### 3.1 坐标系统 (packages/core/src/coordinates/)

**对应原版文件**:
- `src/point.h`
- `src/coordinates.h`
- `src/coordinate_conversions.h`

**核心类**:
- `Point` - 2D 点
- `Tripoint` - 3D 点
- 坐标转换函数

**关键设计**:
- 不可变对象
- 支持欧几里得距离、曼哈顿距离、切比雪夫距离
- 坐标标准化（submap 尺度：SEEX x SEEY = 12x12）

```typescript
// 地图层级常量
export const SEEX = 12;  // Submap EXtent X
export const SEEY = 12;  // Submap EXtent Y
export const MAPSIZE = 11;  // 现实气泡大小（11x11 submaps）
export const OVERMAP_LAYERS = 21;  // 总层数
```

### 3.2 地图系统 (packages/core/src/map/)

**对应原版文件**:
- `src/map.h`
- `src/submap.h`
- `src/map_memory.h`
- `src/overmap.h`

**核心类**:
- `GameMap` - 主地图（11x11x21 submaps）
- `Submap` - 子地图（12x12 tiles）
- `MapTile` - 单个瓦片
- `MapBuffer` - Submap 缓存
- `LevelCache` - 层级缓存

**数据布局**:
```typescript
// SOA (Structure of Arrays) 优化
interface MapTileSoa {
  readonly terrain: Uint16Array;      // 地形 ID
  readonly furniture: Uint16Array;    // 家具 ID
  readonly traps: Uint16Array;        // 陷阱 ID
  readonly radiation: Uint8Array;     // 辐射值
}
```

**性能优化**:
- 统一子图优化：纯地形子图使用单个 ID 而非数组
- 懒加载：只加载玩家周围的 submap
- 缓存机制：LRU 缓存最近访问的 submap

### 3.3 地形系统 (packages/core/src/terrain/)

**对应原版文件**:
- `src/mapdata.h`
- `data/json/furniture_and_terrain/*.json`

**核心类**:
- `Terrain` - 地形定义
- `TerrainData` - 地形数据容器
- `TerrainLoader` - JSON 加载器
- `TerrainFlags` - 地形标志集合

**地形标志**:
```typescript
export enum TerrainFlag {
  TRANSPARENT,   // 透明（光线可穿透）
  FLAMMABLE,     // 可燃
  FLAT,          // 平坦（无移动惩罚）
  LIQUID,        // 液体
  WALL,          // 墙
  INDOORS,       // 室内
  // ...
}
```

### 3.4 家具系统 (packages/core/src/furniture/)

**对应原版文件**:
- `src/furniture.h`
- `data/json/furniture_and_terrain/*.json`

**核心类**:
- `Furniture` - 家具定义
- `FurnitureData` - 家具数据容器
- `FurnitureLoader` - JSON 加载器

**家具属性**:
- `coverage` - 覆盖率（影响被击中概率）
- `comfort` - 舒适度（影响休息质量）
- `required_str` - 需要的力量（用于移动家具）

### 3.5 场地效果系统 (packages/core/src/field/)

**对应原版文件**:
- `src/field.h`
- `src/field_type.h`
- `data/json/field_type.json`

**核心类**:
- `Field` - 场地效果容器
- `FieldEntry` - 单个场地效果实例
- `FieldType` - 场地类型定义

**场地类型**:
- `fd_blood` - 血液
- `fd_fire` - 火焰
- `fd_smoke` - 烟雾
- `fd_acid` - 酸液

**关键机制**:
- 强度等级（1-3）
- 衰减（half_life）
- 扩散（percent_spread）
- 效果触发（on_tick）

### 3.6 陷阱系统 (packages/core/src/trap/)

**对应原版文件**:
- `src/trap.h`
- `data/json/traps.json`

**核心类**:
- `Trap` - 陷阱定义
- `TrapData` - 陷阱数据容器
- `TrapLoader` - JSON 加载器

**陷阱属性**:
- `visibility` - 可见性（0-5，越低越难发现）
- `avoidance` - 躲避难度
- `difficulty` - 拆除难度
- `benign` - 是否无害

## 4. 数据流

### 4.1 游戏循环

```
┌─────────────────────────────────────┐
│           用户输入                   │
│    (键盘、鼠标、触摸)                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│        InputContext                 │
│    将输入转换为 action_id            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Game::execute_action        │
│    执行玩家/生物动作                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Game::process_turn          │
│    ┌───────────────────────────┐    │
│    │ 1. 更新生物              │    │
│    │ 2. 更新场地效果          │    │
│    │ 3. 更新 NPC              │    │
│    │ 4. 更新怪物              │    │
│    │ 5. 推进时间              │    │
│    └───────────────────────────┘    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│          渲染系统                    │
│    ┌───────────────────────────┐    │
│    │ 1. 计算视野              │    │
│    │ 2. 更新光照              │    │
│    │ 3. 绘制地图              │    │
│    │ 4. 绘制 UI               │    │
│    └───────────────────────────┘    │
└─────────────────────────────────────┘
```

### 4.2 坐标转换

```typescript
// 绝对子图坐标 → 相对子图坐标
function worldToGrid(worldPos: Tripoint, absSub: Tripoint): Tripoint {
  return new Tripoint({
    x: worldPos.x - absSub.x,
    y: worldPos.y - absSub.y,
    z: worldPos.z - absSub.z,
  });
}

// 方块坐标 → 子图坐标
function posToSubmap(pos: Tripoint): Tripoint {
  return new Tripoint({
    x: Math.floor(pos.x / SEEX),
    y: Math.floor(pos.y / SEEY),
    z: pos.z,
  });
}

// 子图坐标 → 大地图坐标
function smToOm(sm: Tripoint): Tripoint {
  return new Tripoint({
    x: Math.floor(sm.x / 2),
    y: Math.floor(sm.y / 2),
    z: sm.z,
  });
}
```

### 4.3 数据加载流程

```
Cataclysm-DDA/data/json/
│
├── terrain/*.json
│   ↓ (TerrainLoader)
├── furniture/*.json
│   ↓ (FurnitureLoader)
├── traps.json
│   ↓ (TrapLoader)
├── field_type.json
│   ↓ (FieldTypeLoader)
└── ...
    ↓
┌─────────────────────┐
│  DataLoader         │
│  批量加载所有数据   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  GameData           │
│  统一数据容器       │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Game               │
│  使用数据运行游戏   │
└─────────────────────┘
```

## 5. 性能优化

### 5.1 不可变数据优化

使用 Object.freeze 和属性描述符确保不可变性，同时保持性能：

```typescript
class GameMap {
  private readonly _props: GameMapProps;

  constructor(props: GameMapProps) {
    this._props = props;

    Object.defineProperty(this, 'grid', {
      get: () => this._props.grid,
      enumerable: true,
    });

    Object.freeze(this);
  }
}
```

### 5.2 内存优化

**Submap 统一优化**:
```typescript
// 纯地形子图使用单个 terrain ID
class Submap {
  readonly isUniform: boolean;
  readonly uniformTerrain: number | null;  // 统一时使用
  readonly tiles: MapTileSoa | null;       // 不统一时使用
}
```

**缓存策略**:
- LRU 缓存最近访问的 submap
- 按需加载玩家周围的 submap
- 卸载远离玩家的 submap

### 5.3 性能监控

```typescript
class GameMap {
  getMemoryUsage(): number {
    let total = 0;

    for (const submap of this.grid.values()) {
      if (submap) {
        total += submap.getMemoryUsage();
      }
    }

    return total;
  }

  getLoadedSubmapCount(): number {
    // 返回已加载的 submap 数量
  }
}
```

## 6. 与原版 C++ 的映射关系

### 6.1 核心类型映射

| C++ 类型 | TypeScript 类型 | 说明 |
|---------|----------------|------|
| `point` | `Point` | 2D 点 |
| `tripoint` | `Tripoint` | 3D 点 |
| `submap` | `Submap` | 子地图 |
| `map` | `GameMap` | 主地图 |
| `ter_id` | `number` (TerrainId) | 地形 ID |
| `furn_id` | `number` (FurnitureId) | 家具 ID |
| `trap_id` | `number` (TrapId) | 陷阱 ID |

### 6.2 常量映射

```cpp
// C++ (game_constants.h)
constexpr int SEEX = 12;
constexpr int SEEY = 12;
constexpr int MAPSIZE = 11;
constexpr int OVERMAP_LAYERS = 21;
```

```typescript
// TypeScript
export const SEEX = 12;
export const SEEY = 12;
export const MAPSIZE = 11;
export const OVERMAP_LAYERS = 21;
```

### 6.3 数据结构映射

**C++ Submap**:
```cpp
struct maptile_soa {
    cata::mdarray<ter_id, point_sm_ms>      ter;
    cata::mdarray<furn_id, point_sm_ms>     frn;
    cata::mdarray<colony<item>, point_sm_ms> itm;
    cata::mdarray<field, point_sm_ms>        fld;
    // ...
};
```

**TypeScript MapTileSoa**:
```typescript
export class MapTileSoa {
  readonly terrain: Uint16Array;
  readonly furniture: Uint16Array;
  readonly traps: Uint16Array;
  readonly radiation: Uint8Array;
}
```

### 6.4 JSON 数据格式

完全兼容原版 JSON 格式，无需修改：

```json
{
  "type": "terrain",
  "id": "t_thconc_floor",
  "name": "concrete floor",
  "symbol": ".",
  "color": "cyan",
  "move_cost": 2,
  "flags": ["TRANSPARENT", "FLAT"]
}
```

## 7. 下一步开发

### 7.1 角色系统（待实现）

- [ ] Character 类
- [ ] 身体部位系统
- [ ] 属性系统（str, dex, int, per）
- [ ] 技能系统
- [ ] 效果系统
- [ ] 装备和物品系统

### 7.2 CLI 界面（待实现）

- [ ] 终端渲染器
- [ ] 输入处理
- [ ] UI 布局
- [ ] 调试工具面板

### 7.3 游戏循环（待实现）

- [ ] 主循环
- [ ] 生物更新
- [ ] 场地效果更新
- [ ] 时间系统

## 参考文档

- [Cataclysm-DDA 源码](../Cataclysm-DDA/)
- [Cataclysm-DDA 文档](../Cataclysm-DDA/doc/)
- [坐标系统文档](./coordinate-system.md)
- [地图系统文档](./map-system.md)
