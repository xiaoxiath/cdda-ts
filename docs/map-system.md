# 地图系统文档

## 概述

地图系统是 Cataclysm-DDA 的核心，管理游戏世界的空间数据。采用分层设计，从大地图到具体的方块。

## 架构层次

```
Overmap (180x180)
    ↓
Overmap Terrain (2x2 submaps)
    ↓
Submap (12x12 tiles)
    ↓
MapTile (单个方块)
```

## 核心组件

### 1. MapTile (地图瓦片)

单个方块的所有数据。

```typescript
interface MapTileProps {
  readonly terrain: number;      // 地形 ID
  readonly furniture: number;    // 家具 ID (0 表示无)
  readonly trap: number;         // 陷阱 ID (0 表示无)
  readonly radiation: number;    // 辐射值
}

export class MapTile {
  readonly terrain: number;
  readonly furniture: number;
  readonly trap: number;
  readonly radiation: number;

  // 检查是否为空
  isEmpty(): boolean;

  // 克隆
  clone(): MapTile;
}
```

### 2. MapTileSoa (Structure of Arrays)

使用 SOA 布局优化缓存性能。

```typescript
export class MapTileSoa {
  readonly terrain: Uint16Array;    // 地形 ID 数组
  readonly furniture: Uint16Array;  // 家具 ID 数组
  readonly traps: Uint16Array;      // 陷阱 ID 数组
  readonly radiation: Uint8Array;   // 辐射值数组

  constructor(size: number = SEEX * SEEY) {
    this.terrain = new Uint16Array(size);
    this.furniture = new Uint16Array(size);
    this.traps = new Uint16Array(size);
    this.radiation = new Uint8Array(size);
  }

  // 索引计算
  indexOf(x: number, y: number): number {
    return y * SEEX + x;
  }

  // 访问器
  getTerrain(x: number, y: number): number {
    return this.terrain[this.indexOf(x, y)];
  }

  setTerrain(x: number, y: number, value: number): void {
    this.terrain[this.indexOf(x, y)] = value;
  }
}
```

### 3. Submap (子地图)

12x12 方块的基本地图单元。

```typescript
export class Submap {
  readonly isUniform: boolean;
  readonly uniformTerrain: number | null;
  readonly tiles: MapTileSoa | null;

  // 统一子图优化
  constructor(isUniform: boolean, uniformTerrain?: number, tiles?: MapTileSoa) {
    this.isUniform = isUniform;
    this.uniformTerrain = isUniform ? (uniformTerrain ?? 0) : null;
    this.tiles = isUniform ? null : (tiles ?? new MapTileSoa());
  }

  // 创建统一子图
  static uniform(terrainId: number): Submap {
    return new Submap(true, terrainId);
  }

  // 创建普通子图
  static normal(): Submap {
    return new Submap(false, undefined, new MapTileSoa());
  }

  // 访问瓦片
  getTile(x: number, y: number): MapTile {
    if (this.isUniform) {
      return new MapTile({
        terrain: this.uniformTerrain!,
        furniture: 0,
        trap: 0,
        radiation: 0,
      });
    }
    const idx = y * SEEX + x;
    return new MapTile({
      terrain: this.tiles!.terrain[idx],
      furniture: this.tiles!.furniture[idx],
      trap: this.tiles!.traps[idx],
      radiation: this.tiles!.radiation[idx],
    });
  }

  // 设置地形
  setTerrain(x: number, y: number, terrainId: number): Submap {
    if (this.isUniform && terrainId === this.uniformTerrain) {
      return this;
    }
    if (this.isUniform) {
      // 从统一转为非统一
      const newTiles = new MapTileSoa();
      newTiles.terrain.fill(this.uniformTerrain!);
      newTiles.terrain[y * SEEX + x] = terrainId;
      return new Submap(false, undefined, newTiles);
    }
    const newTiles = new MapTileSoa();
    newTiles.terrain.set(this.tiles!.terrain);
    newTiles.terrain[y * SEEX + x] = terrainId;
    return new Submap(false, undefined, newTiles);
  }

  // 内存使用估算
  getMemoryUsage(): number {
    if (this.isUniform) {
      return 100; // 对象开销
    }
    return SEEX * SEEY * (2 + 2 + 2 + 1) + 200; // 数组大小 + 开销
  }
}
```

### 4. MapBuffer (Submap 缓存)

全局子地图缓存，避免重复加载。

