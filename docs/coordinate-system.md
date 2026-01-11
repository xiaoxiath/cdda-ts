# 坐标系统文档

## 概述

Cataclysm-DDA 使用分层的坐标系统，支持多个尺度级别的坐标转换。

## 坐标层级

### 1. Map Square (地图方块)

最基本的单位，代表游戏中的一个格子。

```typescript
// 单个方块坐标
type MapSquare = point;
```

### 2. Submap (子地图)

固定大小的方块集合（12x12 = 144 个方块）。

```typescript
// 子地图常量
export const SEEX = 12;  // Submap EXtent X
export const SEEY = 12;  // Submap EXtent Y

// 子地图内坐标
type SubmapLocalCoord = point;  // (0-11, 0-11)

// 子地图全局坐标
type SubmapGlobalCoord = tripoint;  // 任意整数坐标
```

### 3. Reality Bubble (现实气泡)

玩家周围的可见区域，包含 11x11 个子地图。

```typescript
// 现实气泡常量
export const MAPSIZE = 11;  // 11x11 submaps

// 现实气泡坐标系统
type BubbleCoord = tripoint;  // 相对于气泡原点

// 现实气泡大小
export const BUBBLE_WIDTH = SEEX * MAPSIZE;  // 132 方块
export const BUBBLE_HEIGHT = SEEY * MAPSIZE; // 132 方块
```

### 4. Overmap Terrain (大地图地形)

2x2 子地图组成的区域。

```typescript
// 大地图地形坐标
type OvermapTerrainCoord = tripoint;

// 转换：子地图 → 大地图地形
function smToOm(sm: tripoint): tripoint {
  return new tripoint(
    Math.floor(sm.x / 2),
    Math.floor(sm.y / 2),
    sm.z
  );
}
```

### 5. Overmap (大地图)

180x180 个大地图地形方块。

```typescript
// 大地图常量
export const OMAPX = 180;
export const OMAPY = 180;

// 大地图坐标
type OvermapCoord = tripoint;
```

## 坐标尺度关系

```
1 Overmap = 180x180 Overmap Terrain
1 Overmap Terrain = 2x2 Submaps = 24x24 Map Squares
1 Submap = 12x12 Map Squares
```

### 转换示例

```typescript
// 从方块坐标到子地图坐标
function posToSubmap(pos: tripoint): tripoint {
  return new tripoint(
    Math.floor(pos.x / SEEX),
    Math.floor(pos.y / SEEY),
    pos.z
  );
}

// 从方块坐标到子地图内坐标
function posInSubmap(pos: tripoint): point {
  return new point(
    ((pos.x % SEEX) + SEEX) % SEEX,
    ((pos.y % SEEY) + SEEY) % SEEY
  );
}

// 从子地图坐标到大地图地形坐标
function submapToOvermapTerrain(sm: tripoint): tripoint {
  return new tripoint(
    Math.floor(sm.x / 2),
    Math.floor(sm.y / 2),
    sm.z
  );
}
```

## 实现细节

### Point 类

```typescript
export class Point {
  readonly x: number;
  readonly y: number;

  // 基础运算
  add(other: Partial<PointProps>): Point;
  subtract(other: Partial<PointProps>): Point;
  multiply(scalar: number): Point;

  // 距离计算
  manhattanDistanceTo(other: Point): number;
  euclideanDistanceTo(other: Point): number;
  chebyshevDistanceTo(other: Point): number;
}
```

### Tripoint 类

```typescript
export class Tripoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  // 3D 运算
  add(other: Partial<TripointProps>): Tripoint;
  subtract(other: Partial<TripointProps>): Tripoint;

  // 2D 投影
  xy(): Point;

  // 比较和哈希
  equals(other: Tripoint): boolean;
  hashCode(): number;
}
```

## 坐标包装器（未来实现）

为了类型安全，可以定义坐标包装器：

```typescript
// 不同尺度的坐标类型
type Point_abs_ms = Point;      // 绝对子地图坐标
type Point_bub_ms = Point;      // 现实气泡子地图坐标
type Point_om_omt = Point;      // 大地图地形坐标
type Point_abs_om = Point;      // 绝对大地图坐标

// 坐标转换
function absToBubble(pos: Point_abs_ms, center: Point_abs_ms): Point_bub_ms;
function bubbleToAbs(pos: Point_bub_ms, center: Point_abs_ms): Point_abs_ms;
```

## 使用示例

### 基本坐标运算

```typescript
// 创建坐标
const p1 = Point.from(10, 20);
const p2 = Point.from(15, 25);

// 计算距离
const dist = p1.manhattanDistanceTo(p2);  // 10

// 3D 坐标
const t1 = new Tripoint({ x: 10, y: 20, z: 0 });
const t2 = t1.add({ x: 5, y: 0, z: 1 });
// t2 = { x: 15, y: 20, z: 1 }
```

### 地图坐标转换

```typescript
// 玩家在现实气泡中的位置
const playerPos = new Tripoint({ x: 50, y: 60, z: 0 });

// 获取玩家所在的子地图
const submapPos = posToSubmap(playerPos);
// submapPos = { x: 4, y: 5, z: 0 }

// 获取子地图内的位置
const localPos = posInSubmap(playerPos);
// localPos = { x: 2, y: 0 }
```

### 地图系统中的应用

```typescript
// GameMap 使用坐标系统
class GameMap {
  getSubmapAt(sm: Tripoint): Submap | null {
    const local = this.worldToGrid(sm);
    if (!this.isValidGrid(local)) {
      return null;
    }
    return this.grid.get(`${local.x},${local.y},${local.z}`);
  }

  getTile(pos: Tripoint): MapTile | null {
    const sm = posToSubmap(pos);
    const submap = this.getSubmapAt(sm);
    if (!submap) return null;

    const localX = ((pos.x % SEEX) + SEEX) % SEEX;
    const localY = ((pos.y % SEEY) + SEEY) % SEEY;
    return submap.getTile(localX, localY);
  }
}
```

## 性能考虑

### 坐标缓存

频繁的坐标转换可能影响性能，考虑缓存：

```typescript
class CoordinateCache {
  private cache = new Map<string, Tripoint>();

  toSubmap(pos: Tripoint): Tripoint {
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, posToSubmap(pos));
    }
    return this.cache.get(key)!;
  }
}
```

### 坐标哈希

使用坐标哈希优化 Map 查找：

```typescript
function tripointHash(tp: Tripoint): string {
  return `${tp.x},${tp.y},${tp.z}`;
}

const map = new Map<string, Submap>();
map.set(tripointHash(pos), submap);
```

## 与原版 C++ 的对应

| C++ 类型 | TypeScript 类型 |
|---------|----------------|
| `point` | `Point` |
| `tripoint` | `Tripoint` |
| `point_abs_ms` | `Tripoint` (带注释) |
| `point_bub_ms` | `Tripoint` (带注释) |
| `point_om_omt` | `Tripoint` (带注释) |

## 常见问题

### Q: 为什么使用 12x12 的子地图大小？

A: 这是原版设计的选择，12 可以被 2, 3, 4, 6 整除，便于各种计算和布局。

### Q: 如何处理负坐标？

A: 使用模运算确保坐标为正：
```typescript
const localX = ((pos.x % SEEX) + SEEX) % SEEX;
```

### Q: 为什么需要这么多坐标层级？

A: 不同层级服务于不同目的：
- 方块级别：精确的交互和渲染
- 子地图级别：内存管理和加载
- 大地图级别：世界导航和生成
