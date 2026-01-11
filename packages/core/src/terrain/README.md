# 地形系统使用指南

## 概述

地形系统是 Cataclysm-DDA Web 版本的核心组件，提供了完整的地形定义、加载和查询功能。

## 基本使用

### 1. 加载地形数据

```typescript
import { TerrainLoader } from '@cataclym-web/core';

const loader = new TerrainLoader();

// 从 JSON 数组加载
const terrains = [
  {
    type: 'terrain',
    id: 't_dirt',
    name: 'dirt',
    description: 'It\'s dirt.',
    symbol: '.',
    color: 'brown',
    move_cost: 2,
    flags: ['TRANSPARENT', 'FLAT', 'DIGGABLE'],
  },
];

const data = await loader.loadFromJson(terrains);
console.log(`Loaded ${data.size()} terrains`);
```

### 2. 从 URL 加载

```typescript
// 单个文件
const data = await loader.loadFromUrl('/data/terrain-floor.json');

// 多个文件
const urls = [
  '/data/terrain-floor.json',
  '/data/terrain-wall.json',
  '/data/terrain-nature.json',
];

const data = await loader.loadFromUrls(urls);
```

### 3. 查询地形

```typescript
// 按 ID 查找
const terrain = data.get(terrainId);

// 按名称查找
const dirt = data.findByName('dirt');
const wall = data.findByName('wooden wall');

// 按符号查找
const allDots = data.findBySymbol('.');

// 获取所有地形
const all = data.getAll();
```

### 4. 检查地形属性

```typescript
const terrain = data.findByName('dirt');

// 透明度
if (terrain.isTransparent()) {
  console.log('Light can pass through');
}

// 可通行性
if (terrain.isPassable()) {
  console.log('Can walk here');
}

// 可破坏性
if (terrain.isBashable()) {
  const difficulty = terrain.getBashDifficulty();
  console.log(`Can bash, difficulty: ${difficulty}`);
}

// 可建造性
if (terrain.canBuildOn()) {
  console.log('Can build furniture here');
}

// 危险性
if (terrain.isDangerous()) {
  console.log('Warning: dangerous terrain!');
}
```

## 地形属性

### 基础属性

```typescript
const terrain = new Terrain({
  id: 1,                    // 唯一 ID
  name: 'dirt',             // 名称
  description: '...',       // 描述
  symbol: '.',              // 显示符号
  color: 'brown',           // 颜色
  moveCost: 2,              // 移动消耗
  coverage: 0,              // 覆盖率
});
```

### 地形标志 (Flags)

```typescript
import { TerrainFlags, TerrainFlag } from '@cataclym-web/core';

const flags = new TerrainFlags([
  TerrainFlag.TRANSPARENT,  // 透明
  TerrainFlag.FLAT,         // 平坦
  TerrainFlag.DIGGABLE,     // 可挖掘
  TerrainFlag.LIQUID,       // 液体
  TerrainFlag.WALL,         // 墙
  TerrainFlag.DOOR,         // 门
  TerrainFlag.WINDOW,       // 窗
  TerrainFlag.INDOORS,      // 室内
  TerrainFlag.FLAMMABLE,    // 易燃
  // ... 更多标志
]);
```

### 破坏信息

```typescript
const terrain = new Terrain({
  bash: {
    sound: 'crash',           // 音效
    strMin: 20,               // 最小力量
    strMax: 40,               // 最大力量
    furniture: ['f_wooden_support'], // 生成家具
    items: [                  // 生成物品
      { item: '2x4', count: [2, 4] },
      { item: 'nail', count: [4, 8] },
    ],
    ter: 123,                 // 变成的地形 ID
    successMsg: 'You smash it!',
    failMsg: 'You fail to smash it.',
  },
});
```

### 拆解信息

```typescript
const terrain = new Terrain({
  deconstruct: {
    furniture: 'f_wooden_support',
    items: [
      { item: '2x4', count: [2, 3] },
    ],
    ter: 456,           // 变成的地形 ID
    time: 100,          // 所需时间（回合）
    simple: false,      // 是否简单拆解
  },
});
```

### 连接组

```typescript
const terrain = new Terrain({
  // 单个连接组
  connectGroups: Map([['WALL', true]]),

  // 多个连接组
  connectGroups: Map([
    ['WALL', true],
    ['WOOD', true],
  ]),

  // 连接到其他组
  connectsTo: Map([
    ['WALL', true],
    ['WOOD', true],
    ['FLOOR', true],
  ]),
});
```

## 高级功能

### 1. 过滤地形

```typescript
// 按标志过滤
const walls = data.filterByFlag('WALL');
const transparent = data.filterByFlag('TRANSPARENT');

// 预定义过滤器
const flat = data.getFlatTerrains();
const walls = data.getWalls();
const doors = data.getDoors();
```

### 2. 地形转换

```typescript
// 门的开/关
const door = data.findByName('closed door');
if (door?.canOpen()) {
  const openDoorId = door.open;
  const openDoor = data.get(openDoorId);
  // 使用 openDoor...
}

// 破坏后转换
if (wall?.bash?.ter) {
  const afterBash = data.get(wall.bash.ter);
  // 使用 afterBash...
}
```

### 3. 显示信息