```typescript
export class MapBuffer {
  private buffer: Map<string, Submap>;

  constructor() {
    this.buffer = new Map();
  }

  // 生成键
  private key(pos: Tripoint): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  // 获取子地图
  get(pos: Tripoint): Submap | null {
    return this.buffer.get(this.key(pos)) || null;
  }

  // 设置子地图
  set(pos: Tripoint, submap: Submap): MapBuffer {
    const newBuffer = new Map(this.buffer);
    newBuffer.set(this.key(pos), submap);
    return new MapBuffer(newBuffer);
  }

  // 检查是否存在
  has(pos: Tripoint): boolean {
    return this.buffer.has(this.key(pos));
  }

  // 获取缓存的子地图数量
  size(): number {
    return this.buffer.size;
  }

  // 内存使用
  getMemoryUsage(): number {
    let total = 200; // 基础开销
    for (const submap of this.buffer.values()) {
      total += submap.getMemoryUsage();
    }
    return total;
  }

  // 克隆
  clone(): MapBuffer {
    return new MapBuffer(new Map(this.buffer));
  }
}
```

### 5. LevelCache (层级缓存)

按 Z 轴分层的缓存系统。

```typescript
export class LevelCache {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any): LevelCache {
    const newCache = new Map(this.cache);
    newCache.set(key, value);
    return new LevelCache(newCache);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): LevelCache {
    return new LevelCache();
  }

  size(): number {
    return this.cache.size;
  }

  getMemoryUsage(): number {
    return this.cache.size * 100; // 估算
  }

  clone(): LevelCache {
    return new LevelCache(new Map(this.cache));
  }
}
```

### 6. GameMap (主地图)

管理 11x11x21 的子地图网格（现实气泡）。

```typescript
export class GameMap {
  readonly grid: Map<string, Submap | null>;
  readonly absSub: Tripoint;
  readonly caches: Map<number, LevelCache>;
  readonly mapBuffer: MapBuffer;

  // 创建空地图
  static create(): GameMap {
    return new GameMap({
      grid: GameMap.createEmptyGrid(),
      absSub: new Tripoint({ x: 0, y: 0, z: 0 }),
      caches: new Map(),
      mapBuffer: new MapBuffer(),
    });
  }

  // 获取子地图
  getSubmapAt(sm: Tripoint): Submap | null {
    const local = this.worldToGrid(sm);
    if (!this.isValidGrid(local)) {
      return null;
    }
    return this.grid.get(`${local.x},${local.y},${local.z}`) || null;
  }

  // 设置子地图
  setSubmapAt(sm: Tripoint, submap: Submap): GameMap {
    const local = this.worldToGrid(sm);
    if (!this.isValidGrid(local)) {
      return this;
    }

    const newGrid = new Map(this.grid);
    newGrid.set(`${local.x},${local.y},${local.z}`, submap);

    const newMapBuffer = this.mapBuffer.set(sm, submap);

    return new GameMap({
      ...this._props,
      grid: newGrid,
      mapBuffer: newMapBuffer,
    });
  }

  // 获取瓦片
  getTile(pos: Tripoint): MapTile | null {
    const sm = posToSubmap(pos);
    const submap = this.getSubmapAt(sm);
    if (!submap) return null;

    const localX = ((pos.x % SEEX) + SEEX) % SEEX;
    const localY = ((pos.y % SEEY) + SEEY) % SEEY;

    return submap.getTile(localX, localY);
  }

  // 设置地形
  setTerrain(pos: Tripoint, terrainId: number): GameMap {
    const sm = posToSubmap(pos);
    const submap = this.getSubmapAt(sm);
    if (!submap) return this;

    const localX = ((pos.x % SEEX) + SEEX) % SEEX;
    const localY = ((pos.y % SEEY) + SEEY) % SEEY;
    const newSubmap = submap.setTerrain(localX, localY, terrainId);

    return this.setSubmapAt(sm, newSubmap);
  }

  // 移动地图（加载新的 submaps）
  shift(dx: number, dy: number, dz: number): GameMap {
    const submapDx = Math.sign(dx) * Math.floor(Math.abs(dx) / SEEX);
    const submapDy = Math.sign(dy) * Math.floor(Math.abs(dy) / SEEY);
    const submapDz = dz;

    const newAbsSub = this.absSub.add({
      x: submapDx,
      y: submapDy,
      z: submapDz,
    });

    // 重新加载网格
    const newGrid = new Map(this.grid);
    for (let z = 0; z < OVERMAP_LAYERS; z++) {
      for (let y = 0; y < MAPSIZE; y++) {
        for (let x = 0; x < MAPSIZE; x++) {
          const worldSm = newAbsSub.add({ x, y, z });
          const submap = this.mapBuffer.get(worldSm);
          newGrid.set(`${x},${y},${z}`, submap);
        }
      }
    }

    return new GameMap({
      ...this._props,
      grid: newGrid,
      absSub: newAbsSub,
    });
  }

  // 坐标转换
  private worldToGrid(sm: Tripoint): Tripoint {
    return new Tripoint({
      x: sm.x - this.absSub.x,
      y: sm.y - this.absSub.y,
      z: sm.z - this.absSub.z,
    });
  }

  // 验证网格坐标
  private isValidGrid(pos: Tripoint): boolean {
    return (
      pos.x >= 0 && pos.x < MAPSIZE &&
      pos.y >= 0 && pos.y < MAPSIZE &&
      pos.z >= 0 && pos.z < OVERMAP_LAYERS
    );
  }

  // 内存使用
  getMemoryUsage(): number {
    let total = 0;
    for (const submap of this.grid.values()) {
      if (submap) {
        total += submap.getMemoryUsage();
      }
    }
    for (const cache of this.caches.values()) {
      total += cache.getMemoryUsage();
    }
    total += this.mapBuffer.getMemoryUsage();
    return total + 500; // 对象开销
  }

  // 已加载的子地图数量
  getLoadedSubmapCount(): number {
    let count = 0;
    for (const value of this.grid.values()) {
      if (value !== null) {
        count++;
      }
    }
    return count;
  }
}
```

