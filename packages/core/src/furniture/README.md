# 家具系统使用指南

## 概述

家具系统是 Cataclysm-DDA 的核心组件，提供了家具、容器、工作台和植物的完整实现。

## 基本使用

### 1. 加载家具数据

```typescript
import { FurnitureLoader } from '@cataclym-web/core';

const loader = new FurnitureLoader();

// 从 JSON 数组加载
const furnitures = [
  {
    type: 'furniture',
    id: 'f_chair',
    name: 'chair',
    description: 'A wooden chair.',
    symbol: '_',
    color: 'brown',
    move_cost_mod: 1,
    comfort: 1,
    required_str: 8,
    flags: ['TRANSPARENT', 'FLAMMABLE'],
  },
];

const data = await loader.loadFromJson(furnitures);
console.log(`Loaded ${data.size()} furnitures`);
```

### 2. 查询家具

```typescript
// 按名称查找
const chair = data.findByName('chair');

// 按符号查找
const allChairs = data.findBySymbol('_');

// 获取所有家具
const all = data.getAll();

// 过滤
const workbenches = data.getWorkbenches();
const sittable = data.getSittable();
const containers = data.getContainers();
```

## 家具属性

### 基础属性

```typescript
const furniture = new Furniture({
  id: 1,
  name: 'chair',
  description: 'A wooden chair.',
  symbol: '_',
  color: 'brown',
  moveCostMod: 1,        // 移动消耗修正
  coverage: 10,           // 覆盖率
  comfort: 1,             // 舒适度
  requiredStr: 8,         // 所需力量
  mass: 5000,             // 质量
  volume: 25000,          // 体积
  maxVolume: 0,           // 最大存储体积
});
```

### 家具标志

```typescript
import { FurnitureFlags, FurnitureFlag } from '@cataclym-web/core';

const flags = new FurnitureFlags([
  FurnitureFlag.TRANSPARENT,  // 透明
  FurnitureFlag.FLAMMABLE,    // 易燃
  FurnitureFlag.WORKBENCH,    // 工作台
  FurnitureFlag.CONTAINER,    // 容器
  FurnitureFlag.PLANT,        // 植物
  FurnitureFlag.MOUNTABLE,    // 可骑/可坐
  FurnitureFlag.OPERABLE,     // 可操作
  // ... 更多标志
]);
```

### 工作台信息

```typescript
const furniture = new Furniture({
  name: 'workbench',
  flags: new FurnitureFlags([FurnitureFlag.WORKBENCH]),
  workbench: {
    items: Map([
      ['all', 1],           // 全局技能倍率
      ['electronics', 2],   // 电子技能倍率
    ]),
    multipliers: Map([
      ['electronics', 2],   // 额外倍率
    ]),
    tile: true,             // 需要平坦表面
    requiresLight: true,    // 需要光照
    mass: 40000,
    volume: 300000,
  },
});
```

### 植物数据

```typescript
const furniture = new Furniture({
  name: 'sapling',
  flags: new FurnitureFlags([FurnitureFlag.PLANT]),
  plant: {
    transformAge: 100800,           // 成熟时间（回合）
    transformToFurniture: 'f_tree', // 成熟后变成的家具
    transformToItem: 'seed',        // 收获物品
    fruitCount: 5,                  // 果实数量
    fruitDiv: 1,                    // 果实除数
    fruitType: 'apple',             // 果实类型
    grow: 600,                      // 生长速度
    harvest: 10,                    // 收获时间
    harvestSeason: ['summer', 'autumn'], // 收获季节
  },
});
```

### 发射场数据

```typescript
const furniture = new Furniture({
  name: 'oven',
  emittedLight: 3,  // 发光强度
  emitters: Map([
    ['fire', {
      field: 'fd_fire',
      density: 1,
      chance: 20,              // 生成概率（每回合）
      ageIntensity: true,      // 强度随年龄增加
      minIntensity: 1,
      maxIntensity: 3,
    }],
  ]),
});
```

## 查询方法

### 基础查询

```typescript
const chair = data.findByName('chair');

// 透明度
if (chair.isTransparent()) {
  console.log('Light can pass through');
}

// 可通行性
if (chair.isPassable()) {
  console.log('Can walk here');
}

// 可坐
if (chair.isSittable()) {
  console.log('Can sit on this');
  const comfort = chair.getComfort();
}

// 是否发光
if (chair.emitsLight()) {
  const light = chair.getLight();
  console.log(`Light level: ${light}`);
}
```