```typescript
const terrain = data.findByName('dirt');
const display = terrain.getDisplayInfo();

console.log(`Symbol: ${display.symbol}`);    // '.'
console.log(`Color: ${display.color}`);      // 'brown'
console.log(`Name: ${display.name}`);        // 'dirt'

// 在 UI 中使用
renderTile(display.symbol, display.color);
```

### 4. 移动计算

```typescript
const terrain = data.getTileAt(playerPos);
const moveCost = terrain.getMoveCost();

if (moveCost === 0) {
  console.log('Cannot move here!');
} else if (moveCost > 2) {
  console.log('Difficult terrain');
  player.stamina -= moveCost;
}
```

## 游戏机制集成

### 移动系统

```typescript
function canMoveTo(from: Tripoint, to: Tripoint): boolean {
  const terrain = map.getTile(to);
  return terrain?.isPassable() ?? false;
}

function getMoveCost(to: Tripoint): number {
  const terrain = map.getTile(to);
  return terrain?.getMoveCost() ?? 0;
}
```

### 建造系统

```typescript
function canBuildAt(pos: Tripoint): boolean {
  const terrain = map.getTile(pos);
  return terrain?.canBuildOn() ?? false;
}

function placeFurniture(pos: Tripoint, furniture: Furniture) {
  if (!canBuildAt(pos)) {
    throw new Error('Cannot build here');
  }
  map.setFurniture(pos, furniture);
}
```

### 破坏系统

```typescript
function bashTerrain(player: Player, pos: Tripoint) {
  const terrain = map.getTile(pos);

  if (!terrain?.isBashable()) {
    showMessage('You cannot bash this');
    return;
  }

  const difficulty = terrain.getBashDifficulty();
  const strength = player.getStrength();

  if (strength >= difficulty) {
    // 成功破坏
    if (terrain.bash?.ter) {
      const newTerrain = data.get(terrain.bash.ter);
      map.setTerrain(pos, newTerrain);

      // 生成掉落物
      if (terrain.bash.items) {
        spawnItems(pos, terrain.bash.items);
      }

      showMessage(terrain.bash.successMsg || 'You smash it!');
    }
  } else {
    showMessage(terrain.bash?.failMsg || 'You fail to smash it');
  }
}
```

### 视野系统

```typescript
function calculateVisibility(from: Tripoint): Set<Tripoint> {
  const visible = new Set<Tripoint>();

  for (const pos of getAllPositions()) {
    if (hasLineOfSight(from, pos)) {
      const terrain = map.getTile(pos);
      if (terrain?.isTransparent()) {
        visible.add(pos);
      }
    }
  }

  return visible;
}
```

## 性能优化

### 1. 缓存查询结果

```typescript
class TerrainCache {
  private cache = new Map<number, Terrain>();

  get(id: number, data: TerrainData): Terrain | undefined {
    if (!this.cache.has(id)) {
      this.cache.set(id, data.get(id) as Terrain);
    }
    return this.cache.get(id);
  }
}
```

### 2. 批量加载

```typescript
// 一次性加载所有地形文件
const terrainFiles = [
  'terrain-floor.json',
  'terrain-wall.json',
  'terrain-nature.json',
  'terrain-door.json',
  'terrain-water.json',
];

const startTime = Date.now();
await loader.loadFromUrls(terrainFiles);
console.log(`Loaded in ${Date.now() - startTime}ms`);
```

### 3. 索引优化

```typescript
// 预先建立索引
const allWalls = data.getWalls();
const allDoors = data.getDoors();
const flatTerrains = data.getFlatTerrains();

// 在游戏中快速查找
const wall = allWalls.find(w => w.id === terrainId);
```

## 测试

```typescript
import { TerrainLoader } from '@cataclym-web/core';

describe('Game Mechanics', () => {
  it('should handle terrain interactions', async () => {
    const loader = new TerrainLoader();
    await loader.loadFromJson(testData);
    const data = loader.getData();

    // 测试移动
    const dirt = data.findByName('dirt');
    expect(dirt?.getMoveCost()).toBe(2);

    // 测试建造
    expect(dirt?.canBuildOn()).toBe(true);

    // 测试破坏
    const wall = data.findByName('wooden wall');
    expect(wall?.isBashable()).toBe(true);
    expect(wall?.getBashDifficulty()).toBeGreaterThan(0);
  });
});
```

## 调试

```typescript
// 获取统计信息
const stats = loader.getStats();
console.log(`Total terrains: ${stats.total}`);
console.log('By symbol:', stats.bySymbol);

// 导出所有地形
const all = data.getAll();
console.log(all.map(t => ({
  name: t.name,
  symbol: t.symbol,
  passable: t.isPassable(),
  transparent: t.isTransparent(),
})));
```

## 最佳实践

1. **使用加载器**：始终通过 `TerrainLoader` 加载数据
2. **验证数据**：加载后验证必要地形是否存在
3. **缓存查询**：频繁查询的地形应该缓存
4. **错误处理**：处理找不到地形的情况
5. **类型安全**：使用 TypeScript 类型定义

```typescript
// 好的做法
const terrain = data.get(terrainId);
if (!terrain) {
  throw new Error(`Terrain ${terrainId} not found`);
}

// 避免直接使用可选链
const symbol = terrain?.symbol; // 如果应该存在，不要这样做
```