## 性能优化

### 1. 统一子图优化

纯地形子图使用单个 terrain ID：

```typescript
// 空旷区域的子图（如草地）
const grassSubmap = Submap.uniform(TERRAIN_GRASS);

// 内存使用：~100 字节 vs ~5000 字节
```

### 2. SOA 数据布局

使用 TypedArray 提高缓存效率：

```typescript
// AOS (Array of Structures) - 缓存不友好
interface TileAOS {
  terrain: number;
  furniture: number;
  trap: number;
}

// SOA (Structure of Arrays) - 缓存友好
class TileSOA {
  terrain: Uint16Array;  // 连续内存
  furniture: Uint16Array;
  trap: Uint16Array;
}
```

### 3. 延迟加载

只加载玩家周围的子地图：

```typescript
// 玩家移动时加载新区域
function updateMap(playerPos: Tripoint): GameMap {
  const currentSm = posToSubmap(playerPos);
  const centerSm = map.absSub;

  // 如果移动到新的子图块
  if (currentSm.x !== centerSm.x || currentSm.y !== centerSm.y) {
    const dx = currentSm.x - centerSm.x;
    const dy = currentSm.y - centerSm.y;
    return map.shift(dx, dy, 0);
  }

  return map;
}
```

## 内存估算

```
单个统一子图：~100 字节
单个普通子图：~5 KB (12x12 x 4 属性)
现实气泡（满载）：11x11x21 x 5 KB = ~12.6 MB
MapBuffer（1000 个子图）：~5 MB
```

## 使用示例

### 创建和操作地图

```typescript
// 创建空地图
const map = GameMap.create();

// 设置地形
const pos = new Tripoint({ x: 10, y: 20, z: 0 });
const mapWithTerrain = map.setTerrain(pos, TERRAIN_FLOOR);

// 获取地形
const tile = mapWithTerrain.getTile(pos);
console.log(tile?.terrain);  // 地形 ID

// 移动地图
const shiftedMap = map.shift(12, 0, 0);  // 向东移动一个子图
```

### 地图生成

```typescript
// 生成草地区域
function generateGrassArea(map: GameMap, start: Tripoint, size: number): GameMap {
  let result = map;
  for (let z = 0; z < OVERMAP_LAYERS; z++) {
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const sm = new Tripoint({
          x: start.x + dx,
          y: start.y + dy,
          z: start.z + z,
        });
        const submap = Submap.uniform(TERRAIN_GRASS);
        result = result.setSubmapAt(sm, submap);
      }
    }
  }
  return result;
}
```

## 与原版 C++ 的对应

| C++ 类型 | TypeScript 类型 |
|---------|----------------|
| `maptile_soa` | `MapTileSoa` |
| `submap` | `Submap` |
| `map` | `GameMap` |
| `level_cache` | `LevelCache` |

## 未来扩展

### 1. 家具和物品

```typescript
class MapTile {
  readonly furniture: number;
  readonly items: ImmutableList<Item>;  // 未来添加
}
```

### 2. 场地效果

```typescript
class MapTile {
  readonly field: Field;  // 未来添加
}
```

### 3. 车辆

```typescript
class Submap {
  readonly vehicles: ImmutableList<Vehicle>;  // 未来添加
}
```