### 工作台查询

```typescript
const workbench = data.findByName('workbench');

// 检查是否工作台
if (workbench.isWorkbench()) {
  // 检查支持的技能
  if (workbench.supportsSkill('electronics')) {
    const multiplier = workbench.getSkillMultiplier('electronics');
    console.log(`Electronics skill multiplier: ${multiplier}x`);
  }

  // 获取工作台信息
  const info = workbench.getWorkbenchInfo();
  console.log(`Requires tile: ${info?.tile}`);
  console.log(`Requires light: ${info?.requiresLight}`);
}
```

### 植物查询

```typescript
const sapling = data.findByName('sapling');

if (sapling.isPlant()) {
  // 检查成熟度
  const age = getPlantAge(sapling); // 游戏逻辑
  if (sapling.isPlantMature(age)) {
    console.log('Ready to harvest!');
    const plantData = sapling.getPlantData();
    console.log(`Harvest item: ${plantData?.transformToItem}`);
  }
}
```

## 游戏机制集成

### 舒适度系统

```typescript
function calculateRestQuality(pos: Tripoint): number {
  const furniture = map.getFurniture(pos);
  if (!furniture?.isSittable()) {
    return 0;
  }

  const comfort = furniture.getComfort();
  const bedding = furniture.floorBeddingWarmth;

  // 计算休息质量
  let quality = comfort;
  if (bedding < 0) {
    quality += bedding / 1000; // 负值降低质量
  }

  return Math.max(0, quality);
}
```

### 制作系统

```typescript
function canCraft(recipe: Recipe, pos: Tripoint): boolean {
  const furniture = map.getFurniture(pos);

  if (!furniture?.isWorkbench()) {
    return false;
  }

  // 检查工作台是否支持所需技能
  return furniture.supportsSkill(recipe.skill);
}

function getCraftingSpeed(recipe: Recipe, pos: Tripoint): number {
  const furniture = map.getFurniture(pos);
  const multiplier = furniture?.getSkillMultiplier(recipe.skill) ?? 1;

  return recipe.baseTime * multiplier;
}
```

### 存储系统

```typescript
function canStoreAt(pos: Tripoint, item: Item): boolean {
  const furniture = map.getFurniture(pos);

  if (!furniture?.isContainer()) {
    return false;
  }

  // 检查容量
  const currentVolume = map.getStoredVolume(pos);
  const maxVolume = furniture.maxVolume;

  return (currentVolume + item.volume) <= maxVolume;
}

function storeItem(pos: Tripoint, item: Item): void {
  const furniture = map.getFurniture(pos);

  if (!furniture?.isContainer()) {
    throw new Error('Not a container');
  }

  map.addItem(pos, item);
}
```

### 移动系统

```typescript
function canMoveFurniture(actor: Actor, pos: Tripoint): boolean {
  const furniture = map.getFurniture(pos);

  if (!furniture) {
    return true; // 没有家具，可以移动
  }

  // 检查是否需要搬运
  if (furniture.requiresMoving()) {
    const requiredStr = furniture.getRequiredStrength();
    const actorStr = actor.getStrength();

    return actorStr >= requiredStr;
  }

  return true;
}

function moveFurniture(actor: Actor, from: Tripoint, to: Tripoint): void {
  const furniture = map.getFurniture(from);

  if (!furniture) {
    return;
  }

  const moveCost = 100 + furniture.getMass() / 1000; // 移动时间
  actor.modMoves(-moveCost);

  map.removeFurniture(from);
  map.addFurniture(to, furniture);
}
```

### 破坏系统

```typescript
function bashFurniture(actor: Actor, pos: Tripoint): void {
  const furniture = map.getFurniture(pos);

  if (!furniture?.isBashable()) {
    showMessage('You cannot bash this');
    return;
  }

  const difficulty = furniture.getBashDifficulty();
  const strength = actor.getStrength();

  if (strength >= difficulty) {
    // 成功破坏
    if (furniture.bash?.items) {
      spawnItems(pos, furniture.bash.items);
    }

    if (furniture.bash?.furniture) {
      // 变成其他家具
      map.removeFurniture(pos);
      map.addFurniture(pos, data.get(furniture.bash.furniture[0]));
    } else {
      // 完全破坏
      map.removeFurniture(pos);
    }

    showMessage(furniture.bash?.successMsg || 'You smash it!');
  } else {
    showMessage(furniture.bash?.failMsg || 'You fail to smash it');
  }
}
```

### 拆解系统

```typescript
function deconstructFurniture(actor: Actor, pos: Tripoint): void {
  const furniture = map.getFurniture(pos);

  if (!furniture?.isDeconstructable()) {
    showMessage('Nothing to deconstruct here');
    return;
  }

  const deconstruct = furniture.deconstruct;
  if (!deconstruct) return;

  // 计算所需时间
  const time = deconstruct.time * actor.getCraftingSpeed();

  actor.startActivity(time, {
    type: 'deconstruct',
    position: pos,
    onComplete: () => {
      // 生成材料
      if (deconstruct.items) {
        spawnItems(pos, deconstruct.items);
      }

      // 移除家具
      map.removeFurniture(pos);

      // 可能生成地形
      if (deconstruct.ter) {
        map.setTerrain(pos, data.getTerrain(deconstruct.ter));
      }
    },
  });
}
```

### 光照系统

```typescript
function calculateLightLevel(pos: Tripoint): number {
  const furniture = map.getFurniture(pos);
  let lightLevel = 0;

  // 家具发光
  if (furniture?.emitsLight()) {
    lightLevel += furniture.getLight();
  }

  // 检查场发射
  if (furniture?.emitsField('fd_fire')) {
    lightLevel += 5; // 火焰发光
  }

  // 可操作状态检查
  if (furniture?.isOperable()) {
    if (isPowered(furniture)) {
      lightLevel += furniture.emittedLight;
    }
  }

  return lightLevel;
}

function isPowered(furniture: Furniture): boolean {
  // 检查是否连接电源
  return map.hasPowerAt(furniture.position);
}
```

## 植物系统

```typescript
function updatePlant(pos: Tripoint): void {
  const furniture = map.getFurniture(pos);

  if (!furniture?.isPlant()) {
    return;
  }

  const age = getPlantAge(pos);
  const plantData = furniture.getPlantData();

  if (!plantData) return;

  // 增加年龄
  setPlantAge(pos, age + 1);

  // 检查季节
  const currentSeason = getCurrentSeason();
  if (plantData.harvestSeason && !plantData.harvestSeason.includes(currentSeason)) {
    return; // 不在收获季节
  }

  // 检查是否成熟
  if (furniture.isPlantMature(age)) {
    // 变换为成熟植物
    const matureId = plantData.transformToFurniture;
    const matureFurniture = data.get(matureId);

    if (matureFurniture) {
      map.setFurniture(pos, matureFurniture);
    }
  }
}

function harvestPlant(actor: Actor, pos: Tripoint): void {
  const furniture = map.getFurniture(pos);

  if (!furniture?.isPlant()) {
    return;
  }

  const plantData = furniture.getPlantData();

  if (!plantData || !furniture.isPlantMature(getPlantAge(pos))) {
    showMessage('This plant is not ready to harvest');
    return;
  }

  // 收获物品
  const count = Math.floor(Math.random() * plantData.fruitCount) + 1;
  const items = createItems(plantData.fruitType, count);

  actor.addItems(items);

  // 可能掉落副产品
  if (plantData.byproducts) {
    const byproducts = spawnItems(pos, plantData.byproducts);
  }

  // 移除植物
  map.removeFurniture(pos);

  showMessage(`You harvest ${items.map(i => i.type).join(', ')}`);
}
```

## 性能优化

```typescript
// 预过滤家具
const sittable = data.getSittable();
const workbenches = data.getWorkbenches();

// 缓存常用查询
class FurnitureCache {
  private byName = new Map<string, Furniture>();

  get(name: string, data: FurnitureData): Furniture | undefined {
    if (!this.byName.has(name)) {
      this.byName.set(name, data.findByName(name) as Furniture);
    }
    return this.byName.get(name);
  }
}
```

## 最佳实践

1. **始终使用类型安全的查询**
2. **验证家具是否存在再使用**
3. **利用标志系统进行快速过滤**
4. **缓存常用家具引用**
5. **使用工作台倍率系统平衡制作**

```typescript
// 好的做法
const furniture = data.findByName('workbench');
if (!furniture) {
  throw new Error('Workbench not found');
}

if (furniture.isWorkbench()) {
  const multiplier = furniture.getSkillMultiplier(skill);
  // 使用倍率...
}

// 避免
const wb = data.findByName('workbench');
const mult = wb?.getSkillMultiplier(skill); // 可能为 undefined
```
